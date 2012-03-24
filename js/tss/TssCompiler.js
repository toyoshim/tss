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
    this.logMmlCompile = true;
    this.source = null;
    this.directives = [];
    this.channels = [];
    this.waves = [];
    this.tag = {
        title: null,
        channels: 0
    };
    this.fineness = TssCompiler._DEFAULT_FINENESS;
}

TssCompiler.VERSION = 0.93;
TssCompiler._DEFAULT_FINENESS = 368;
TssCompiler._ALPHABET_COUNT = 'z'.charCodeAt(0) - 'a'.charCodeAt(0) + 1;

/**
 * CompileError prototype
 *
 * This prototype contains compile error information.
 * @param line line object
 *      line: line number
 *      ... TODO: Show more detail information.
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
    return "TSS: { line: " + this.line.line + ", offset: " + this.offset +
            " } " + this.message;
};

/**
 * Check line.directive is channel directive (e.g. "#A", "#zx") then rewrite
 * line.directive with channel number.
 * @param line line object to check
 */
TssCompiler.prototype._checkChannelDirective = function (line) {
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
TssCompiler.prototype._checkDirective = function (line) {
    var data = line.data;
    var length = data.byteLength();
    for (var i = 0; i < length; i++) {
        var c = data.at(i);
        if (0 == c)
            continue;
        if ('#'.charCodeAt(0) == c) {
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
    this._checkChannelDirective(line);
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
        directive: null
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
        this._checkDirective(result);
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
    var channel = -1;
    var length = this.source.byteLength();
    for (var offset = 0; offset < length; context.line++) {
        var count = this.source.countLine(offset);
        var line = this._preprocessLine(context, offset, count);
        if (!line.empty) {
            if (null == line.directive) {
                if (-1 == channel)
                    throw new TssCompiler.CompileError(line, 0,
                            "invalid line without any directive");
                line.directive = channel;
            }
            if (typeof line.directive == "number") {
                channel = line.directive;
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
        Log.getLog().info("TSS: channel " + i + " has " + n + " line(s)");
    }
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
TssCompiler.prototype._getBracedParameter = function (line, offset) {
    var data = line.data;
    var begin = offset + data.countSpaces(offset);
    if ('<' != data.charAt(begin))
        return { begin: begin, end: begin, parameter: undefined };
    begin++;
    var n = 0;
    var length = data.byteLength();
    for (var i = begin; i < length; i++) {
        var c = data.at(i);
        if ((0 == c) || ('\\'.charCodeAt(0) == c))
            continue;
        if ('>'.charCodeAt(0) == c)
            break;
        n++;
    }
    var end = begin + n - 1;
    var param = TString.createFromUint8Array(new Uint8Array(n));
    for (i = begin; i <= end; i++) {
        var c = data.at(i);
        if ((0 == c) || ('\\'.charCodeAt(0) == c))
            continue;
        param.setAt(i - begin, c);
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
TssCompiler.prototype._getNumberParameter = function (line, offset) {
    var data = line.data;
    var begin = offset + data.countSpaces(offset);
    var sign = 1;
    if ('-' == data.charAt(begin)) {
        begin++;
        begin += data.countSpaces(begin);
        sign = -1;
    }
    var n = data.numberAt(begin);
    if (n < 0)
        return { begin: begin, end: begin, parameter: undefined };
    var length = data.byteLength();
    for (var i = begin + 1; i < length; i++) {
        var result = data.numberAt(i);
        if (result < 0)
            return { begin: begin, end: i - 1, parameter: sign * n };
        n = n * 10 + result;
    }
    return { begin: begin, end: i - 1, parameter: sign * n};
};

/**
 * Get comma.
 * @param line source data of line object
 * @param offset offset start offset
 * @return -1 if the next non-space character is not comma, otherwise offset
 */
TssCompiler.prototype._getComma = function (line, offset) {
    var data = line.data;
    var position = offset + data.countSpaces(offset);
    if (',' != data.charAt(position))
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
    if (offset != data.byteLength())
        return false;
    return true;
};

/**
 * Parse directives.
 * @raose TssCompiler.CompileError
 */
TssCompiler.prototype._parseDirectives = function () {
    for (var i = 0; i < this.directives.length; i++) {
        var directive = this.directives[i].directive;
        var offset = 0;
        var result;
        if ("CHANNEL" == directive) {
            result = this._getNumberParameter(this.directives[i], 0);
            if (typeof result.parameter == "undefined")
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "number not found in #CHANNEL");
            this.tag.channels = result.parameter;
            offset = result.end + 1;
            Log.getLog().info("TSS: CHANNEL> " + this.tag.channels);
        } else if ("FINENESS" == directive) {
            // TODO
            Log.getLog().warn("TSS: #FINENESS is not implemented");
        } else if ("OCTAVE" == directive) {
            // TODO
            Log.getLog().warn("TSS: #OCTAVE is not implemented");
        } else if ("PRAGMA" == directive) {
            // TODO
            Log.getLog().warn("TSS: #PRAGMA is not implemented");
        } else if ("TABLE" == directive) {
            // TODO
            Log.getLog().warn("TSS: #TABLE is not implemented");
        } else if ("TITLE" == directive) {
            result = this._getBracedParameter(this.directives[i], 0);
            if (!result.parameter)
                throw new TssCompiler.CompileError(this.directives[i],
                        result.begin, "syntax error in #TITLE");
            this.tag.title = result.parameter;
            offset = result.end + 1;
            Log.getLog().info("TSS: TITLE> " + this.tag.title.toString());
        } else if ("VOLUME" == directive) {
            // TODO
            Log.getLog().warn("TSS: #VOLUME is not implemented");
        } else if ("WAVE" == directive) {
            // TODO
            Log.getLog().warn("TSS: #WAVE is not implemented");
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
    // TODO:
    // cmdOctaveUp, cmdOCtabeDown, cmdVolumeUp, and cmdVolumeDown must reflect
    // directive settings.
    var cmdOctaveUp = '<';
    var cmdOctaveDown = '>';
    var cmdVolumeUp = '(';
    var cmdVolumeDown = ')';
    // TODO:
    // volumeMsx and gateMax must reflect settings.
    var volumeMax = 15;
    var gateMax = 16;
    // Syntax information except for note premitives (cdefgabr).
    var syntax = {
        '$': {  // loop
            args: [],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '%': {  // module
            args: [
                { def: 0, min: 0, max: 255 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '/': {  // local loop break
            sequence: ":"
        },
        '/:': {  // local loop begin
        },
        ':/': {  // local loop end
        },
        '@': {  // voice
            sequence: "iov",
            args: [
                { def: 0, min: 0, max: 255 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '@i': {  // input pipe
            args: [
                { def: 0, min: 0, max: 8 },
                { def: 0, min: 0, max: 3 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '@o': {  // output pipe
            args: [
                { def: 0, min: 0, max: 2 },
                { def: 0, min: 0, max: 3 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '@v': {  // fine volume
        },
        ']': {  // loop end
            args: [],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '[': {  // loop start
            args: [
                { def: 2, min: 2, max: 65535 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '_': {  // relative volume up
        },
        '|': {  // loop break
            args: [],
            callback: function (self, work, args) {
                // TODO
            }
        },
        '~': {  // relative volume down
        },
        k: {  // detune
            args: [
                { def: 0, min: -128, max: 127 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        l: {  // default note length
            args: [
                { def: 1, min: 0, max: 255 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        m: {  // multiple
            sequence: "p"
        },
        mp: {  // pitch modulation
            args: [
                { def: undefined, min: 0, max: 65535 },  // delay
                { def: undefined, min: 0, max: 255 },  // depth
                { def: undefined, min: 0, max: 255 },  // width
                { def: undefined, min: -127, max: 127 },  // height
                { def: undefined, min: 0, max: 255 }  // delta
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        n: {  // n/a
            sequence: "ast"
        },
        na: {  // amp envelope
        },
        ns: {  // note emvelope
        },
        nt: {  // note shift
        },
        o: {  // octave
            args: [
                { def: 4, min: 1, max: 8 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        p: {  // panpot
            sequence: "h",
            args: [
                { def: 0, min: 0, max: 3 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        ph: {  // key-on phase
        },
        q: {  // gate time
            args: [
                { def: gateMax, min: 0, max: gateMax }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        r: {  // note off
            args:[],
            callback: function (self, work, args) {
                if (0 != args.length) {
                    work.offset += data.countSpaces(work.offset);
                    var c = data.charAt(work.offset);
                    if (('-' == c) || ('+' == c))
                        work.offset++;
                    // TODO: handle -/+
                }
                for (;;) {
                    var result = self._getNumberParameter(work.line,
                        work.offset);
                    if (typeof result.parameter == "undefined") {
                        // TODO: take default value
                    } else {
                        // TODO: take result.parameter
                        work.offset = result.end + 1;
                    }
                    work.offset += data.countSpaces(work.offset);
                    if ('.' == data.charAt(work.offset)) {
                        // TODO: handle dot
                        work.offset++;
                    }
                    work.offset += data.countSpaces(work.offset);
                    if ('^' != data.charAt(work.offset))
                        break;
                    work.offset++;
                }
            }
        },
        s: {  // sustain
            args: [
                { def: 0, min: 0, max: 255 },
                { def: 0, min: -128, max: 127 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        t: {  // tempo
            args: [
                { def: 120, min: 1, max: 512 }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        v: {  // volume
            args: [
                { def: 10, min: 0, max: volumeMax },
                { def: 0, min: 0, max: volumeMax }
            ],
            callback: function (self, work, args) {
                // TODO
            }
        },
        x: {  // volume and pitch mode
        }
    };
    syntax[cmdOctaveUp] = {  // octave up
        args: [],
        callback: function (self, work, args) {
            // TODO
        }
    };
    syntax[cmdOctaveDown] = {  // octave down
        args: [],
        callback: function (self, work, args) {
            // TODO
        }
    };
    syntax[cmdVolumeUp] = {  // volume up
    };
    syntax[cmdVolumeDown] = {  // volume down
    };
    var work = {
        offset: 0,
        line: null
    };
    for (var ch = 0; ch < this.tag.channels; ch++) {
        var lines = this.channels[ch].length;
        for (var line = 0; line < lines; line++) {
            work.line = this.channels[ch][line];
            var data = work.line.data;
            var length = data.byteLength();
            for (work.offset = 0; work.offset < length; work.offset) {
                work.offset += data.countSpaces(work.offset);
                var c = data.lowerCharAt(work.offset);
                var args = [];
                if (('a' <= c) && (c <= 'g')) {
                    args.push(c);
                    c = 'r';
                }
                if (!syntax[c])
                    throw new TssCompiler.CompileError(work.line, work.offset,
                        "unknown command " + c);
                work.offset++;
                if (syntax[c].sequence) {
                    work.offset += data.countSpaces(work.offset);
                    var next = data.lowerCharAt(work.offset);
                    if (syntax[c].sequence.indexOf(next) >= 0) {
                        c += next;
                        work.offset++;
                    }
                }
                if (this.logMmlCompile)
                    Log.getLog().info(
                            "command " + c + " with parameters as follows");
                for (var i = 0; i < syntax[c].args.length; i++) {
                    if (0 != i) {
                        var position = this._getComma(work.line, work.offset);
                        if (position < 0) {
                            if (syntax[c].args[i].optional)
                                throw new TssCompiler.CompileError(work.line,
                                        work.offset,
                                        "missing comma for '" + c + "'");
                            break;
                        }
                        work.offset = position + 1;
                    }
                    var result = this._getNumberParameter(work.line,
                            work.offset);
                    if (typeof result.parameter == "undefined") {
                        if (typeof syntax[c].args[i].def == "undefined")
                            throw new TssCompiler.CompileError(work.line,
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
                if (syntax[c].callback)
                    syntax[c].callback(this, work, args);
            }
        }
    }
    Log.getLog().warn("TSS: _parseChannels() is not completed");
};

/**
 * Generate TSD data.
 */
TssCompiler.prototype._generateTsd = function () {
    // TODO
    Log.getLog().warn("TSS: _generateTsd() is not implemented");
    console.log(this);
    return null;
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
