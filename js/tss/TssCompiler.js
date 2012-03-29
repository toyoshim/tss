/**
 * T'SoundSystem for JavaScript
 */

/**
 * TssCompiler prototype
 *
 * This prototype implements TSS compiler which compile TSS source file and
 * generate TSD data file. TsdPlayer prototype can play the TSD data file.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function TssCompiler () {
    this.logMmlCompile = false;
    this.source = null;
    this.directives = [];
    this.channels = [];
    this.validWaves = 0,
    this.waves = [];
    this.tags = {
        title: null,
        channels: 0,
        fineness: TssCompiler._DEFAULT_FINENESS
    };
    this.modes = {
        hardware: TssCompiler.HARDWARE_MODE_NORMAL,
        octave: TssCompiler.OCTAVE_MODE_NORMAL,
        volumeRelative: TssCompiler.VOLUME_RELATIVE_MODE_NORMAL
    };
    this.channelData = [];
}

TssCompiler.VERSION = 0.93;
TssCompiler.HARDWARE_MODE_NORMAL = 0;
TssCompiler.HARDWARE_MODE_FAMICOM = 1;
TssCompiler.HARDWARE_MODE_GAMEBOY = 2;
TssCompiler.VOLUME_RANGE_MODE_NORMAL = 0;
TssCompiler.VOLUME_RANGE_MODE_UPPER = 1;
TssCompiler.VOLUME_RELATIVE_MODE_NORMAL = 0;
TssCompiler.VOLUME_RELATIVE_MODE_REVERSE = 1;
TssCompiler.OCTAVE_MODE_NORMAL = 0;
TssCompiler.OCTAVE_MODE_REVERSE = 1;
TssCompiler._DEFAULT_FINENESS = 368;
TssCompiler._ALPHABET_COUNT = 'z'.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
TssCompiler._CODE_ESCAPE = '\\'.charCodeAt(0);
TssCompiler._CODE_SHARP = '#'.charCodeAt(0);
TssCompiler._CODE_GT = '>'.charCodeAt(0);
TssCompiler._TONE_TABLE = {
    'c': 0,
    'd': 2,
    'e': 4,
    'f': 5,
    'g': 7,
    'a': 9,
    'b': 11
};
TssCompiler._TRIANGLE_TABLE = [
       0,   16,   32,   48,   64,   80,   96,  112,
     127,  112 ,  96,   80,   64,   48,   32,   16,
       0,  -16,  -32,  -48,  -64,  -80,  -96, -112,
    -128, -112,  -96,  -80,  -64,  -48,  -32,  -16
];

/**
 * CompileError prototype
 *
 * This prototype contains compile error information.
 * @param line line object
 *      line: line number
 *      data: source of TString
 * @param offset offset in line
 * @param message error message
 */
TssCompiler.CompileError = function (line, offset, message) {
    this.line = line;
    this.offset = offset;
    this.message = message;
};

/**
 * Create string object shows error information.
 */
TssCompiler.CompileError.prototype.toString = function () {
    var n = 0;
    var c;
    var i;
    var data = this.line.data;
    for (i = 0; i <= this.offset; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        n++;
    }
    var hintArray = new Uint8Array(n--);
    for (i = 0; i < n; i++)
        hintArray[i] = 0x20;
    hintArray[i] = '^'.charCodeAt(0);
    var hint = TString.createFromUint8Array(hintArray).toString();
    return "TSS: { line: " + this.line.line + ", offset: " + this.offset +
            " } " + this.message + '\n' + data.toString() + '\n' + hint;
};

/**
 * Convert signed number to unsigned 8-bit integer.
 * @param n signed number
 * @return unsigned 8-bit integer
 */
TssCompiler._toUint8 = function (n) {
    if ((n < -128) || (127 < n))
        throw new RangeError("unsupported range");
    if (n < 0)
        n = 0x100 + n;
    return n & 0xff;
};

/**
 * Get a parameter encslosed by a brace like <foo bar>.
 * @param line source data of line object
 * @param offset start offset
 * @return result object
 *      begin: start offset
 *      end: end offset
 *      parameter: parameter of TString oject if success
 */
TssCompiler._getBracedParameter = function (line, offset) {
    var data = line.data;
    var length = data.byteLength();
    var begin = offset + data.countSpaces(offset);
    if ((begin >= length) || ('<' != data.charAt(begin)))
        return { begin: begin, end: begin, parameter: undefined };
    begin++;
    var n = 0;
    var c = 0;
    for (var i = begin; i < length; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        if (TssCompiler._CODE_GT == c)
            break;
        n++;
    }
    var end = begin + n - 1;
    var param = TString.createFromUint8Array(new Uint8Array(n));
    n = 0;
    for (i = begin; i <= end; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        param.setAt(n++, c);
    }
    return {
        begin: begin - 1,
        end: end + 1,
        parameter: param
    }
};

/**
 * Get a number parameter.
 * @param line source data of line object
 * @param offset start offset
 * @throw TssCompiler.CompileError
 * @return result object
 *      begin: start offset
 *      end: end offset
 *      parameter: parameter of number
 */
TssCompiler._getNumberParameter = function (line, offset) {
    var data = line.data;
    var begin = offset + data.countSpaces(offset);
    var length = data.byteLength();
    if (begin >= length)
        return { begin: begin, end: begin, parameter: undefined };
    var sign = 1;
    if ('-' == data.charAt(begin)) {
        begin++;
        begin += data.countSpaces(begin);
        sign = -1;
    }
    var n = data.numberAt(begin);
    if (n < 0)
        return { begin: begin, end: begin, parameter: undefined };
    var c = 0;
    for (var i = begin + 1; i < length; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        var result = data.numberAt(i);
        if (result < 0)
            return { begin: begin, end: i - 1, parameter: sign * n };
        n = n * 10 + result;
    }
    return { begin: begin, end: i - 1, parameter: sign * n};
};

/**
 * Get a string parameter.
 * @param line source data of line object
 * @param offset start offset
 * @return result object
 *      begin: start offset
 *      end: end offset
 *      parameter: parameter of TString oject if success
 */
TssCompiler._getStringParameter = function (line, offset) {
    var data = line.data;
    var begin = offset + data.countSpaces(offset);
    var length = data.byteLength();
    var n = 0;
    var c = 0;
    for (var i = begin; i < length; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        n++;
    }
    var end = begin + n - 1;
    var param = TString.createFromUint8Array(new Uint8Array(n));
    n = 0;
    for (i = begin; i <= end; i++) {
        c = data.at(i);
        if ((0 == c) || (TssCompiler._CODE_ESCAPE == c))
            continue;
        param.setAt(n++, c);
    }
    return {
        begin: begin,
        end: end,
        parameter: param
    }
};

/**
 * Get a character.
 * @param line source data of line object
 * @param offset offset start offset
 * @param character charactet string to find
 * @return -1 if the next non-space character is not comma, otherwise offset
 */
TssCompiler._getCharacter = function (line, offset, character) {
    var data = line.data;
    var position = offset + data.countSpaces(offset);
    if (position >= data.byteLength())
        return -1;
    if (character != data.charAt(position))
        return -1;
    return position;
};

/**
 * Check if the rest part of specified line has no data.
 * @param line line object to be checked
 * @param offset start offset
 */
TssCompiler.prototype._checkEnd = function (line, offset) {
    var data = line.data;
    offset += data.countSpaces(offset);
    return offset == data.byteLength();
};

/**
 * Check line.directive is channel directive (e.g. "#A", "#zx") then rewrite
 * line.directive with channel number.
 * @param line line object to check
 */
TssCompiler._checkChannelDirective = function (line) {
    if ((2 < line.directive.length) || (0 == line.directive.length))
        return;
    var n = TString.createFromString(line.directive);
    var channel = 0;
    var offset = 0;
    var index;
    if (2 == n.byteLength()) {
        index = n.alphabetIndex(offset++);
        if (index < 0)
            return;
        channel = index * TssCompiler._ALPHABET_COUNT;
    }
    index = n.alphabetIndex(offset);
    if (index < 0)
        return;
    channel += index;
    line.directive = channel;
};

/**
 * Check line object, parse directive in line.buffer to set line.directive,
 * and retrieve the directive (e.g. "#TITLE") from buffer.
 * @param line line object
 */
TssCompiler._checkDirective = function (line) {
    var data = line.data;
    var length = data.byteLength();
    var c = 0;
    for (var i = 0; i < length; i++) {
        c = data.at(i);
        if (0 == c)
            continue;
        if (TssCompiler._CODE_SHARP == c) {
            data.setAt(i++, 0);
            break;
        }
        line.directive = null;
        return;
    }
    for (var start = i; i < length; i++)
        if (0x20 == data.at(i))
            break;
    // TODO: Currently primitives doesn't allow comments inside.
    // e.g. "#TI{ comments }TLE" doesn't work.
    line.directive = data.slice(start, i).toString();
    for (var offset = start; offset < i; offset++)
        data.setAt(offset, 0);
    TssCompiler._checkChannelDirective(line);
};

TssCompiler.prototype._setWave = function (id, wave) {
    Log.getLog().info("TSC: set wave " + id);
    if (!this.waves[id])
        this.validWaves++;
    this.waves[id] = wave;
};

/**
 * Parse a line with count information, generate line object.
 * @param context parser context containing line and comment information
 * @param offset line start offset
 * @param count line size in bytes
 * @return line object
 *      line: original source line
 *      offset: original source line start offset
 *      count: original source line size in bytes
 *      data: comment stripped TString object
 *      empty: true if this line contains no data, otherwise false
 *      directive: directive (e.g. "TITLE" in string, or "9" in number)
 *      error: error object if parse fails, otherwise null
 *          offset: offset where parse fails
 *          message: reason
 */
TssCompiler.prototype._preprocessLine = function (context, offset, count) {
    var result = {
        line: context.line,
        offset: offset,
        count: count,
        data: null,
        empty: true,
        directive: null,
        continuation: false
    };
    var line = this.source.slice(offset, offset + count);
    result.data = line;
    for (var i = 0; i < count; i++) {
        var c = line.charAt(i);
        if (context.commentNest > 0) {
            // In comment.
            if ('\\' == c)
                line.setCharAt(i++, '\\');
            else if ('{' == c)
                context.commentNest++;
            else if ('}' == c)
                context.commentNest--;
            line.setAt(i, 0);
        } else {
            if ('\\' == c) {
                line.setAt(i++, 0);
                result.empty = false;
            } else if ('{' == c) {
                context.commentNest++;
                line.setAt(i, 0);
            } else if ('}' == c) {
                context.commentNest--;
                line.setAt(i, 0);
                if (context.commentNest < 0)
                    throw new TssCompiler.CompileError(result, i,
                            "'}' appears without '{'");
            } else {
                if ('\t' == c)
                    line.setAt(i, 0x20);
                result.empty = false;
            }
        }
    }
    if (!result.empty)
        TssCompiler._checkDirective(result);
    return result;
};

/**
 * Parse TSS source lines and classify into directive or channels.
 * @raise TssCompiler.CompileError
 */
TssCompiler.prototype._parseLines = function () {
    var context = {
        line: 1,
        commentNest: 0
    };
    var channel = null;
    var length = this.source.byteLength();
    for (var offset = 0; offset < length; context.line++) {
        var count = this.source.countLine(offset);
        var line = this._preprocessLine(context, offset, count);
        if (!line.empty) {
            if (null == line.directive) {
                if (null == channel)
                    throw new TssCompiler.CompileError(line, 0,
                            "invalid line without any directive");
                line.directive = channel;
                line.continuation = true;
            } else {
                channel = line.directive;
            }
            if (typeof line.directive == "number") {
                if (undefined == this.channels[line.directive])
                    this.channels[line.directive] = [];
                this.channels[line.directive].push(line);
            } else {
                if ("END" == line.directive)
                    break;
                this.directives.push(line);
            }
        }
        offset += count;
        offset += this.source.countLineDelimiter(offset);
    }
    Log.getLog().info("TSS: found " + this.directives.length +
            " directive(s)");
    Log.getLog().info("TSS: found " + this.channels.length + " channel(s)");
    for (var i = 0; i < this.channels.length; i++) {
        var n = 0;
        if (undefined != this.channels[i])
            n = this.channels[i].length;
        Log.getLog().info("TSS: channel " + (i + 1) + " has " + n +
                " line(s)");
    }
};

/**
 * Parse directives.
 * @raose TssCompiler.CompileError
 */
TssCompiler.prototype._parseDirectives = function () {
    // TODO: Check mandatory directives.
    for (var i = 0; i < this.directives.length; i++) {
        var directive = this.directives[i].directive;
        var offset = 0;
        var result;
        if ("CHANNEL" == directive) {
            result = TssCompiler._getNumberParameter(this.directives[i], 0);
            if (typeof result.parameter == "undefined")
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "number not found in #CHANNEL");
            this.tags.channels = result.parameter;
            offset = result.end + 1;
            Log.getLog().info("TSS: CHANNEL> " + this.tags.channels);
        } else if ("FINENESS" == directive) {
            result = TssCompiler._getNumberParameter(this.directives[i], 0);
            if (typeof result.parameter == "undefined")
                throw new TssCompiler.CompileError(this.directives[i],
                    result.begin, "number not found in #FINENESS");
            this.tags.fineness = result.parameter;
            offset = result.end + 1;
            Log.getLog().info("TSS: FINENESS> " + this.tags.fineness);
        } else if ("OCTAVE" == directive) {
            result = TssCompiler._getStringParameter(this.directives[i], 0);
            if (!result.parameter)
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "syntax error in #PRAGMA");
            var octave = result.parameter.toString();
            if (octave == "NORMAL")
                this.tags.octaveMode = TssCompiler.OCTAVE_MODE_NORMAL;
            else if (octave == "REVERSE")
                this.tags.octaveMode = TssCompiler.OCTAVE_MODE_REVERSE;
            else
                throw new TssCompiler.CompileError(this.directive[i],
                        result.begin, "invalid argument in #OCTAVE");
            offset = result.end + 1;
        } else if ("PRAGMA" == directive) {
            result = TssCompiler._getStringParameter(this.directives[i], 0);
            if (!result.parameter)
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "syntax error in #PRAGMA");
            var pragma = result.parameter.toString();
            if (pragma == "FAMICOM") {
                this.modes.hardware = TssCompiler.HARDWARE_MODE_FAMICOM;
                this._setWave(0, TssCompiler._TRIANGLE_TABLE);
            } else if (pragma == "GAMEBOY") {
                this.modes.hardware = TssCompiler.HARDWARE_MODE_GAMEBOY;
            } else {
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "unknown pragma parameter " + pragma);
            }
            offset = result.end + 1;
            Log.getLog().info("TSS: PRAGMA> " + pragma);
        } else if ("TABLE" == directive) {
            // TODO
            Log.getLog().warn("TSS: #TABLE is not implemented");
            offset = this.directives[i].data.byteLength();
        } else if ("TITLE" == directive) {
            result = TssCompiler._getBracedParameter(this.directives[i], 0);
            if (!result.parameter)
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "syntax error in #TITLE");
            this.tags.title = result.parameter;
            offset = result.end + 1;
            Log.getLog().info("TSS: TITLE> " + this.tags.title.toString());
        } else if ("VOLUME" == directive) {
            result = TssCompiler._getStringParameter(this.directives[i], 0);
            if (!result.parameter)
                throw new TssCompiler.CompileError(this.directives[i],
                    result.begin, "syntax error in #VOLUME");
            var volume = result.parameter.toString();
            if (volume == "NORMAL")
                this.tags.octaveMode = TssCompiler.VOLUME_RELATIVE_MODE_NORMAL;
            else if (volume == "REVERSE")
                this.tags.octaveMode =
                        TssCompiler.VOLUME_RELATIVE_MODE_REVERSE;
            else
                throw new TssCompiler.CompileError(this.directive[i],
                        result.begin, "invalid argument in #VOLUME");
            offset = result.end + 1;
        } else if ("WAV" == directive) {
            // TODO
            Log.getLog().warn("TSS: #WAV is not implemented");
            offset = this.directives[i].data.byteLength();
        } else {
            throw new TssCompiler.CompileError(this.directives[i], 0,
                    "unknown directive: " + directive);
        }
        if (!this._checkEnd(this.directives[i], offset))
            throw new TssCompiler.CompileError(this.directives[i], offset,
                    "syntax error after #" + directive);
    }
};

/**
 * Parse channel data.
 */
TssCompiler.prototype._parseChannels = function () {
    var maxGate = 16;  // TODO: #GATE
    // Syntax information except for note premitives (cdefgabr).
    var notImplemented = function (self, work, command, args) {
        throw new TssCompiler.CompileError(work.lineObject, work.offset,
                "command '" + command + "' not implemented");
    };
    var syntax = {
        '$': {  // loop
            args: [],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_ENDLESS_LOOP_POINT);
            }
        },
        '%': {  // module
            args: [ { def: 0, min: 0, max: 255 } ],
            callback: function (self, work, command, args) {
                if (TssCompiler.HARDWARE_MODE_FAMICOM == work.mode)
                    throw new TssCompiler.CompileError(work.lineObject,
                            work.offset,
                            "'%' is not supported in famicom mode");
                work.data.push(TsdPlayer.CMD_MODULE_CHANGE);
                work.data.push(args[0]);
            }
        },
        '(': {  // volume relative up (down)
            args: [],  // TODO
            callback: notImplemented
        },
        ')': {  // volume relative down (up)
            args: [],  // TODO
            callback: notImplemented
        },
        '/': {  // local loop break
            sequence: ":",
            args: [],
            callback: function (self, work, command, args) {
                if (work.localLoopId == 0)
                    throw new TssCompiler.CompileError(work.lineObject,
                        work.offset, "'/' found without '/:'");
                work.data.push(TsdPlayer.CMD_LOCAL_LOOP_BREAK);
                work.data.push(work.localLoopId - 1);
            }
        },
        '/:': {  // local loop begin
            args: [ { def: 2, min: 2, max: 255 } ],
            callback: function (self, work, command, args) {
                if (work.localLoopId > 15)
                    throw new TssCompiler.CompileError(work.lineObject,
                            work.offset, "local loop is too deep (>16)");
                work.data.push(TsdPlayer.CMD_LOCAL_LOOP_START);
                work.data.push(work.localLoopId++);
                work.data.push(args[0]);
            }
        },
        ':': {  // n/a
            sequence: "/"
        },
        ':/': {  // local loop end
            args: [],
            callback: function (self, work, command, args) {
                if (work.localLoopId == 0)
                    throw new TssCompiler.CompileError(work.lineObject,
                        work.offset, "':/' found without '/:'");
                work.data.push(TsdPlayer.CMD_LOCAL_LOOP_END);
                work.data.push(--work.localLoopId);
            }
        },
        '<': {  // octave up (down)
            args: [],
            callback: function (self, work, command, args) {
                if (TssCompiler.OCTAVE_MODE_NORMAL == work.octaveMode)
                    work.currentOctave++;
                else
                    work.currentOctave--;
            }
        },
        '>': {  // octave down (up)
            args: [],
            callback: function (self, work, command, args) {
                if (TssCompiler.OCTAVE_MODE_NORMAL == work.octaveMode)
                    work.currentOctave--;
                else
                    work.currentOctave++;
            }
        },
        '@': {  // voice
            sequence: "iov",
            args: [ { def: 0, min: 0, max: 255 } ],
            callback: function (self, work, command, args) {
                if (TssCompiler.HARDWARE_MODE_FAMICOM == work.mode) {
                    if (work.lineObject.directive == 2)
                        throw new TssCompiler.CompileError(work.lineObject,
                                work.offset,
                                "'@' is not supported in famicom mode " +
                                        "channel 3");
                    else if ((2 != args[0]) && (4 != args[0]) &&
                            (6 != args[0]) && (7 != args[0]))
                        throw new TssCompiler.CompileError(work.lineObject,
                                work.offset,
                                "voice id " + args[0] +
                                        " is invalid in famicom mode");
                }
                work.data.push(TsdPlayer.CMD_VOICE_CHANGE);
                work.data.push(args[0]);
            }
        },
        '@i': {  // input pipe
            args: [
                { def: 0, min: 0, max: 8 },
                { def: 0, min: 0, max: 3 }
            ],
            callback: function (self, work, command, args) {
                if (1 == args.length) {
                    work.data.push(TsdPlayer.CMD_VOLUME_MONO);
                    work.data.push(args[0]);
                } else {
                    work.data.push(TsdPlayer.CMD_VOLUME_LEFT);
                    work.data.push(args[0]);
                    work.data.push(TsdPlayer.CMD_VOLUME_RIGHT);
                    work.data.push(args[1]);
                }
            }
        },
        '@o': {  // output pipe
            args: [
                { def: 0, min: 0, max: 2 },
                { def: 0, min: 0, max: 3 }
            ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_FM_OUT);
                work.data.push((args[0] << 4) | args[1]);
            }
        },
        '@v': {  // fine volume
            args: [
                { def: 10, min: 0, max: 255 },
                { def: 0, min: 0, max: 255 }
            ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_FM_OUT);
                work.data.push((args[0] << 4) | args[1]);
            }
        },
        ']': {  // loop end
            args: [],
            callback: function (self, work, command, args) {
                if (0 == work.loop.count)
                    throw new TssCompiler.CompileError(work.lineObject,
                            work.offset, "']' found without '['");
                if (--work.loop.count == 0)
                    return;
                work.loop.end.line = work.line;
                work.loop.end.offset = work.offset;
                work.line = work.loop.line;
                work.offset = work.loop.offset;
                work.lineObject =
                        self.channels[work.lineObject.directive][work.line];
            }
        },
        '[': {  // loop start
            args: [ { def: 2, min: 2, max: 65535 } ],
            callback: function (self, work, command, args) {
                work.loop.count = args[0];
                work.loop.line = work.line;
                work.loop.offset = work.offset;
            }
        },
        '_': {  // relative volume up
            args: [],  // TODO
            callback: notImplemented
        },
        '|': {  // loop break
            args: [],
            callback: function (self, work, command, args) {
                if (work.loop.count > 1)
                    return;
                work.line = work.loop.end.line;
                work.offset = work.loop.end.offset;
                work.lineObject =
                        self.channels[work.lineObject.directive][work.line];
            }
        },
        '~': {  // relative volume down
            args: [],  // TODO
            callback: notImplemented
        },
        k: {  // detune
            args: [ { def: 0, min: -128, max: 127 } ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_DETUNE);
                work.data.push(TssCompiler._toUint8(args[0]));
            }
        },
        l: {  // default note length
            args: [ { def: 4, min: 1, max: 1024 } ],
            callback: function (self, work, command, args) {
                work.defaultLength = args[0];
                work.defaultDot = 0;
                for (;;) {
                    var position = TssCompiler._getCharacter(
                        work.lineObject, work.offset, '.');
                    if (position < 0)
                        break;
                    work.offset = position + 1;
                    work.defaultDot++;
                }
            }
        },
        m: {  // multiple
            sequence: "p",
            args: [],  // TODO
            callback: notImplemented
        },
        mp: {  // pitch modulation
            args: [
                { def: undefined, min: 0, max: 65535 },  // delay
                { def: undefined, min: 0, max: 255 },  // depth
                { def: undefined, min: 0, max: 255 },  // width
                { def: undefined, min: -128, max: 127 },  // height
                { def: undefined, min: 0, max: 255 }  // delta
            ],
            callback: function (self, work, command, args) {
                if (args[0]) {
                    work.data.push(TsdPlayer.CMD_PITCH_MODULATION_DELAY);
                    work.data.push(args[0] >> 8);
                    work.data.push(args[0]& 0xff);
                }
                if (args.length < 2)
                    return;
                if (args[1]) {
                    work.data.push(TsdPlayer.CMD_PITCH_MODULATION_DEPTH);
                    work.data.push(args[1]);
                }
                if (args.length < 3)
                    return;
                if (args[2]) {
                    work.data.push(TsdPlayer.CMD_PITCH_MODULATION_WIDTH);
                    work.data.push(args[2]);
                }
                if (args.length < 4)
                    return;
                if (args[3]) {
                    work.data.push(TsdPlayer.CMD_PITCH_MODULATION_HEIGHT);
                    work.data.push(TssCompiler._toUint8(args[3]));
                }
                if (args.length < 5)
                    return;
                if (args[4]) {
                    work.data.push(TsdPlayer.CMD_PITCH_MODULATION_DELTA);
                    work.data.push(args[4]);
                }
            }
        },
        n: {  // n/a
            sequence: "ast"
        },
        na: {  // amp envelope
            args: [
                { def: 0, min: 0, max: 255 },
                { def: 0, min: 0, max: 255 }
            ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_AMP_EMVELOPE);
                work.data.push(args[0]);
                work.data.push(args[1]);
            }
        },
        ns: {  // note emvelope
            args: [],  // TODO
            callback: notImplemented
        },
        nt: {  // note shift
            args: [],  // TODO
            callback: notImplemented
        },
        o: {  // octave
            args: [ { def: 4, min: 1, max: 8 } ],
            callback: function (self, work, command, args) {
                work.currentOctave = args[0];
            }
        },
        p: {  // panpot
            sequence: "h",
            args: [ { def: 0, min: 0, max: 3 } ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_PANPOT);
                work.data.push(args[0]);
            }
        },
        ph: {  // key-on phase
            args: [],  // TODO
            callback: notImplemented
        },
        q: {  // gate time
            args: [ { def: maxGate, min: 0, max: maxGate } ],
            callback: function (self, work, command, args) {
                work.currentGate = args[0];
            }
        },
        r: {  // note on/off
            args:[],
            callback: function (self, work, command, args) {
                if ('r' != command) {
                    if ((work.currentOctave < 1) || (8 < work.currentOctave))
                        throw new TssCompiler.CompileError(work.lineObject,
                                work.offset, "current octave is out of range");
                }
                work.offset +=
                    work.lineObject.data.countSpaces(work.offset);
                var fine = 0;
                if (work.offset < work.lineObject.data.byteLength()) {
                    var c = work.lineObject.data.charAt(work.offset);
                    if (('-' == c) || ('+' == c) || ('#' == c)) {
                        work.offset++;
                        if ('-' == c)
                            fine = -1;
                        else
                            fine = 1;
                    }
                }
                var totalCount = 0;
                for (;;) {
                    var result = TssCompiler._getNumberParameter(
                            work.lineObject, work.offset);
                    var length = 0;
                    var dot = 0;
                    if (typeof result.parameter == "undefined") {
                        length = work.defaultLength;
                        dot = work.defaultDot;
                    } else {
                        length = result.parameter;
                        work.offset = result.end + 1;
                    }
                    for (;;) {
                        var position = TssCompiler._getCharacter(
                                work.lineObject, work.offset, '.');
                        if (position < 0)
                            break;
                        work.offset = position + 1;
                        dot++;
                    }
                    if (0 != (work.clock % length))
                        Log.getLog().warn("TSS: time resolution is not " +
                                "enough for length " + length);
                    var count = ~~(work.clock / length);
                    totalCount += count;
                    while (dot-- > 0) {
                        if (0 != (count % 2))
                            throw new TssCompiler.CompileError(work.lineObject,
                                    work.offset, "too many '.' against time" +
                                            " resolution");
                        count /= 2;
                        totalCount += count;
                    }
                    position = TssCompiler._getCharacter(work.lineObject,
                        work.offset, '^');
                    if (position < 0)
                        break;
                    work.offset = position + 1;
                }
                // TODO: Handle '&'.
                var restCount = 0;
                work.count += totalCount;
                if ('r' == command) {
                    work.data.push(TsdPlayer.CMD_NOTE_OFF);
                } else {
                    // TODO: Handle note shift.
                    fine += work.currentOctave * 12 +
                            TssCompiler._TONE_TABLE[command];
                    if (fine < 0) {
                        Log.getLog().warn("TSS: too low tone (clamped)");
                        fine = 0;
                    } else if (fine > 127) {
                        Log.getLog().warn("TSS: too high tone (clamped)");
                        fine = 127;
                    }
                    work.data.push(fine);
                    // TODO: Handle '&'.
                    restCount = totalCount;
                    totalCount = ~~(totalCount * work.currentGate /
                            work.maxGate);
                    restCount -= totalCount;
                }
                if (self.logMmlCompile)
                    Log.getLog().info(totalCount + "," + restCount);
                if (totalCount < 255) {
                    work.data.push(totalCount);
                } else if (totalCount < 65535) {
                    work.data.push(255);
                    work.data.push(totalCount >> 8);
                    work.data.push(totalCount & 0xff);
                } else {
                    throw new TssCompiler.CompileError(work.lineObject,
                            work.offset, "note length is too long");
                }
                if (restCount > 0) {
                    work.data.push(TsdPlayer.CMD_NOTE_OFF)
                    if (restCount < 255) {
                        work.data.push(restCount);
                    } else if (restCount < 65535) {
                        work.data.push(255);
                        work.data.push(restCount >> 8);
                        work.data.push(restCount & 0xff);
                    } else {
                        throw new TssCompiler.CompileError(work.lineObject,
                            work.offset, "rest length is too long");
                    }
                }
            }
        },
        s: {  // sustain
            args: [
                { def: 0, min: 0, max: 255 },
                { def: 0, min: -128, max: 127 }
            ],
            callback: function (self, work, command, args) {
                work.data.push(TsdPlayer.CMD_SUSTAIN_MODE);
                work.data.push(args[0]);
                if (2 == args.length) {
                    work.data.push(TsdPlayer.CMD_PORTAMENT);
                    work.data.push(TssCompiler._toUint8(args[1]));
                }
            }
        },
        t: {  // tempo
            args: [ { def: 120, min: 1, max: 512 } ],
            callback: function (self, work, command, args) {
                var n = ~~(22050 * 4 * 60 / 192 / args[0]);
                work.data.push(TsdPlayer.CMD_TEMPO);
                work.data.push(n >> 8);
                work.data.push(n & 0xff);
            }
        },
        v: {  // volume
            args: [
                { def: 10, min: 0, max: 15 },
                { def: 0, min: 0, max: 15 }
            ],
            callback: function (self, work, command, args) {
                if ((TsdPlayer.HARDWARE_MODE_GAMEBOY == work.mode) &&
                        (2 == work.lineObject.directive))
                    for (var i = 0; i < args.length; i++)
                        if (args[i] > 3)
                            throw new TssCompiler.CompileError(work.lineObject,
                                    work.offset, "volume must be less than 4" +
                                            " for channel 2 in gameboy mode");
                var base = 0;
                var shift = 3;
                if (TsdPlayer.HARDWARE_MODE_GAMEBOY == work.mode)
                    shift = 0;
                else if (TssCompiler.VOLUME_RANGE_MODE_NORMAL ==
                        work.volumeRangeMode)
                    shift = 4;
                else
                    base = 128;
                if (1 == args.length) {
                    // mono
                    work.currentVolume.l = base + (args[0] << shift);
                    work.data.push(TsdPlayer.CMD_VOLUME_MONO);
                    work.data.push(work.currentVolume.l);
                } else {
                    // stereo
                    work.currentVolume.l = base + (args[0] << shift);
                    work.currentVolume.r = base + (args[1] << shift);
                    work.data.push(TsdPlayer.CMD_VOLUME_LEFT);
                    work.data.push(work.currentVolume.l);
                    work.data.push(TsdPlayer.CMD_VOLUME_RIGHT);
                    work.data.push(work.currentVolume.r);
                }
            }
        },
        x: {  // volume and pitch mode
            args: [
                { def: undefined, min: 0, max: 17 },
                { def: undefined, min: 0, max: 3 }
            ],
            callback: function (self, work, command, args) {
                if (args[0] == undefined) {
                    if ((args[0] & 0x0f) > 1)
                        throw new TssCompiler.CompileError(work.lineObject,
                                work.offset, "invalid volume mode " +
                                args[0] + " for 'x'");
                    if ((args[0] & 0x10) == 0)
                        work.volumeRangeMode =
                                TssCompiler.VOLUME_RANGE_MODE_NORMAL;
                    else
                        work.volumeRangeMode =
                                TssCompiler.VOLUME_RANGE_MODE_UPPER;
                    work.data.push(TssCompiler.CMD_VOLUME_MODE_CHANGE);
                    work.data.push(args[0] & 0x0f);
                }
                if (args[1] == undefined) {
                    work.data.push(TssCompiler.CMD_FREQUENCY_MODE_CHANGE);
                    work.data.push(args[1]);
                }
            }
        }
    };
    for (var ch = 0; ch < this.tags.channels; ch++) {
        var work = {
            offset: 0,
            line: 0,
            lineObject: null,
            clock: 192, // TODO #CLOCK
            maxGate: maxGate,
            mode: this.modes.hardware,
            volumeRangeMode: TssCompiler.VOLUME_RANGE_MODE_NORMAL,
            volumeRelativeMode: this.modes.volumeRelative,
            octaveMode: this.modes.octave,
            currentVolume: { l: 0, r: 0 },
            currentOctave: 4,
            currentGate: maxGate,
            defaultDot: 0,
            defaultLength: 4,
            loop: {
                offset: 0,
                line: 0,
                count: 0,
                end: {
                    offset: 0,
                    line: 0
                }
            },
            localLoopId: 0,
            count: 0,
            data: [],
            dataLength: 0
        };
        if (0 == ch) {
            work.data.push(TsdPlayer.CMD_FINENESS);
            work.data.push(this.tags.fineness >> 8);
            work.data.push(this.tags.fineness & 0xff);
        }
        if (TssCompiler.HARDWARE_MODE_FAMICOM == work.mode) {
            work.data.push(TsdPlayer.CMD_MODULE_CHANGE);
            if (2 != ch)
                work.data.push(1);
            else
                work.data.push(4);
        } else if (TssCompiler.HARDWARE_MODE_GAMEBOY == work.mode) {
            work.data.push(TsdPlayer.CMD_MODULE_CHANGE);
            if (3 == ch)
                work.data.push(15);
            else if (2 == ch)
                work.data.push(14);
            else
                work.data.push(13);
            work.data.push(TsdPlayer.CMD_FREQUENCY_MODE_CHANGE);
            if (2 == ch)
                work.data.push(3);
        }
        for (work.line = 0; work.line < this.channels[ch].length;
                work.line++) {
            work.lineObject = this.channels[ch][work.line];
            for (work.offset = 0;
                    work.offset < work.lineObject.data.byteLength();
                    work.offset) {
                work.offset += work.lineObject.data.countSpaces(work.offset);
                if (work.offset >= work.lineObject.data.byteLength())
                    break;
                var c = work.lineObject.data.lowerCharAt(work.offset);
                var command = c;
                var args = [];
                if (('a' <= c) && (c <= 'g'))
                    c = 'r';
                if (!syntax[c])
                    throw new TssCompiler.CompileError(work.lineObject,
                        work.offset,
                        "unknown command '" + c + "'");
                work.offset++;
                if (syntax[c].sequence) {
                    work.offset +=
                            work.lineObject.data.countSpaces(work.offset);
                    if (work.offset >= work.lineObject.data.byteLength())
                        break;
                    var next = work.lineObject.data.lowerCharAt(work.offset);
                    if (syntax[c].sequence.indexOf(next) >= 0) {
                        c += next;
                        command = c;
                        work.offset++;
                    }
                }
                if (this.logMmlCompile)
                    Log.getLog().info("command " + command +
                            " with parameters as follows");
                for (var i = 0; i < syntax[c].args.length; i++) {
                    if (0 != i) {
                        var position = TssCompiler._getCharacter(
                                work.lineObject, work.offset, ',');
                        if (position < 0)
                            break;
                        work.offset = position + 1;
                    }
                    var result = TssCompiler._getNumberParameter(
                            work.lineObject, work.offset);
                    if (typeof result.parameter == "undefined") {
                        if (typeof syntax[c].args[i].def == "undefined")
                            throw new TssCompiler.CompileError(work.lineObject,
                                    work.offset,
                                    "missing argument for '" + c + "'");
                        args.push(syntax[c].args[i].def);
                    } else {
                        args.push(result.parameter);
                        work.offset = result.end + 1;
                    }
                }
                if (this.logMmlCompile)
                    Log.getLog().info(args);
                work.dataLength = work.data.length;
                if (syntax[c].callback)
                    syntax[c].callback(this, work, command, args);
                if (this.logMmlCompile) {
                    var message = "> " + work.dataLength.toString(16) + ": ";
                    for (i = work.dataLength; i < work.data.length; i++) {
                        if (i != work.dataLength)
                            message += ", ";
                        message += work.data[i].toString(16);
                    }
                    Log.getLog().info(message);
                }
                work.dataLength = work.data.length;
            }
        }
        work.data.push(TsdPlayer.CMD_END);
        this.channelData[ch] = work.data;
        Log.getLog().info("TSS: DATA " + (ch + 1) + "> " + work.data.length +
                " Byte(s) / " + work.count + " Tick(s)");
    }
};

/**
 * Generate TSD data.
 */
TssCompiler.prototype._generateTsd = function () {
    // Header size.
    var titleSize = this.tags.title.byteLength();
    if (0 != (titleSize % 2))
        titleSize++;
    var headerSize =
            14 +  // "T'SoundSystem", 0x00
            2 +  // Version.Release
            2 +  // Title length
            titleSize +  // title
            2 +  // number of channels
            8 * this.tags.channels +  // channel headers
            4;  // voice data offset
    var dataSize = headerSize;
    Log.getLog().info("TSS: HEADER SIZE> " + dataSize);

    // Data size.
    var i;
    for (i = 0; i < this.tags.channels; i++)
        dataSize += this.channelData[i].length;
    var voiceOffset = dataSize;

    // Wave data size
    dataSize += 2;  // number of waves
    Log.getLog().info("TSS: WAVE> " + this.validWaves);
    for (i = 0; i < this.waves.length; i++) {
        if (!this.waves[i])
            continue;
        Log.getLog().info("TSS:  " + i + "> " + this.waves[i].length);
        dataSize += 2 + this.waves[i].length;  // id, size, wave
    }

    // TODO: Table data size
    dataSize += 2;

    // Create data.
    var tsd = new Uint8Array(dataSize);
    Log.getLog().info("TSS: TOTAL SIZE> " + dataSize);
    var tsdWriter = TString.createFromUint8Array(tsd);
    // Magic: "T'SoundSystem", 0x00
    var offset = tsdWriter.setASCII(0, "T'SoundSystem");
    // Version.Release
    tsdWriter.setAt(offset++, ~~TssCompiler.VERSION);
    tsdWriter.setAt(offset++, (~~(TssCompiler.VERSION * 100)) % 100);
    // Title length, UTF-8 string, and padding.
    offset = tsdWriter.setUint16(offset, this.tags.title.byteLength());
    offset = tsdWriter.setTString(offset, this.tags.title);
    if (0 == (this.tags.title.byteLength() % 2))
        offset--;
    // Number of channels.
    offset = tsdWriter.setUint16(offset, this.tags.channels);
    // Channel headers.
    var channelOffset = headerSize;
    for (i = 0; i < this.tags.channels; i++) {
        var channelSize = this.channelData[i].length;
        offset = tsdWriter.setUint32(offset, channelOffset);
        offset = tsdWriter.setUint32(offset, channelSize);
        // Channel data.
        for (var n = 0; n < channelSize; n++)
            tsdWriter.setAt(channelOffset + n, this.channelData[i][n]);
        channelOffset += channelSize;
    }
    // Voice data offset.
    offset = tsdWriter.setUint32(offset, voiceOffset);

    // Wave data
    offset = tsdWriter.setUint16(voiceOffset, this.validWaves);
    for (i = 0; i < this.validWaves; i++) {
        if (!this.waves[i])
            continue;
        tsdWriter.setAt(offset++, i);
        var dataLength = this.waves[i].length;
        tsdWriter.setAt(offset++, dataLength);
        for (var dataOffset = 0; dataOffset < dataLength; dataOffset++)
            tsdWriter.setAt(offset++,
                    TssCompiler._toUint8(this.waves[i][dataOffset]));
    }

    // TODO: Table data
    offset = tsdWriter.setUint16(offset, 0);

    return tsd.buffer;
};

/**
 * Compile TSS source internally.
 */
TssCompiler.prototype._compile = function () {
    try {
        this._parseLines();
        this._parseDirectives();
        this._parseChannels();
        return this._generateTsd();
    } catch (e) {
        Log.getLog().error(e.toString());
        return null;
    }
};

/**
 * Compile TSS source data.
 * @param source string or ArrayBuffer object containing TSS source data
 */
TssCompiler.prototype.compile = function (source) {
    if (typeof source == "string")
        this.source = TString.createFromString(source);
    else
        this.source = TString.createFromUint8Array(new Uint8Array(source));
    return this._compile();
};