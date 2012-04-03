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
}

SoundFont2._readU32 = function (array, offset) {
    var i32 = (array[offset + 0] << 24) |
            (array[offset + 1] << 16) |
            (array[offset + 2] << 8) |
            array[offset + 3];
    if (i32 < 0)
        return 0x100000000 + i32;
    return i32;
};

SoundFont2._readChunk = function (array, offset) {
    var id = SoundFont2._readU32(array, offset);
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
    var chunk;
    for (var offset = 0; offset < sf2.byteLength; offset = chunk.nextOffset) {
        var chunk = SoundFont2._readChunk(sf2, offset);
        Log.getLog().info("offset: " + offset);
        Log.getLog().info("size: " + chunk.size);
        Log.getLog().info("next: " + chunk.nextOffset);
        break;
    }
};

exports.SoundFont2 = SoundFont2;
