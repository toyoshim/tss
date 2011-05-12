/**
 * T'SoundSystem for Java
 */

/**
 * MasterChannel prototype
 *
 * This prototype provide main audio generation loop.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function MasterChannel () {
    this.channels = new Array();
    this.buffers = null;
    this.buffer = null;
    this.bufferLength = 0;
    this.player = null;
    this.intervalLength = 0;
    this.intervalRestLength = 0;
    this.volume = MasterChannel.DEFAULT_VOLUME;
}

MasterChannel.SAMPLE_FREQUENCY = 44100;
MasterChannel.MAX_WAVE_VALUE = 32767;
MasterChannel.MIN_WAVE_VALUE = -32767;
MasterChannel.MSEC_PER_SEC = 1000;
MasterChannel.DEFAULT_VOLUME = 8;

/**
 * Reconstruct slave buffer references.
 */
MasterChannel.prototype.reconstructBuffers = function () {
    var newBuffers = new Array(this.channels.length);
    for (var i = 0; i < this.channels.length; i++) {
        newBuffers[i] = this.channels[i].getBuffer();
    }
    this.buffers = newBuffers;
}

/**
 * Set mixing volume.
 * Every device sets maximum volume of each sound channel
 * as one sixteenth to avoid sound saturation.
 * If you want to maximize sounds set sixteen as volume.
 * It is the default value.
 * @param newVolume volume
 */
MasterChannel.prototype.setVolume = function (newVolume) {
    this.volume = newVolume;
}

/**
 * Add channel to audio play back loop.
 * @param channel channel to add
 * @return result
 */
MasterChannel.prototype.addChannel = function (channel) {
    if (0 != this.bufferLength) {
        this.buffers = null;
        this.channel.setBufferLength(this.bufferLength);
        this.reconstructBuffers();
    }
    return channels.push(channel);
}

/**
 * Remove channel from audio play back loop.
 * @param channel channel to remove
 * @return result
 */
MasterChannel.prototype.removeChannel = function (channel) {
    for (var i = 0; i < this.channels.length; i++) {
        if (channel == this.channels[i]) {
            this.buffers = null;
            this.channels.splice(i, 1);
            this.reconstructBuffers();
            return true;
        }
    }
    return false;
}

/**
 * Remove all channels from audio play back loop.
 */
MasterChannel.prototype.clearChannel = function () {
    this.buffers = null;
    this.channels = new Array();
    this.reconstructBuffers();
}

/**
 * Set player object to control devices periodically.
 * @param newPlayer player to call back
 */
MasterChannel.prototype.setPlayer = function (newPlayer) {
    this.player = newPlayer;
}

/**
 * Set time interval to call back player periodically.
 * @param msec time interval
 */
MasterChannel.prototype.setPlayerInterval = function (msec) {
    this.intervalLength = (SAMPLE_FREQUENCY * msec) / MSEC_PER_SEC;
    this.intervalRestLength = this.intervalLength;
}

/**
 * Do partial slave channel audio mixing.
 * @param base base offset to generate
 * @param length buffer length to generate
 */
MasterChannel.prototype.generateInternal = function (base, length) {
    var size = this.channels.length;
    for (var i = 0; i < size; i++) {
        this.channels.generate(length);
    }
    for (var offset = 0; offset < length; offset++) {
        var value = 0;
        for (var channel = 0; channel < size; channel++) {
            value += this.buffers[channel][offset];
        }
        value *= this.volume;
        if (value > MasterChannel.MAX_WAVE_VALUE) {
            value = MasterChannel.MAX_WAVE_VALUE;
        }
        if (value < MasterChannel.MIN_WAVE_VALUE) {
            value = MasterChannel.MIN_WAVE_VALUE;
        }
        this.buffer[base + offset] = value;
    }
}

/**
 * Set internal buffer length.
 * @param length buffer length or size in shorts
 */
MasterChannel.prototype.setBufferLength = function (length) {
    this.buffers = null;
    this.buffer = new Int32Array(length);
    this.bufferLength = length;
    for (var i = 0; i < this.channels.length; i++) {
        this.channels.setBufferLength(length);
    }
    this.reconstructBuffers();
}

/**
 * Get internal buffer.
 * @return audio stream buffer
 */
MasterChannel.prototype.getBuffer = function () {
    return this.buffer;
}

/**
 * Generate audio stream to internal buffer.
 * @param length buffer length or size in shorts to generate audio stream
 */
MasterChannel.prototype.generate = function (length) {
    if (null == this.buffers) {
        return;
    }
    if ((null == this.player) || (0 == this.intervalLength)) {
        this.generateInternal(0, length);
    } else {
        var restLength = length;
        var offset = 0;
        while (restLength > this.intervalRestLength) {
            this.generateInternal(offset, this.intervalRestLength);
            restLength -= this.intervalRestLength;
            offset += this.intervalRestLength;
            this.intervalRestLength = this.intervalLength;
            this.player.updateDevice();
        }
        if (0 != restLength) {
            this.generateInternal(offset, restLength);
            this.intervalRestLength -= restLength;
        }
    }
}
