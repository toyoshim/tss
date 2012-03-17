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
        { enable: false, timer: 0, count: 0, self: null, callback: null },
        { enable: false, timer: 0, count: 0, self: null, callback: null }
    ];
    this.maxChannel = 0;
    this.wave = [];
    for (var i = 0; i < 256; i++)
        this.wave = new Uint8Array(0);
}

TssChannel.MODULE_CHANNEL_L = 0;
TssChannel.MODULE_CHANNEL_R = 1;
TssChannel._FM_OUT_MODE_OFF = 0;
TssChannel._FM_OUT_MODE_ADD = 1;
TssChannel._FM_OUT_MODE_NEW = 2;
TssChannel._SIN_TABLE = new Int8Array(256);

// Calculate tables.
(function () {
    for (var i = 0; i < 256; i++)
        TssChannel._SIN_TABLE[i] = ~~(Math.sin(Math.PI * i / 128) * 64);
})();

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
        var timerCount = length >> 2;
        var timerId;
        for (timerId = 0; timerId < 2; timerId++) {
            if (this.timer[timerId].enable &&
                    (this.timer[timerId].count < timerCount))
                timerCount = this.timer[timerId].count;
        }
        var generateCount = timerCount << 2;
        this._generateInternal(offset, generateCount);
        offset += generateCount;
        for (timerId = 0; timerId < 2; timerId++) {
            if (!this.timer[timerId].enable)
                continue;
            this.timer[timerId].count -= timerCount;
            if (0 != this.timer[timerId].count)
                continue;
            this.timer[timerId].count = this.timer[timerId].timer;
            this.timer[timerId].callback.apply(this.timer[timerId].self);
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
TssChannel.prototype.setTimerCallback = function (id, count, self, callback) {
    if (id > 2)
        return;
    if ((null != callback) && (count <= 0))
        return;
    this.timer[id] = {
        enable: null != callback,
        timer: count,
        count: count,
        self: self,
        callback: callback
    };
};

/**
 * Set module frequency.
 * @param id module id
 * @param frequency frequency
 */
TssChannel.prototype.setModuleFrequency = function (id, frequency) {
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return;
    }
    this.module[id].frequency = frequency;
};

/**
 * Set module volume.
 * @param id module id
 * @param ch channel
 * @param volume volume
 */
TssChannel.prototype.setModuleVolume = function (id, ch, volume) {
    Log.getLog().info("TSC: Volume " + id + " = " + ch + ", " + volume);
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return;
    }
    if (ch == TssChannel.MODULE_CHANNEL_L)
        this.module[id].volume.l = volume;
    else if (ch == TssChannel.MODULE_CHANNEL_R)
        this.module[id].volume.r = volume;
    else
        Log.getLog().error("TSC: Invalid volume channel: " + ch);
};

/**
 * Set module device type
 * @param id module id
 * @param type device type id
 */
TssChannel.prototype.setModuleType = function (id, type) {
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return;
    }
    this.module[id].setType(type);
};

/**
 * Get module device type
 * @param id module id
 * @return device type id
 */
TssChannel.prototype.getModuleType = function (id) {
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return TssChannel.Module.TYPE_INVALID;
    }
    return this.module[id].type;
};

TssChannel.prototype.setModuleFmInPipe = function (id, rate, pipe) {
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return TssChannel.Module.TYPE_INVALID;
    }
    this.module[id].setFmInPipe(rate, pipe);
};

TssChannel.prototype.setModuleFmOutPipe = function (id, mode, pipe) {
    if (id > this.maxChannel) {
        Log.getLog().error("TSC: Invalid module channel: " + id);
        return TssChannel.Module.TYPE_INVALID;
    }
    this.module[id].setFmOutPipe(mode, pipe);
};

/**
 * Generate sounds into a partial buffer.
 * @param offset offset in buffer to start
 * @param count sie to generate
 */
TssChannel.prototype._generateInternal = function (offset, count) {
    var buffer = this.buffer.subarray(offset, offset + count);
    var fmBuffer = [
        this.fmBuffer[0].subarray(offset, offset + count),
        this.fmBuffer[1].subarray(offset, offset + count),
        this.fmBuffer[2].subarray(offset, offset + count),
        this.fmBuffer[3].subarray(offset, offset + count)
    ];
    for (var i = 0; i < count; i++) {
        buffer[i] = 0;
        fmBuffer[0][i] = 0;
        fmBuffer[1][i] = 0;
        fmBuffer[2][i] = 0;
        fmBuffer[3][i] = 0;
    }
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
        inRate: 0,
        inPipe: 0,
        outMode: 0,
        outPipe: 0
    };
    this.multiple = 1;
    this.setType(TssChannel.Module.TYPE_PSG);
};

TssChannel.Module.TYPE_INVALID = -1;
TssChannel.Module.TYPE_PSG = 0;
TssChannel.Module.TYPE_FC = 1;
TssChannel.Module.TYPE_NOISE = 2;
TssChannel.Module.TYPE_SIN = 3;
TssChannel.Module.TYPE_SCC = 4;
TssChannel.Module.TYPE_OSC = 5;
TssChannel.Module.TYPE_GB_SQUARE = 13;
TssChannel.Module.TYPE_GB_WAVE = 14;

/**
 * Set module device type.
 * @param type device type id
 */
TssChannel.Module.prototype.setType = function (type) {
    this.type = type;
    this.count = 0;
    this.phase = 0;
    this.voice = 0;
    switch (type) {
        case TssChannel.Module.TYPE_PSG:
            this.generate = this.generatePsg;
            break;
        case TssChannel.Module.TYPE_SIN:
            this.generate = this.generateSin;
            break;
        default:
            // TODO: Implement other types.
            this.generate = this.generatePsg;
            break;
    }
};

TssChannel.Module.prototype.setFmInPipe = function (rate, pipe) {
    this.fm.inRate = rate;
    this.fm.inPipe = pipe;
};

TssChannel.Module.prototype.setFmOutPipe = function (mode, pipe) {
    this.fm.outMode = mode;
    this.fm.outPipe = pipe;
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

/**
 * Generate a Sine wave sound.
 * @param buffer Int32Array to which generate sound
 * @param fmBuffer Int32Array to which output fm data, or from which input one
 */
TssChannel.Module.prototype.generateSin = function (buffer, fmBuffer) {
    var out = buffer;
    if (TssChannel._FM_OUT_MODE_OFF != this.fm.outMode)
        out = fmBuffer[this.fm.outPipe];
    var volumeL = this.volume.l >> 1;
    var volumeR = this.volume.r >> 1;
    var length = buffer.length;
    var plus = this.frequency * 256 * this.multiple;
    var count = this.count;
    var phase = this.phase;
    var i;
    if (0 == this.fm.inRate) {
        if (TssChannel._FM_OUT_MODE_NEW == this.fm.outMode) {
            for (i = 0; i < length; i += 2) {
                out[i + 0] = TssChannel._SIN_TABLE[phase] * volumeL;
                out[i + 1] = TssChannel._SIN_TABLE[phase] * volumeR;
                count += plus;
                while (count > MasterChannel.SAMPLE_FREQUENCY) {
                    count -= MasterChannel.SAMPLE_FREQUENCY;
                    phase++;
                    phase &= 0xff;
                }
            }
        } else {
            for (i = 0; i < length; i += 2) {
                out[i + 0] += TssChannel._SIN_TABLE[phase] * volumeL;
                out[i + 1] += TssChannel._SIN_TABLE[phase] * volumeR;
                count += plus;
                while (count > MasterChannel.SAMPLE_FREQUENCY) {
                    count -= MasterChannel.SAMPLE_FREQUENCY;
                    phase++;
                    phase &= 0xff;
                }
            }
        }
    } else {
        var fm = fmBuffer[this.fm.inPipe];
        var inRate = this.fm.inRate;
        var fmPhaseL;
        var fmPhaseR;
        if (TssChannel._FM_OUT_MODE_NEW == this.fm.outMode) {
            for (i = 0; i < length; i += 2) {
                fmPhaseL = (phase + (fm[i + 0] >> inRate)) & 0xff;
                fmPhaseR = (phase + (fm[i + 1] >> inRate)) & 0xff;
                out[i + 0] = TssChannel._SIN_TABLE[fmPhaseL] * volumeL;
                out[i + 1] = TssChannel._SIN_TABLE[fmPhaseR] * volumeR;
                count += plus;
                while (count > MasterChannel.SAMPLE_FREQUENCY) {
                    count -= MasterChannel.SAMPLE_FREQUENCY;
                    phase++;
                    phase &= 0xff;
                }
            }
        } else {
            for (i = 0; i < length; i += 2) {
                fmPhaseL = (phase + (fm[i + 0] >> inRate)) & 0xff;
                fmPhaseR = (phase + (fm[i + 1] >> inRate)) & 0xff;
                out[i + 0] += TssChannel._SIN_TABLE[fmPhaseL] * volumeL;
                out[i + 1] += TssChannel._SIN_TABLE[fmPhaseR] * volumeR;
                count += plus;
                while (count > MasterChannel.SAMPLE_FREQUENCY) {
                    count -= MasterChannel.SAMPLE_FREQUENCY;
                    phase++;
                    phase &= 0xff;
                }
            }
        }
    }
    this.count = count;
    this.phase = phase;
};