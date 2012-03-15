/**
 * T'SoundSystem for JavaScript
 */

/**
 * TssChannel prototype
 *
 * This prototype implements virtual sound devices which are used in
 * original T'SS v1 series.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function TssChannel () {
    this.buffer = null;
    this.player = null;
    this.maxChannel = 0;
}

TssChannel.DEFAULT_VOLUME = 1024;

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
TssChannel.prototype.setBufferLength = function (length) {
    this.buffer = new Int32Array(length);
};

/**
 * @see MasterChannel
 * @return audio stream buffer
 */
TssChannel.prototype.getBuffer = function () {
    return this.buffer;
};

/**
 * Set player object to control devices periodically.
 * @param newPlayer player to call back
 */
TssChannel.prototype.setPlayer = function (newPlayer) {
    this.player = newPlayer;
};

/**
 * Generate specified length sound stream into internal buffer.
 * @see MasterChannel
 * @param length sound length in short to generate
 */
TssChannel.prototype.generate = function (length) {
};

/**
 * Set max channel number.
 * @param maxChannel max channel number
 */
TssChannel.prototype.setMaxChannel = function (maxChannel) {
    this.maxChannel = maxChannel;
};
