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
    this.source = null;
    this.directives = [];
    this.channels = [];
    this.waves = [];
    this.title = "";
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
                line.setAt(i++, 0);
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
        line: 0,
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
 * Parse directives.
 * @raose TssCompiler.CompileError
 */
TssCompiler.prototype._parseDirectives = function () {
    for (var i = 0; i < this.directives.length; i++) {
        var directive = this.directives[i].directive;
        if ("CHANNEL" == directive) {
            Log.getLog().warn("TSS: #CHANNEL is not implemented");
        } else if ("FINENESS" == directive) {
            Log.getLog().warn("TSS: #FINENESS is not implemented");
        } else if ("OCTAVE" == directive) {
            Log.getLog().warn("TSS: #OCTAVE is not implemented");
        } else if ("PRAGMA" == directive) {
            Log.getLog().warn("TSS: #PRAGMA is not implemented");
        } else if ("TABLE" == directive) {
            Log.getLog().warn("TSS: #TABLE is not implemented");
        } else if ("TITLE" == directive) {
            Log.getLog().warn("TSS: #TITLE is not implemented");
        } else if ("VOLUME" == directive) {
            Log.getLog().warn("TSS: #VOLUME is not implemented");
        } else if ("WAVE" == directive) {
            Log.getLog().warn("TSS: #WAVE is not implemented");
        } else {
            throw new TssCompiler.CompileError(this.directives[i], 0,
                    "unknown directive: " + directive);
        }
    }
};

/**
 * Compile TSS source internally.
 */
TssCompiler.prototype._compile = function () {
    try {
        this._parseLines();
        this._parseDirectives();
        // TODO: Implement following functions
        // this._parseChannels();
        Log.getLog().warn("TSS: _parseChannels() is not implemented");
        // this._generateTsd();
        Log.getLog().warn("TSS: _generateTsd() is not implemented");
    } catch (e) {
        Log.getLog().error(e.toString());
    }
    console.log(this);
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
