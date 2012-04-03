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

/**
 * Load SoundFont2 of ArrayBuffer.
 * @param data ArrayBuffer containing SoundFont2
 */
SoundFont2.prototype.load = function (data) {
    var sf2 = new Uint8Array(data);
    Log.getLog().info("SF2: loading sf2 data; size = " + sf2.byteLength);
};

exports.SoundFont2 = SoundFont2;
