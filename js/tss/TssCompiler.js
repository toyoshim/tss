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
 */
TssCompiler.prototype._error = function (line) {
    Log.getLog().error("TSS: (" + line.line + "," + line.error.offset +
        ") " + line.error.message);
};

/**
 * Count line size in byte from offset.
 * @param string string object to count
 * @param offset start offset
 * @return { utf16, byte }
 *      utf16: line size in utf-16
 *      byte: line size in bytes
 */
TssCompiler.prototype._countLine = function (string, offset) {
    var count = 0;
    for (var i = offset; i < string.length; i++) {
        var c = string.charAt(i);
        // TODO: Must take care of non-ASCII(UTF-16) strings.
        if (('\r' == c)|| ('\n' == c))
            break;
        count++;
    }
    return { utf16: i - offset, byte: count };
};

/**
 * Parse string contains a line with count information, generate line object
 * which contains line number, original source string, and comment stripped
 * Uint8Array buffer.
 * @param context parser context containing line and comment information
 * @param string target string to parse
 * @param count count information in UTF-16 and bytes
 * @return { line, source, buffer }
 *      line: original source line
 *      source: original source string
 *      buffer: comment stripped Uint8Array
 *      empty: this line contains no data
 *      directive: directive (e.g. "TITLE" in string, or "9" in number)
 *      error: { offset, message } if parse fails, otherwise null
 *          offset: offset where parse fails
 *          message: reason
 */
TssCompiler.prototype._preprocessLine = function (context, string, count) {
    var result = {
        line: context.line,
        source: string,
        buffer: new Uint8Array(count.byte),
        empty: true,
        directive: null,
        error: null
    };
    for (var i = 0; i < count.utf16; i++) {
        // TODO: Must take care of non-ASCII(UTF-16) strings.
        var c = string.charAt(i);
        if (context.commentNest > 0) {
            // In comment.
            if ('\\' == c)
                result.buffer[i++] = 0x20;
            else if ('{' == c)
                context.commentNest++;
            else if ('}' == c)
                context.commentNest--;
            result.buffer[i] = 0x20;
        } else {
            if ('\\' == c) {
                result.buffer[i++] = 0x1b;
                result.buffer[i] = string.charCodeAt(i);
                result.empty = false;
            } else if ('{' == c) {
                context.commentNest++;
                result.buffer[i] = 0x20;
            } else if ('}' == c) {
                context.commentNest--;
                result.buffer[i] = 0x20;
                if (context.commentNest < 0) {
                    result.error = {
                        offset: i,
                        message: "'}' appears without '{'"
                    };
                    break;
                }
            } else {
                if ('\t' == c)
                    result.buffer[i] = 0x20;
                else
                    result.buffer[i] = string.charCodeAt(i);
                result.empty = false;
            }
        }
    }
    if (!result.empty)
        this._checkDirective(result);
    return result;
};

/**
 * Return an alphabetical order position from 'a' or 'A' if specified code
 * is number in ASCII. Otherwise return -1.
 * @param c code
 * @return an alphabetical order position from 'a' or 'A', or -1.
 */
TssCompiler.prototype._getAlphabetIndex = function (c) {
    if (('A'.charCodeAt(0) <= c) && (c <= 'Z'.charCodeAt(0)))
        return c - 'A'.charCodeAt(0);
    else if (('a'.charCodeAt(0) <= c) && (c <= 'z'.charCodeAt(0)))
        return c - 'a'.charCodeAt(0);
    return -1;
};

/**
 * Check line.directive is channel directive (e.g. "#A", "#zx") then rewrite
 * line.directive with channel number.
 * @param line line object to check
 */
TssCompiler.prototype._checkChannelDirective = function (line) {
    var channel = 0;
    if ((2 < line.directive.length) || (0 == line.directive.length))
        return;
    var n2 = 0;
    if (2 == line.directive.length) {
        var n2 = this._getAlphabetIndex(line.directive[1]);
        if (n2 < 0)
            return;
    }
    var n1 = this._getAlphabetIndex(line.directive[0]);
    if (n1 < 0)
        return;
    var n = n2 * TssCompiler._ALPHABET_COUNT + n1;
    line.directive = n;
};

/**
 * Check line object, parse directive in line.buffer to set line.directive,
 * and retrieve the directive (e.g. "#TITLE") from buffer.
 * @param line line object
 */
TssCompiler.prototype._checkDirective = function (line) {
    for (var i = 0; i < line.buffer.length; i++) {
        var c = line.buffer[i];
        if (0x20 == c)
            continue;
        if ('#'.charCodeAt(0) == c) {
            line.buffer[i++] = 0x20;
            break;
        }
        line.directive = null;
        return;
    }
    for (var start = i; i < line.buffer.length; i++) {
        if (0x20 == line.buffer[i])
            break;
    }
    line.directive = new Uint8Array(line.buffer.buffer.slice(start, i));
    this._checkChannelDirective(line);
    for (var offset = start; offset < i; offset++)
        line.buffer[offset] = 0x20;
};

/**
 * Compile TSS source data of string object.
 * @param string string object containing TSS source data
 */
TssCompiler.prototype._compileString = function (string) {
    var context = {
        line: 0,
        commentNest: 0
    };
    var channel = -1;
    for (var offset = 0; offset < string.length; context.line++) {
        var count = this._countLine(string, offset);
        var line = this._preprocessLine(context,
                string.substr(offset, count.utf16), count);
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
        offset += count.utf16;
        if ('\r' == string.charAt(offset))
            offset++;
        if ('\n' == string.charAt(offset))
            offset++;
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
        return this._compileString(source);
    // TODO: Support ArrayBuffer.
    // Maybe string and ArrayBuffer inherit an abstract prototype and
    // _compileString must be replaced with _compileObject which can handle
    // the abstract prototype.
    Log.getLog().info("TSS: Unknown source type " + typeof source);
};
