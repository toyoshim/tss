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
    this.versionTag = { major: 0, minor: 0 };
    this.soundEngine = "";
    this.name = "";
}

SoundFont2._FOURCC_RIFF = 'RIFF';
SoundFont2._FOURCC_SFBK = 'sfbk';  // SounfFont block
SoundFont2._FOURCC_LIST = 'LIST';
SoundFont2._FOURCC_INFO = 'INFO';  // Supplemental Information
SoundFont2._FOURCC_SDTA = 'sdta';  // The Sample Binary Data
SoundFont2._FOURCC_PDTA = 'pdta';  // The Preset, Instrument, and Sample
                                   // Header Data
SoundFont2._FOURCC_IFIL = 'ifil';  // Refers to the version of the Sound Font
                                   // RIFF File
SoundFont2._FOURCC_ISNG = 'isng';  // Refers to the target Sound Engine
SoundFont2._FOURCC_INAM = 'INAM';  // Refers to the Sound Font Bank Name
// TODO: irom, iver, ICRD, IENG, IPRD, ICOP, ICMT, and ISFT
SoundFont2._FOURCC_SMPL = 'smpl';  // The Digital Audio Samples
SoundFont2._FOURCC_PHDR = 'phdr';  // The Preset Headers
SoundFont2._FOURCC_PBAD = 'pbag';  // The Preset Index List
SoundFont2._FOURCC_PMOD = 'pmod';  // The Preset Modulator List
SoundFont2._FOURCC_PGEN = 'pgen';  // The Preset Generator List
SoundFont2._FOURCC_INST = 'inst';  // The Instrument Names and Indices
SoundFont2._FOURCC_IBAG = 'ibag';  // The Instrument Index List
SoundFont2._FOURCC_IMOD = 'imod';  // The Instrument Modulator List
SoundFont2._FOURCC_IGEN = 'igen';  // The Instrument Generator List
SoundFont2._FOURCC_SHDR = 'shdr';  // The Sample Headers

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

SoundFont2._readChunk = function (array, offset) {
    var id = SoundFont2._readFCC(array, offset);
    var size = SoundFont2._readU32(array, offset + 4);
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

/**
 * Load SoundFont2 of ArrayBuffer.
 * @param data ArrayBuffer containing SoundFont2
 */
SoundFont2.prototype.load = function (data) {
    var sf2 = new Uint8Array(data);
    Log.getLog().info("SF2: loading sf2 data; size = " + sf2.byteLength);

    // Check RIFF File Format.
    Log.getLog().info("SF2: checking RIFF");
    var riff = SoundFont2._readChunk(sf2, 0);
    if ((SoundFont2._FOURCC_RIFF != riff.id) ||
            (riff.nextOffset != sf2.byteLength)) {
        Log.getLog().error("SF2: broken RIFF file");
        return false;
    }
    
    // Check SoundFont 2 RIFF File Format Level 0.
    Log.getLog().info("SF2: checking level 0");
    var sfbk = SoundFont2._readFCC(riff.data, 0);
    if (SoundFont2._FOURCC_SFBK != sfbk) {
        Log.getLog().error("SF2: RIFF file has wrong magic " + sfbk);
        return false;
    }
    var chunk;
    var offset;
    var info = null;
    var sdta = null;
    var pdta = null;
    for (offset = 4; offset < riff.data.byteLength;
            offset = chunk.nextOffset) {
        chunk = SoundFont2._readChunk(riff.data, offset);
        if (SoundFont2._FOURCC_LIST != chunk.id) {
            Log.getLog().error("SF2: level 0 contains wrong magic " +
                    chunk.id);
        }
        var list = SoundFont2._readFCC(chunk.data, 0);
        if (SoundFont2._FOURCC_INFO == list)
            info = chunk.data;
        else if (SoundFont2._FOURCC_SDTA == list)
            sdta = chunk.data;
        else if (SoundFont2._FOURCC_PDTA == list)
            pdta = chunk.data;
        else
            Log.getLog().warn("SF2: level 0 contains unknown chunk " + list);
    }
    if (!info || !sdta || !pdta) {
        Log.getLog().error("SF2: level 0 miss mandatory chunk");
        return false;
    }

    // Check SoundFont 2 RIFF File Format Level 1.
    var ifil = null;
    var isng = null;
    var inam = null;
    Log.getLog().info("SF2: checking level 1 INFO chunk");
    for (offset = 4; offset < info.byteLength;
            offset = chunk.nextOffset) {
        chunk = SoundFont2._readChunk(info, offset);
        if (SoundFont2._FOURCC_IFIL == chunk.id)
            ifil = chunk.data;
        else if (SoundFont2._FOURCC_ISNG == chunk.id)
            isng = chunk.data;
        else if (SoundFont2._FOURCC_INAM == chunk.id)
            inam = chunk.data;
        else  // TODO: irom, iver, ICRD, IENG, IPRD, ICOP, ICMT, and ISFT
            Log.getLog().info("SF2: ignore optional chunk " + chunk.id);
    }
    if (!ifil || !isng || !inam) {
        Log.getLog().error("SF2: level 1 INFO miss mandatory chunk");
        return false;
    }
    
    Log.getLog().info("SF2: checking level 1 sdta chunk");
    var smpl = null;
    for (offset = 4; offset < sdta.byteLength; offset = chunk.nextOffset) {
        chunk = SoundFont2._readChunk(sdta, offset);
        if (SoundFont2._FOURCC_SMPL != chunk.id) {
            Log.getLog().warn("SF2: unknown chunk " + chunk.id);
            return false;
        }
        smpl = chunk.data;
    }
    
    Log.getLog().info("SF2: checking level 1 pdta chunk");
    for (offset = 4; offset < pdta.byteLength; offset = chunk.nextOffset) {
        chunk = SoundFont2._readChunk(pdta, offset);
        Log.getLog().info("SF2: ignore chunk " + chunk.id);
    }
    
    // Check SoundFont 2 RIFF File Format Level 2 and 3.
    Log.getLog().info("SF2: checking level 2 and 3");
    this.versionTag = {
        major: SoundFont2._readU16(ifil, 0),
        minor: SoundFont2._readU16(ifil, 2)
    };
    Log.getLog().info("SF2: VersionTag " + this.versionTag.major + "." +
            this.versionTag.minor);
    this.soundEngine = TString.createFromUint8Array(isng).toString();
    Log.getLog().info("SF2: SoundEngine " + this.soundEngine);
    this.name = TString.createFromUint8Array(inam).toString();
    Log.getLog().info("SF2: Name " + this.name);

    return true;
};

exports.SoundFont2 = SoundFont2;
