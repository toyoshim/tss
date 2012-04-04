/**
 * T'SoundSystem for JavaScript
 */

/**
 * SoundFont2 container base prototype
 *
 * Load SoundFont2 file.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function SoundFont2 () {
    this.riff = null;
}

SoundFont2._FOURCC_RIFF = 'RIFF';
SoundFont2._FOURCC_SFBK = 'sfbk';
SoundFont2._FOURCC_LIST = 'LIST';
SoundFont2._FOURCC_INFO = 'INFO';  // Supplemental Information
SoundFont2._FOURCC_SDTA = 'sdta';  // The Sample Binary Data
SoundFont2._FOURCC_PDTA = 'pdta';  // The Preset, Instrument, and Sample
                                   // Header data
SoundFont2._FOURCC_IFIL = 'ifil';  // Refers to the version of the Sound Font
                                   // RIFF file
SoundFont2._FOURCC_ISNG = 'isng';  // Refers to the target Sound Engine
SoundFont2._FOURCC_INAM = 'INAM';  // Refers to the Sound Font Bank Name
SoundFont2._FOURCC_IROM = 'irom';  // Refers to the Sound ROM Name
SoundFont2._FOURCC_IVER = 'iver';  // Refers to the Sound ROM Version
SoundFont2._FOURCC_ICRD = 'ICRD';  // Refers to the Date of Creation of the
                                   // Bank
SoundFont2._FOURCC_IENG = 'IENG';  // Sound Designers and Engineers for the
                                   // Bank
SoundFont2._FOURCC_IPRD = 'IPRD';  // Product for which the Bank was intended
SoundFont2._FOURCC_ICOP = 'ICOP';  // Contains any Copyright message
SoundFont2._FOURCC_ICMT = 'ICMT';  // Contains any Comments on the Bank
SoundFont2._FOURCC_ISFT = 'ISFT';  // The SoundFont tools used to create and
                                   // alter the bank
SoundFont2._FOURCC_SMPL = 'smpl';  // The Digital Audio Samples
SoundFont2._FOURCC_PHDR = 'phdr';  // The Preset Headers
SoundFont2._FOURCC_PBAG = 'pbag';  // The Preset Index list
SoundFont2._FOURCC_PMOD = 'pmod';  // The Preset Modulator list
SoundFont2._FOURCC_PGEN = 'pgen';  // The Preset Generator list
SoundFont2._FOURCC_INST = 'inst';  // The Instrument Names and Indices
SoundFont2._FOURCC_IBAG = 'ibag';  // The Instrument Index list
SoundFont2._FOURCC_IMOD = 'imod';  // The Instrument Modulator list
SoundFont2._FOURCC_IGEN = 'igen';  // The Instrument Generator list
SoundFont2._FOURCC_SHDR = 'shdr';  // The Sample Headers
SoundFont2._TYPE_VERSION = 1;
SoundFont2._TYPE_STRING = 2;
SoundFont2._FORMAT = { id: SoundFont2._FOURCC_RIFF };

(function () {
    var info = {};
    info[SoundFont2._FOURCC_IFIL] = SoundFont2._TYPE_VERSION;
    info[SoundFont2._FOURCC_ISNG] = SoundFont2._TYPE_STRING;
    info[SoundFont2._FOURCC_INAM] = SoundFont2._TYPE_STRING;
    info[SoundFont2._FOURCC_IROM] = true;
    info[SoundFont2._FOURCC_IVER] = true;
    info[SoundFont2._FOURCC_ICRD] = true;
    info[SoundFont2._FOURCC_IENG] = true;
    info[SoundFont2._FOURCC_IPRD] = true;
    info[SoundFont2._FOURCC_ICOP] = true;
    info[SoundFont2._FOURCC_ICMT] = true;
    info[SoundFont2._FOURCC_ISFT] = true;
    var sdta = {};
    sdta[SoundFont2._FOURCC_SMPL] = true;
    var pdta = {};
    pdta[SoundFont2._FOURCC_PHDR] = true;
    pdta[SoundFont2._FOURCC_PBAG] = true;
    pdta[SoundFont2._FOURCC_PMOD] = true;
    pdta[SoundFont2._FOURCC_PGEN] = true;
    pdta[SoundFont2._FOURCC_INST] = true;
    pdta[SoundFont2._FOURCC_IBAG] = true;
    pdta[SoundFont2._FOURCC_IMOD] = true;
    pdta[SoundFont2._FOURCC_IGEN] = true;
    pdta[SoundFont2._FOURCC_SHDR] = true;
    var sfbk = { id: SoundFont2._FOURCC_LIST };
    sfbk[SoundFont2._FOURCC_INFO] = info;
    sfbk[SoundFont2._FOURCC_SDTA] = sdta;
    sfbk[SoundFont2._FOURCC_PDTA] = pdta;
    SoundFont2._FORMAT[SoundFont2._FOURCC_SFBK] = sfbk;
})();

// TODO: toString()
SoundFont2.Error = function (format, message) {
    this.format = format;
    this.message = message;
};

SoundFont2._readU16 = function (array, offset) {
    return (array[offset + 1] << 8) | array[offset];
};

SoundFont2._readU32 = function (array, offset) {
    var i32 = (array[offset + 3] << 24) |
            (array[offset + 2] << 16) |
            (array[offset + 1] << 8) |
            array[offset];
    if (i32 < 0)
        return 0x100000000 + i32;
    return i32;
};

SoundFont2._readFCC = function (array, offset) {
    return String.fromCharCode(array[offset + 0]) +
            String.fromCharCode(array[offset + 1]) +
            String.fromCharCode(array[offset + 2]) +
            String.fromCharCode(array[offset + 3]);
};

SoundFont2._readHeader = function (array, offset) {
    if ((offset + 8) > array.byteLength)
        return undefined;
    var id = SoundFont2._readFCC(array, offset);
    var size = SoundFont2._readU32(array, offset + 4);
    if ((offset + 8 + size) > array.byteLength)
        return undefined;
    var data = array.subarray(offset + 8, offset + 8 + size);
    var nextOffset = offset + 8 + size;
    if (0 != (nextOffset & 1))
        nextOffset++;
    return {
        id: id,
        size: size,
        data: data,
        nextOffset: nextOffset
    };
};

SoundFont2._readChunk = function (format, data) {
    var result = {};
    for (var offset = 0; offset < data.byteLength; offset = chunk.nextOffset) {
        var chunk = SoundFont2._readHeader(data, offset);
        if (!chunk)
            throw new SoundFont2.Error(format, "Invalid chunk header");
        var fourcc = "";
        var payload = null;
        if (format.id) {
            if (chunk.id != format.id)
                throw new SoundFont2.Error(format, "Chunk ID '" + chunk.id +
                        "' mismatch");
            if (chunk.size < 4)
                throw new SoundFont2.Error(format, "Chunk size is too small");
            fourcc = SoundFont2._readFCC(chunk.data, 0);
            payload = chunk.data.subarray(4, chunk.data.byteLength);
        } else {
            fourcc = chunk.id;
            payload = chunk.data;
        }
        if (typeof format[fourcc] === "undefined")
            throw new SoundFont2.Error(format, "Chunk header '" + fourcc +
                    "' is unknown");
        if (typeof format[fourcc] == "object") {
            result[fourcc] =
                    SoundFont2._readChunk(format[fourcc], payload);
        } else if (typeof format[fourcc] == "number") {
            if (SoundFont2._TYPE_VERSION == format[fourcc]) {
                result[fourcc] = {
                    major: SoundFont2._readU16(payload, 0),
                    minor: SoundFont2._readU16(payload, 2)
                };
            } else if (SoundFont2._TYPE_STRING == format[fourcc]) {
                result[fourcc] =
                        TString.createFromUint8Array(payload).toString();
            } else {
                throw new SoundFont2.Error(format, "Internal error");
            }
        } else {
            result[fourcc] = { _: payload }; 
        }
    }
    return result;
};

/**
 * Load SoundFont2 of ArrayBuffer.
 * @param data ArrayBuffer containing SoundFont2
 */
SoundFont2.prototype.load = function (data) {
    var sf2 = new Uint8Array(data);
    Log.getLog().info("SF2: loading sf2 data; size = " + sf2.byteLength);
    try {
        this.riff = SoundFont2._readChunk(SoundFont2._FORMAT, sf2);
        Log.getLog().info("SF2: loaded.");
        Log.getLog().info(this.riff);
        var info = this.riff[SoundFont2._FOURCC_SFBK][SoundFont2._FOURCC_INFO];
        var version = info[SoundFont2._FOURCC_IFIL];
        Log.getLog().info("SF2: Version " + version.major + "." +
                version.minor);
        Log.getLog().info("SF2: SoundEngine " + info[SoundFont2._FOURCC_ISNG]);
        Log.getLog().info("SF2: Name " + info[SoundFont2._FOURCC_INAM]);
        return true;
    } catch (e) {
        // TODO
        Log.getLog().error(e);
    }
    return false;
};

exports.SoundFont2 = SoundFont2;
