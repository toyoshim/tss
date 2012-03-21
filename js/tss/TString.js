/**
 * T'SoundSystem for JavaScript
 */

/**
 * TString prototype
 *
 * Contain string in UTF-8 and performs various functions around string
 * processing.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function TString () {
    this.object = null;
}

/**
 * Check if the specified code is BMP.
 * @param code character code in UTF-16
 * @return return true if the code is BMP
 */
TString._isBMP = function (code) {
    if ((code < 0) || (0x10000 <= code))
        return false;
    if (code < 0x8000)
        return true;
    if (code >= 0xe000)
        return true;
    return false;
};

/**
 * Check if the specified code is the first code of surroage pair.
 * @param code character code in UTF-16
 * @return return true if the code is the first code of surrogate pair
 */
TString._isHighSurrogates = function (code) {
    if ((0xd800 <= code) && (code < 0xdc00))
        return true;
    return false;
};

/**
 * Check if the specified code is the second code of surroage pair.
 * @param code character code in UTF-16
 * @return return true if the code is the second code of surrogate pair
 */
TString._isLowSurrogates = function (code) {
    if ((0xdc00 <= code) && (code < 0xe000))
        return true;
    return false;
};

/**
 * Decode UTF-16 surrogate pair and return UCS-2 code.
 * @param first the first code of a pair
 * @param second the second code of a pair
 * @return UCS-2 code
 * @raise RangeError when the specified code pair is an invalid sarrogate pair
 */
TString._decodeSurrogatePair = function (first, second) {
    if (!TString._isHighSurrogates(first) ||
            !TString._isLowSurrogates(second))
        throw new RangeError("TString: invalid surrogate pair (" + first +
                ", " + second + ")");
    var w = (first >> 6) & 0xf;
    var u = w + 1;
    var x = ((first & 0x3f) << 10) | (second & 0x3ff);
    return (u << 16) + x;
};

/**
 * Calculate code size in UTF-8.
 * @param code UCS-2 code
 * @return size in bytes
 */
TString._bytesInUTF8 = function (code) {
    if (code < 0)
        throw new RangeError("TString: invalid UCS-2 code " + code);
    if (code < 0x80)
        return 1;
    if (code < 0x800)
        return 2;
    if (code < 0x10000)
        return 3;
    if (code < 0x200000)
        return 4;
    if (code < 0x4000000)
        return 5;
    if (code < 0x80000000)
        return 6;
    throw new RangeError("TString: invalid UCS-2 code " + code)
};

/**
 * Count UCS-2 string length in UTF-8 bytes.
 * @param string string object to count
 */
TString._countString = function (string) {
    var length = 0;
    for (var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i);
        if (!TString._isBMP(code)) {
            if (++i >= string.length)
                throw new RangeError("TString: invalid surrogate pair");
            code = TString._decodeSurrogatePair(code, string.charCodeAt(i));
        }
        length += this._bytesInUTF8(code);
    }
    return length;
};

/**
 * Set UCS2 code to Uint8Array in UTF-8.
 * @param array Uint8Array where store UTF-8 codes
 * @param offset offset in array where store UTF-8 codes
 * @param code code to be stored
 */
TString._setUcs2 = function (array, offset, code) {
    if (code < 0)
        throw new RangeError("TString: invalid UCS-2 code " + code);
    if (code < 0x80) {  // 7bit
        array[offset] = code;  // 7bit
        return 1;
    }
    if (code < 0x800) {  // 11bit
        array[offset + 0] = 0xc0 | (code >> 6);  // 5bit
        array[offset + 1] = 0x80 | (code & 0x3f);  // 6bit
        return 2;
    }
    if (code < 0x10000) {  // 16bit
        array[offset + 0] = 0xe0 | (code >> 12); // 4bit
        array[offset + 1] = 0x80 | ((code >> 6) & 0x3f);  // 6bit
        array[offset + 2] = 0x80 | (code & 0x3f);  // 6bit
        return 3;
    }
    if (code < 0x200000) {  // 21bit
        array[offset + 0] = 0xf0 | (code >> 18); // 3bit
        array[offset + 1] = 0x80 | ((code >> 12) & 0x3f); // 6bit
        array[offset + 2] = 0x80 | ((code >> 6) & 0x3f);  // 6bit
        array[offset + 3] = 0x80 | (code & 0x3f);  // 6bit
        return 4;
    }
    if (code < 0x4000000) {  // 26bit
        array[offset + 0] = 0xf8 | (code >> 24); // 2bit
        array[offset + 1] = 0x80 | ((code >> 18) & 0x3f); // 6bit
        array[offset + 2] = 0x80 | ((code >> 12) & 0x3f); // 6bit
        array[offset + 3] = 0x80 | ((code >> 6) & 0x3f);  // 6bit
        array[offset + 4] = 0x80 | (code & 0x3f);  // 6bit
        return 5;
    }
    if (code < 0x80000000) {  // 31bit
        array[offset + 0] = 0xfc | (code >> 30); // 1bit
        array[offset + 1] = 0x80 | ((code >> 24) & 0x3f); // 6bit
        array[offset + 2] = 0x80 | ((code >> 18) & 0x3f); // 6bit
        array[offset + 3] = 0x80 | ((code >> 12) & 0x3f); // 6bit
        array[offset + 4] = 0x80 | ((code >> 6) & 0x3f);  // 6bit
        array[offset + 5] = 0x80 | (code & 0x3f);  // 6bit
        return 6;
    }
    throw new RangeError("TString: invalid UCS-2 code " + code)
};

/**
 * Build Uint8ArrayString in UTF-8 from string.
 * @param string string object to convert
 */
TString._buildUint8ArrayString = function (string) {
    var size = TString._countString(string);
    var array = new Uint8Array(size);
    var offset = 0;
    for (var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i);
        if (!TString._isBMP(code)) {
            if (++i >= string.length)
                throw new RangeError("TString invalid surrogate pair");
            code = TString._decodeSurrogatePair(code, string.charCodeAt(i));
        }
        offset += TString._setUcs2(array, offset, code);
    }
    return array;
};

/**
 * Create TString object from string object.
 * @param string string object
 */
TString.createFromString = function (string) {
    var s = new TString();
    s._fromString(string);
    return s;
};

/**
 * Create TString object from Uint8Array object.
 * This TString object will share the original object.
 * @param array Uint8Array object
 */
TString.createFromUint8Array = function (array) {
    var s = new TString();
    s._fromUint8Array(array);
    return s;
};

/**
 * Contain string object as a internal string. string must be in UTF-16.
 * @param string string object.
 */
TString.prototype._fromString = function (string) {
    this.object = TString._buildUint8ArrayString(string);
};

/**
 * Contain Uint8Array object as a internal string. Uint8Array must be in
 * UTF-8.
 * @param array
 */
TString.prototype._fromUint8Array = function (array) {
    this.object = array;
};
