/**
 * T'SoundSystem for JavaScript
 */

/**
 * SlaveChannel prototype
 *
 * This prototype implements simple fixed frequency slave channel.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function SimpleSlaveChannel (frequency) {
    this.buffer = null;
    this.freq = frequency;
    this.phase = 0;
    this.data = this.DEFAULT_VOLUME;
}

SimpleSlaveChannel.DEFAULT_VOLUME = 4096;

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
SimpleSlaveChannel.prototype.setBufferLength = function (length) {
    this.buffer = new Int32Array(length);
}

/**
 * @see MasterChannel
 * @return audio stream buffer
 */
SimpleSlaveChannel.prototype.getBuffer = function () {
    return this.buffer;
}

/**
 * Generate specified length sound stream into internal buffer.
 * @see MasterChannel
 * @param length sound length in short to generate
 */
SimpleSlaveChannel.prototype.generate = function (length) {
    for (var i = 0; i < length; i += 2) {
        this.phase += this.freq * 2;
        if (this.phase > MasterChannel.SAMPLE_FREQUENCY) {
            this.phase -= MasterChannel.SAMPLE_FREQUENCY;
            this.data = -this.data;
        }
        this.buffer[i + 0] = this.data;
        this.buffer[i + 1] = this.data;
    }
}
