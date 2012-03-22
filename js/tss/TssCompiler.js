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
 * Log error information.
 * @param line line object containing error object.
 *  line: line number
 *  error: error information
 *      offset: offset where an error is detected
 *      message: error message
 *  ... misc ...  // TODO: Show more detail line information.
 */
TssCompiler.prototype._error = function (line) {
    Log.getLog().error("TSS: (" + line.line + "," + line.error.offset +
        ") " + line.error.message);
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
        var c = data.charAt(i);
        if (' ' == c)
            continue;
        if ('#' == c) {
            data.setAt(i++, 0x20);
            break;
        }
        line.directive = null;
        return;
    }
    for (var start = i; i < length; i++)
        if (' ' == data.charAt(i))
            break;
    line.directive = data.slice(start, i).toString();
    for (var offset = start; offset < i; offset++)
        data.setAt(offset, 0x20);
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
        directive: null,
        error: null
    };
    var line = this.source.slice(offset, offset + count);
    result.data = line;
    for (var i = 0; i < count; i++) {
        var c = line.charAt(i);
        if (context.commentNest > 0) {
            // In comment.
            if ('\\' == c)
                line.setAt(i++, 0x20);
            else if ('{' == c)
                context.commentNest++;
            else if ('}' == c)
                context.commentNest--;
            line.setAt(i, 0x20);
        } else {
            if ('\\' == c) {
                line.setAt(i++, 0x1b);
                result.empty = false;
            } else if ('{' == c) {
                context.commentNest++;
                line.setAt(i, 0x20);
            } else if ('}' == c) {
                context.commentNest--;
                line.setAt(i, 0x20);
                if (context.commentNest < 0) {
                    result.error = {
                        offset: i,
                        message: "'}' appears without '{'"
                    };
                    break;
                }
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
 * Compile TSS source internally.
 */
TssCompiler.prototype._compile = function () {
    var context = {
        line: 0,
        commentNest: 0
    };
    var channel = -1;
    var length = this.source.byteLength();
    for (var offset = 0; offset < length; context.line++) {
        var count = this.source.countLine(offset);
        var line = this._preprocessLine(context, offset, count);
        if (null != line.error) {
            this._error(line);
            return line.error;
        }
        if (!line.empty) {
            if (null == line.directive) {
                if (-1 == channel) {
                    line.error = {
                        offset: 0,
                        message: "invalid line without any directive"
                    };
                    line.error.offset = 0;
                    this._error(line);
                    return line.error;
                }
                line.directive = channel;
            }
            if (typeof line.directive == "number") {
                channel = line.directive;
                if (undefined == this.channels[line.directive])
                    this.channels[line.directive] = [];
                this.channels[line.directive].push(line);
            } else {
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
    // TODO: Implement here.
    // _parseDirectives()
    // _parseChannels()
    // These processings dont't have to take care of string or ArrayBuffer
    // because they can just handle line buffer.
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
