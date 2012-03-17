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
    this.fmBuffer = [ null, null, null, null ];
    this.player = null;
    this.module = [];
    this.timer = [
        { enable: false, timer: 0, count: 0, callback: null },
        { enable: false, timer: 0, count: 0, callback: null }
    ];
    this.maxChannel = 0;
    this.wave = [];
    for (var i = 0; i < 256; i++)
        this.wave = new Uint8Array(0);
}

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
TssChannel.prototype.setBufferLength = function (length) {
    this.buffer = new Int32Array(length);
    for (var i = 0; i < 4; i++) {
        this.fmBuffer[i] = new Int32Array(length);
    }
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
    var offset = 0;
    while (offset < length) {
        var timerCount = length >> 1;  // from buffer count to sampling count
        var timerId;
        for (timerId = 0; timerId < 2; timerId++) {
            if (this.timer[timerId].enable &&
                    (this.timer[timerId].count < timerCount))
                timerCount = this.timer[timerId].count;
        }
        var generateCount = timerCount << 1; // back to buffer count
        this._generateInternal(offset, generateCount);
        offset += generateCount;
        for (timerId = 0; timerId < 2; timerId++) {
            if (!this.timer[timerId].enable)
                continue;
            this.timer[timerId].count -= timerCount;
            if (0 != this.timer[timerId].count)
                continue;
            this.timer[timerId].count = this.timer[timerId].timer;
            this.timer[timerId].callback();
        }
    }
};

/**
 * Set max channel number.
 * @param maxChannel max channel number
 */
TssChannel.prototype.setMaxChannel = function (maxChannel) {
    this.maxChannel = maxChannel;
    for (var ch = 0; ch < maxChannel; ch++)
        this.module[ch] = new TssChannel.Module(this);
};

/**
 * Set wave data.
 * @param id table id
 * @param wave wave data of Uint8Array
 */
TssChannel.prototype.setWave = function (id, wave) {
    this.wave[id] = wave;
};

/**
 * Set timer callback. Timer will be disabled if callback is null.
 * @param id timer id which must be 0 or 1
 * @param count timer count by sampling number
 * @param callback callback function
 */
TssChannel.prototype.setTimerCallback = function (id, count, callback) {
    if (id > 2)
        return;
    if ((null != callback) && (count <= 0))
        return;
    this.timer[id] = {
        enable: null != callback,
        timer: count,
        count: count,
        callback: callback
    };
};

TssChannel.prototype._generateInternal = function (offset, count) {
    var buffer = this.buffer.subarray(offset, offset + count);
    var fmBuffer = [
        this.fmBuffer[0].subarray(offset, offset + count),
        this.fmBuffer[1].subarray(offset, offset + count),
        this.fmBuffer[2].subarray(offset, offset + count),
        this.fmBuffer[3].subarray(offset, offset + count)
    ];
    for (var i = 0; i < count; i++)
        buffer[i] = 0;
    for (var ch = 0; ch < this.maxChannel; ch++)
        this.module[ch].generate(buffer, fmBuffer);
};

/**
 * Module prototype
 *
 * This prototype implements inner class to emulate sound devices.
 * @param channel parent channel object
 */
TssChannel.Module = function (channel) {
    this.channel = channel;
    this.volume = {
        l: 0,
        r: 0
    };
    this.frequency = 0;
    this.fm = {
        in: {
            depth: 0,
            channel: 0
        },
        out: {
            depth: 0,
            channel: 0
        }
    };
    this.multiple = 0;
    this.setType(TssChannel.Module.TYPE_PSG);
};

TssChannel.Module.TYPE_PSG = 0;
TssChannel.Module.TYPE_FC = 1;
TssChannel.Module.TYPE_NOISE = 2;
TssChannel.Module.TYPE_SIN = 3;
TssChannel.Module.TYPE_SCC = 4;
TssChannel.Module.TYPE_OSC = 5;
TssChannel.Module.TYPE_GB_SQUARE = 13;
TssChannel.Module.TYPE_GB_WAVE = 14;

TssChannel.Module.prototype.setType = function (type) {
    this.type = type;
    this.count = 0;
    this.phase = 0;
    this.voice = 0;
    switch (type) {
        case TssChannel.Module.TYPE_PSG:
            this.generate = this.generatePsg;
            break;
        default:
            // TODO: Implement other types.
            this.generate = this.generatePsg;
            break;
    }
};

/**
 * Generate a PSG-like sound.
 * @param buffer Int32Array to which generate sound
 * @param fmBuffer Int32Array to which output fm data, or from which input one
 */
TssChannel.Module.prototype.generatePsg = function (buffer, fmBuffer) {
    var volumeL = this.volume.l << 4;
    var volumeR = this.volume.r << 4;
    var length = buffer.length;
    var plus = this.frequency * 2 * this.multiple;
    var count = this.count;
    var phase = this.phase;
    if (0 == phase) {
        volumeL = -volumeL;
        volumeR = -volumeR;
    }
    for (var i = 0; i < length; i += 2) {
        buffer[i + 0] += volumeL;
        buffer[i + 1] += volumeR;
        count += plus;
        while (count > MasterChannel.SAMPLE_FREQUENCY) {
            volumeL = -volumeL;
            volumeR = -volumeR;
            count -= MasterChannel.SAMPLE_FREQUENCY;
            phase++;
            phase &= 1;
        }
    }
    this.count = count;
    this.phase = phase;
};