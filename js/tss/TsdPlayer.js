/**
 * T'SoundSystem for JavaScript
 */

/**
 * TsdPlayer prototype
 *
 * Play TSD format files.
 * TODO: Must calcurate various tables on load.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function TsdPlayer () {
    this.master = null;
    this.device = null;
    this.input = null;
    this.header = null;
    this.channel = null;
    this.activeChannel = 0;
    this.table = [];
    for (var i = 0; i < 256; i++)
        this.table[i] = new Uint8Array(0);
}

TsdPlayer.VERSION = 0.93;
TsdPlayer._DEFAULT_TIMER_COUNT = 368;
TsdPlayer._TIMER_AUTOMATION = 0;
TsdPlayer._TIMER_SEQUENCER = 1;
TsdPlayer._CH_L = TssChannel.MODULE_CHANNEL_L;
TsdPlayer._CH_R = TssChannel.MODULE_CHANNEL_R;
TsdPlayer._PAN_L = 1;
TsdPlayer._PAN_R = 2;
TsdPlayer._PAN_C = TsdPlayer._PAN_L | TsdPlayer._PAN_R;
TsdPlayer._FREQUENCY_TYPE_NORMAL = 0;
TsdPlayer._FREQUENCY_TYPE_MSX = 1;
TsdPlayer._FREQUENCY_TYPE_FM = 2;
TsdPlayer._FREQUENCY_TYPE_GB_SQUARE = 3;
TsdPlayer._VOLUME_TYPE_NORMAL = 0;
TsdPlayer._VOLUME_TYPE_FM = 1;
TsdPlayer._CMD_LAST_NOTE = 0x7f;
TsdPlayer._CMD_NOTE_OFF = 0x80;
TsdPlayer._CMD_VOLUME_MONO = 0x81;
TsdPlayer._CMD_SUSTAIN_MODE = 0x82;
TsdPlayer._CMD_DETUNE = 0x83;
TsdPlayer._CMD_PORTAMENT = 0x84;
TsdPlayer._CMD_VOLUME_LEFT = 0x85;
TsdPlayer._CMD_VOLUME_RIGHT = 0x86;
TsdPlayer._CMD_PANPOT = 0x87;
TsdPlayer._CMD_RELATIVE_VOLUME_UP = 0x88;
TsdPlayer._CMD_RELATIVE_VOLUME_DOWN = 0x89;
TsdPlayer._CMD_TEMPO = 0x90;
TsdPlayer._CMD_FINENESS = 0x91;
TsdPlayer._CMD_KEY_ON_PHASE = 0x92;
TsdPlayer._CMD_MULTIPLE = 0x93;
TsdPlayer._CMD_PITCH_MODULATION_DELAY = 0xa0;
TsdPlayer._CMD_PITCH_MODULATION_DEPTH = 0xa1;
TsdPlayer._CMD_PITCH_MODULATION_WIDTH = 0xa2;
TsdPlayer._CMD_PITCH_MODULATION_HEIGHT = 0xa3;
TsdPlayer._CMD_PITCH_MODULATION_DELTA = 0xa4;
TsdPlayer._CMD_AMP_EMVELOPE = 0xb8;
TsdPlayer._CMD_NOTE_EMVELOPE = 0xc8;
TsdPlayer._CMD_ENDLESS_LOOP_POINT = 0xe0;
TsdPlayer._CMD_LOCAL_LOOP_START = 0xe1;
TsdPlayer._CMD_LOCAL_LOOP_BREAK = 0xe2;
TsdPlayer._CMD_LOCAL_LOOP_END = 0xe3;
TsdPlayer._CMD_PITCH_MODE_CHANGE = 0xf0;
TsdPlayer._CMD_VOLUME_MODE_CHANGE = 0xf1;
TsdPlayer._CMD_FM_IN = 0xf8;
TsdPlayer._CMD_FM_OUT = 0xf9;
TsdPlayer._CMD_VOICE_CHANGE = 0xfd;
TsdPlayer._CMD_MODULE_CHANGE = 0xfe;
TsdPlayer._CMD_END = 0xff;
TsdPlayer._NOTE_FREQUENCY_TABLE = [ null, null, null, null ];
TsdPlayer._NOTE_PARAMETER_TABLE = [ null, null, null, null ];
TsdPlayer._PARAMETER_FREQUENCY_TABLE = [ null, null,null, null ];
TsdPlayer._FM_VOLUME_TABLE = null;
TsdPlayer._MSX_PARAMETER_TABLE = [
    0x0D5D, 0x0C9C, 0x0BE7, 0x0B3C, 0x0A9B, 0x0A02, 0x0973, 0x08EB,
    0x086B, 0x07F2, 0x0780, 0x0714, 0x06AF, 0x064E, 0x05F4, 0x059E,
    0x054E, 0x0501, 0x04BA, 0x0476, 0x0436, 0x03F9, 0x03C0, 0x038A,
    0x0357, 0x0327, 0x02FA, 0x02CF, 0x02A7, 0x0281, 0x025D, 0x023B,
    0x021B, 0x01FD, 0x01E0, 0x01C5, 0x01AC, 0x0194, 0x017D, 0x0168,
    0x0153, 0x0140, 0x012E, 0x011D, 0x010D, 0x00FE, 0x00F0, 0x00E3,
    0x00D6, 0x00CA, 0x00BE, 0x00B4, 0x00AA, 0x00A0, 0x0097, 0x008F,
    0x0087, 0x007F, 0x0078, 0x0071, 0x006B, 0x0065, 0x005F, 0x005A,
    0x0055, 0x0050, 0x004C, 0x0047, 0x0043, 0x0040, 0x003C, 0x0039,
    0x0035, 0x0032, 0x0030, 0x002D, 0x002A, 0x0028, 0x0026, 0x0024,
    0x0022, 0x0020, 0x001E, 0x001C, 0x001B, 0x0019, 0x0018, 0x0016,
    0x0015, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E
];

// Calculate tables.
(function () {
    var i;

    // from note to frequency table for NORMAL mode
    var table = new Uint16Array(0x80);
    TsdPlayer._NOTE_FREQUENCY_TABLE[TsdPlayer._FREQUENCY_TYPE_NORMAL] = table;
    for (i = 0; i < 0x80; i++)
        table[i] = ~~(440 * Math.pow(2, (i - 69) / 12) + 0.5);

    // from note to frequency table for GB_SQUARE mode
    table = new Uint16Array(0x80);
    TsdPlayer._NOTE_FREQUENCY_TABLE[TsdPlayer._FREQUENCY_TYPE_GB_SQUARE] =
            table;
    for (i = 0; i < 0x80; i++) {
        var frequency = 440 * Math.pow(2, (i - 69) / 12);
        var param = 2048 - 131072 / frequency + 0.5;
        if (param < 0)
            param = 0;
        table[i] = param;
    }

    // from note to parameter table for MSX mode
    table = new Uint16Array(0x80);
    TsdPlayer._NOTE_PARAMETER_TABLE[TsdPlayer._FREQUENCY_TYPE_MSX] = table;
    for (i = 0; i < 12; i++)
        table[i] = 0;
    for (i = 12; i < 108; i++)
        table[i] = TsdPlayer._MSX_PARAMETER_TABLE[i - 12];
    for (i = 108; i < 128; i++)
        table[i] = 0;

    // from parameter to frequency table for MSX mode
    table = new Uint16Array(4096);
    TsdPlayer._PARAMETER_FREQUENCY_TABLE[TsdPlayer._FREQUENCY_TYPE_MSX] =
            table;
    table[0] = 0;
    for (i = 1; i < 4096; i++)
        table[i] = ~~((1.7897725e+6 / 16 / i / 2) + 0.5);

    // from parameter to frequency table for FM mode
    table = new Uint16Array(0x2000);
    TsdPlayer._PARAMETER_FREQUENCY_TABLE[TsdPlayer._FREQUENCY_TYPE_FM] = table;
    for (i = 0; i < 0x2000; i++) {
        var tone = i >> 6;
        var fine = i & 0x3f;
        var power = ((tone - 69) + fine / 64) / 12;
        table[i] = ~~(440 * Math.pow(2, power) + 0.5);
    }

    // volume table for FM mode
    table = new Uint8Array(256);
    TsdPlayer._FM_VOLUME_TABLE = table;
    for (i = 0; i < 256; i++)
        table[i] = ~~(255 * Math.pow(10, -0.75 * (255 - i) / 2 / 20) + 0.5);
})();

/**
 * Set master channel. This function prepares required device channel and
 * connect it player and master channel.
 * @param channel master channel
 */
TsdPlayer.prototype.setMasterChannel = function (channel) {
    this.device = new TssChannel();
    this.device.setPlayer(this);
    channel.clearChannel();
    channel.addChannel(this.device);
    this.master = channel;
};

/**
 * Compare input data with offset and string.
 * @param offset offset at input data to be compared
 * @param string string to be compared
 */
TsdPlayer.prototype._compareWithString = function (offset, string) {
    var length = string.length;
    for (var i = 0; i < length; i++) {
        if (string.charCodeAt(i) != this.input[offset + i])
            return false;
    }
    return (0 == this.input[offset + length]);
};

/**
 * Build string object from a part from input data.
 * @param offset offst at input data to be used
 * @param size data size to be used
 */
TsdPlayer.prototype._buildString = function (offset, size) {
    var result = "";
    var first = true;
    var length = 1;
    var value = 0;
    for (var i = 0; (i < size) && (i < this.input.length); i++) {
        var c = this.input[offset + i];
        if (first) {
            if (c < 0x80) {
                // 1 Byte UTF-8 string
                result += String.fromCharCode(c);
                continue;
            }
            first = false;
            if (c < 0xc2) {
                // Invalid character
                throw TypeError("Invalid UTF-8");
            } else if (c < 0xe0) {
                // 2 Bytes UTF-8 string
                length = 2;
                value = c & 0x1f;
            } else if (c < 0xf0) {
                // 3 Bytes UTF-8 string
                length = 3;
                value = c & 0x0f;
            } else if (c < 0xf8) {
                // 4 Bytes UTF-8 string
                length = 4;
                value = c & 0x07;
            } else if (c < 0xfc) {
                // 5 Bytes UTF-8 string
                length = 5;
                value = c & 0x03;
            } else if (c < 0xfe) {
                // 6 Bytes UTF-8 string
                length = 6;
                value = c & 0x01;
            } else {
                // Invalid character
                throw TypeError("Invalid UTF-8");
            }
            length--;
        } else {
            if ((c < 0x80) || (0xbf < c)) {
                // Invalid character
                throw TypeError("Invalid UTF-8");
            }
            value = (value << 6) | (c & 0x3f);
            length--;
            if (0 == length) {
                first = true;
                if ((value < 0xd800) || (0xe000 <= value)) {
                    result += String.fromCharCode(value);
                } else {
                    var u = (value >> 16) & 0x1f;
                    var w = u - 1;
                    var x = value & 0xffff;
                    result += String.fromCharCode(
                            0xd800 + (w << 6) + (x >> 10));
                    result += String.fromCharCode(0xdc00 + (x & 0x3ff));
                }
            }
        }
    }
    if(!first) {
        throw TypeError("Invalid UTF-8");
    }
    return result;
};

/**
 * Read signed 8bit data from input buffer.
 * @param offset offset to be read
 * @return read data
 */
TsdPlayer.prototype._readI8 = function (offset) {
    var data = this.input[offset];
    if (data >= 0x80)
        data = data - 0x100;
    return data;
};

/**
 * Read unsigned 16bit data from input buffer.
 * @param offset offset to be read
 * @return read data
 */
TsdPlayer.prototype._readU16 = function (offset) {
    return (this.input[offset] << 8) | this.input[offset + 1];
};

/**
 * Read unsigned 32bit data from input buffer.
 * @param offset offset to be read
 * @return read data
 */
TsdPlayer.prototype._readU32 = function (offset) {
    return (this.input[offset] << 24) | (this.input[offset + 1] << 16) |
            (this.input[offset + 2] << 8) | this.input[offset + 3];
};

/**
 * Set table data.
 * @param id table id
 * @param table table data of Uint8Array
 */
TsdPlayer.prototype._setTable = function (id, table) {
    this.table[id] = table;
};

/**
 * Decode and play.
 * @param newInput ArrayBuffer to play
 * @return success or not
 */
TsdPlayer.prototype.play = function (newInput) {
    try {
        this.input = new Uint8Array(newInput);
        this.timerCount = TsdPlayer._DEFAULT_TIMER_COUNT;
        this.fixedCount = TsdPlayer._DEFAULT_TIMER_COUNT;
        if (!this._compareWithString(0, "T'SoundSystem")) {
            Log.getLog().warn("TSD: magic T'SoundSystem not found.");
            return false;
        }
        var header = {};
        // Check version headers.
        header.majorVersion = this.input[14];
        header.minorVersion = this.input[15];
        header.fullVersion = header.majorVersion + header.minorVersion / 100;
        Log.getLog().info("TSD: version = " + header.fullVersion);
        if ((header.fullVersion <= 0.60) ||
                (TsdPlayer.VERSION < header.fullVersion)) {
            Log.getLog().warn("TSD: unsupported format");
            return false;
        }

        // Parse the music title.
        header.titleSize = this._readU16(16);
        header.title = this._buildString(18, header.titleSize);
        Log.getLog().info("TSD: title = " + header.title);

        var offset = 18 + ((header.titleSize + 1) & ~1);
        header.numOfChannel = this._readU16(offset);
        offset += 2;
        Log.getLog().info("TSD: channel = " + header.numOfChannel);
        this.device.setMaxChannel(header.numOfChannel);
        this.header = header;
        this.activeChannel = header.numOfChannel;

        // Parse channel information.
        var channel = [];
        var i;
        for (i = 0; i < header.numOfChannel; i++) {
            channel[i] = {
                id: i,  // module id
                baseOffset: 0,  // offset to sequence data in input buffer
                size: 0,  // sequence data size
                offset: 0,  // current processing offset to sequence data
                loop: {  // loop information
                    offset: 0,  // offset to loop start poit of sequence data
                    count: 0  // current loop count
                },
                localLoop:[],  // inner loop information
                wait: 1,  // wait count to the next processing
                sustain: {  // sustain information
                    level: 0,  // sustain level
                    volume: {  // base volume to start sustain
                        l: 0,
                        r: 0
                    }
                },
                portament: 0,
                detune: 0,
                keyOn: false,
                volume: {
                    type: 0,
                    l: 0,
                    r:0
                },
                pan: TsdPlayer._PAN_C,
                frequency: {
                    type: 0,
                    note: 0,
                    param: 0,
                    hz: 0
                },
                tone: 0,
                phase: 0,
                mp: {
                    enable: false,
                    frequency: 0,
                    delayCount: 0,
                    widthCount: 0,
                    deltaCount: 0,
                    currentDepth: 0,
                    currentHeight: 0,
                    currentDiff: 0,
                    delay: 0,
                    depth: 0,
                    width: 0,
                    height: 0,
                    delta: 0
                },
                na: {
                    enable: false,
                    id: 0,
                    wait: 0,
                    state: 0,
                    count: 0,
                    volume: {
                        l: 0,
                        r: 0
                    }
                },
                nt: {
                    enable: false,
                    id: 0,
                    wait: 0,
                    state: 0,
                    count: 0
                }
            };
            for (var n = 0; n < 16; n++) {
                channel[i].localLoop[n] = {
                    offset: 0,
                    count: 0,
                    end: 0
                };
            }
            channel[i].baseOffset = this._readU32(offset);
            offset += 4;
            channel[i].size = this._readU32(offset);
            offset += 4;
            Log.getLog().info("TSD: ch." + i + " offset = " +
                    channel[i].baseOffset + ", size = " + channel[i].size);
        }
        Log.getLog().info(channel);
        this.channel = channel;

        // Parse table information.
        var numOfWave = this._readU16(offset);
        offset += 2;
        for (i = 0; i < numOfWave; i++) {
            // Wave table data for a SCC-like sound.
            if (32 != this.input[offset + 1]) {
                Log.getLog().error("TSD: Invalid WAVE size");
                return false;
            }
            this.device.setWave(this.input[offset],
                    this.input.subarray(offset + 2, offset + 2 + 32));
            offset += 2 + 32;
        }
        var numOfTable = this._readU16(offset);
        offset += 2;
        for (i = 0; i < numOfTable; i++) {
            // Table data for envelope.
            var tableSize = this.input[offset + 1];
            this._setTable(this.input[offset],
                    this.input.subarray(offset + 2, offset + 2 + tableSize));
            offset += 2 + tableSize;
        }

        // Set timer callbacks
        this.device.setTimerCallback(TsdPlayer._TIMER_AUTOMATION,
                TsdPlayer._DEFAULT_TIMER_COUNT, this, this._performAutomation);
        this.device.setTimerCallback(TsdPlayer._TIMER_SEQUENCER,
                TsdPlayer._DEFAULT_TIMER_COUNT, this, this._performSequencer);
    } catch (e) {
        Log.getLog().error("TSD: " + e);
        return false;
    }
    return true;
};

/**
 * Perform device automation, e.g., sastain, portament, envelope, modulation.
 */
TsdPlayer.prototype._performAutomation = function () {
    for (var i = 0; i < this.header.numOfChannel; i++) {
        var ch = this.channel[i];
        if (!ch.keyOn) {
            // Key off processings.
            if (0 != ch.sustain.level)
                this._performSustain(ch);
            if (0 != ch.portament)
                this._performPortament(ch);
        }
        // TODO: other processings
    }
};

/**
 * Perform sustain.
 * @param ch
 */
TsdPlayer.prototype._performSustain = function (ch) {
    if (ch.sustain.volume.l > ch.sustain.level)
        ch.sustain.volume.l -= ch.sustain.level;
    else
        ch.sustain.volume.l = 0;
    if (ch.sustain.volume.r > ch.sustain.level)
        ch.sustain.volume.r -= ch.sustain.level;
    else
        ch.sustain.volume.r = 0;
    this._setVolume(ch, TsdPlayer._CH_L, ch.sustain.volume.l);
    this._setVolume(ch, TsdPlayer._CH_R, ch.sustain.volume.r);
};

TsdPlayer.prototype._performPortament = function (ch) {
    var frequency = ch.frequency.hz;
    switch (ch.frequency.type) {
        case TsdPlayer._FREQUENCY_TYPE_NORMAL:
            if (ch.frequency.param + ch.portament < 1)
                ch.frequency.param = 1;
            else if (ch.frequency.param + ch.portament > 0xffff)
                ch.frequency.param = 0xffff;
            else
                ch.frequency.param += ch.portament;
            frequency = ch.frequency.param;
            break;
        case TsdPlayer._FREQUENCY_TYPE_MSX:
            if (ch.frequency.param - ch.portament < 0)
                ch.frequency.param = 0;
            else if ((ch.frequency.param - ch.portament) > 0x0fff)
                ch.frequency.param = 0x0fff;
            else
                ch.frequency.param -= ch.portament;
            frequency = TsdPlayer._PARAMETER_FREQUENCY_TABLE[
                    TsdPlayer._FREQUENCY_TYPE_MSX][ch.frequency.param];
            break;
        case TsdPlayer._FREQUENCY_TYPE_FM:
            if (ch.frequency.param + ch.portament < 0)
                ch.frequency.param = 0;
            else if ((ch.frequency.param + ch.portament) > 0x1fff)
                ch.frequency.param = 0x1fff;
            else
                ch.frequency.param += ch.portament;
            frequency = TsdPlayer._PARAMETER_FREQUENCY_TABLE[
                TsdPlayer._FREQUENCY_TYPE_FM][ch.frequency.param];
            break;
        case TsdPlayer._FREQUENCY_TYPE_GB_SQUARE:
            // TODO: not supported originally.
            break;
    }
    this.device.setModuleFrequency(ch.id, frequency);
};

/**
 * Perform sequencer.
 */
TsdPlayer.prototype._performSequencer = function () {
    for (var i = 0; i < this.header.numOfChannel; i++) {
        var ch = this.channel[i];
        if (0 == ch.wait)
            continue;
        if (0 != --ch.wait)
            continue;
        for (;;) {
            var cmd = this.input[ch.baseOffset + ch.offset++];
            var dt;
            if (cmd <= TsdPlayer._CMD_LAST_NOTE) {
                // Note on.
                this._noteOn(ch, cmd);
                ch.wait = this.input[ch.baseOffset + ch.offset++];
                if (0xff == ch.wait) {
                    ch.wait = this._readU16(ch.baseOffset + ch.offset);
                    ch.offset += 2;
                }
                if (0 != ch.wait)
                    break;
            } else if (cmd == TsdPlayer._CMD_NOTE_OFF) {
                // Note off.
                this._noteOff(ch);
                ch.wait = this.input[ch.baseOffset + ch.offset++];
                if (0xff == ch.wait) {
                    ch.wait = this._readU16(ch.baseOffset + ch.offset);
                    ch.offset += 2;
                }
                if (0 != ch.wait)
                    break;
            } else if (cmd == TsdPlayer._CMD_VOLUME_MONO) {
                // Set volume by monaural with the panpot setting.
                dt = this.input[ch.baseOffset + ch.offset++];
                if (ch.pan & TsdPlayer._PAN_L)
                    ch.volume.l = dt;
                if (ch.pan & TsdPlayer._PAN_R)
                    ch.volume.r = dt;
            } else if (cmd == TsdPlayer._CMD_SUSTAIN_MODE) {
                // Set sustain setting.
                ch.sustain.level = this.input[ch.baseOffset + ch.offset++];
            } else if (cmd == TsdPlayer._CMD_DETUNE) {
                // Set detune setting.
                ch.detune = this._readI8(ch.baseOffset + ch.offset);
                ch.offset++;
            } else if (cmd == TsdPlayer._CMD_PORTAMENT) {
                // Set portament setting.
                ch.portament = this._readI8(ch.baseOffset + ch.offset);
                ch.offset++;
                // Pitch modulation is disabled when portament is set.
                ch.mp.enabled = false;
            } else if (cmd == TsdPlayer._CMD_VOLUME_LEFT) {
                ch.offset++;
                Log.getLog().info("TSD: volume left");
                // TODO
            } else if (cmd == TsdPlayer._CMD_VOLUME_RIGHT) {
                ch.offset++;
                Log.getLog().info("TSD: volume right");
                // TODO
            } else if (cmd == TsdPlayer._CMD_PANPOT) {
                ch.pan = this.input[ch.baseOffset + ch.offset++];
            } else if (cmd == TsdPlayer._CMD_TEMPO) {
                dt = this._readU16(ch.baseOffset + ch.offset);
                ch.offset += 2;
                this._setSequencerFineness(dt);
            } else if (cmd == TsdPlayer._CMD_FINENESS) {
                dt = this._readU16(ch.baseOffset + ch.offset);
                ch.offset += 2;
                this._setAutomationFineness(dt);
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_DELAY) {
                dt = this._readU16(ch.baeOffset + ch.offset);
                ch.offset += 2;
                Log.getLog().info("TSD: pm delay");
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_DEPTH) {
                dt = this.input[ch.baseOffset + ch.offset++];
                Log.getLog().info("TSD: pm depth");
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_WIDTH) {
                dt = this.input[ch.baseOffset + ch.offset++];
                Log.getLog().info("TSD: pm width");
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_HEIGHT) {
                dt = this.input[ch.baseOffset + ch.offset++];
                Log.getLog().info("TSD: pm height");
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_DELTA) {
                dt = this.input[ch.baseOffset + ch.offset++];
                Log.getLog().info("TSD: pm delta");
                // TODO
            } else if (cmd == TsdPlayer._CMD_ENDLESS_LOOP_POINT) {
                ch.loop.offset = ch.offset;
            } else if (cmd == TsdPlayer._CMD_VOLUME_MODE_CHANGE) {
                // Set volume mode.
                ch.volume.type = this.input[ch.baseOffset + ch.offset++];
            } else if (cmd == TsdPlayer._CMD_FM_IN) {
                dt = this.input[ch.baseOffset + ch.offset++];
                this._setFmInPipe(ch, dt >> 4, dt & 0x0f);
            } else if (cmd == TsdPlayer._CMD_FM_OUT) {
                dt = this.input[ch.baseOffset + ch.offset++];
                this._setFmOutPipe(ch, dt >> 4, dt & 0x0f);
            } else if (cmd == TsdPlayer._CMD_VOICE_CHANGE) {
                dt = this.input[ch.baseOffset + ch.offset++];
                this._setVoice(ch, dt)
            } else if (cmd == TsdPlayer._CMD_MODULE_CHANGE) {
                // Set module type with frequency mode.
                dt = this.input[ch.baseOffset + ch.offset++];
                this._setModule(ch, dt)
            } else if (cmd == TsdPlayer._CMD_END) {
                if (0 != ch.loop.offset) {
                    // Perform endless loop
                    ch.offset = ch.loop.offset;
                    ch.loop.count++;
                    Log.getLog().info("TSD: ch " + i + " loop");
                } else {
                    // Stop
                    this._noteOff(ch);
                    this.activeChannel--;
                    Log.getLog().info("TSD: ch " + i + " end");
                    break;
                }
            } else {
                Log.getLog().error("TSD: not supported " + cmd.toString(16));
                Log.getLog().info(this);
                break;
            }
        }
    }
};

/**
 * Perform note on.
 * @param ch channel object to control
 * @param note note number
 */
TsdPlayer.prototype._noteOn = function (ch, note) {
    // Set tone frequency.
    var type = ch.frequency.type;
    var param;
    var hz;
    switch (type) {
        case TsdPlayer._FREQUENCY_TYPE_NORMAL:
            param = ch.detune + TsdPlayer._NOTE_FREQUENCY_TABLE[type][note];
            hz = param;
            break;
        case TsdPlayer._FREQUENCY_TYPE_MSX:
            param = ch.detune + TsdPlayer._NOTE_PARAMETER_TABLE[type][note];
            hz = TsdPlayer._PARAMETER_FREQUENCY_TABLE[type][param];
            break;
        case TsdPlayer._FREQUENCY_TYPE_FM:
            param = ch.detune + note << 6;
            hz = TsdPlayer._PARAMETER_FREQUENCY_TABLE[type][param];
            break;
        case TsdPlayer._FREQUENCY_TYPE_GB_SQUARE:
            param = ch.detune + TsdPlayer._NOTE_FREQUENCY_TABLE[type][note];
            hz = param;
            break;
    }
    this.device.setModuleFrequency(ch.id, hz);
    ch.frequency.note = note;
    ch.frequency.param = param;
    ch.frequency.hz = hz;

    // Set volume
    this._setVolume(ch, TsdPlayer._CH_L, ch.volume.l);
    this._setVolume(ch, TsdPlayer._CH_R, ch.volume.r);
    ch.sustain.volume.l = ch.na.volume.l = ch.volume.l;
    ch.sustain.volume.r = ch.na.volume.r = ch.volume.r;

    // Key on
    ch.keyOn = true;

    // TODO: Reset phase.
    // TODO: Reset modulation, envelope, and sastin.
};

/**
 * Perform note off.
 * @param ch channel object to control
 */
TsdPlayer.prototype._noteOff = function (ch) {
    if (0 == ch.sustain.level) {
        // When sustain is disabled,
        if (!ch.na.enable) {
            // and amplifier envelope is also disabled.
            this.device.setModuleVolume(ch.id, TsdPlayer._CH_L, 0);
            this.device.setModuleVolume(ch.id, TsdPlayer._CH_R, 0);
        } else {
            // and amplifier envelope is enabled.
            ch.na.volume.l =
                    this.device.getModuleVolume(ch.id,TsdPlayer._CH_L);
            ch.na.volume.r =
                    this.device.getModuleVolume(ch.id,TsdPlayer._CH_R);
        }
    }
    ch.keyOn = false;
};

/**
 * Set channel base volume in current volume mode with panpot setting.
 * @param ch channel object to control
 * @param lr L/R channel to set
 * @param volume volume to set
 */
TsdPlayer.prototype._setVolume = function (ch, lr, volume) {
    var data = volume;
    if ((TsdPlayer._CH_L == lr) && (0 == (ch.pan & TsdPlayer._PAN_L)))
        data = 0;
    else if ((TsdPlayer._CH_R == lr) && (0 == (ch.pan & TsdPlayer._PAN_R)))
        data = 0;
    else if (TsdPlayer._VOLUME_TYPE_FM == ch.volume.type)
        data = TsdPlayer._FM_VOLUME_TABLE[data];
    this.device.setModuleVolume(ch.id, lr, data);
};

/**
 * Set sequencer timer fineness.
 * @param fineness timer count
 */
TsdPlayer.prototype._setSequencerFineness = function (fineness) {
    Log.getLog().info("TSD: sequencer fineness " + fineness);
    this.device.setTimerCallback(
            TsdPlayer._TIMER_SEQUENCER, fineness, this,
            this._performSequencer);
};

/**
 * Set automation timer fineness.
 * @param fineness timer count
 */
TsdPlayer.prototype._setAutomationFineness = function (fineness) {
    Log.getLog().info("TSD: automation fineness " + fineness);
    this.device.setTimerCallback(
            TsdPlayer._TIMER_AUTOMATION, fineness, this,
            this._performAutomation);
};

/**
 * Set frequency modulation input pipe connection.
 * @see TssChannel.Module.setFmInPipe
 * @param ch channel object to control
 * @param rate input rate
 * @param pipe pipe id
 */
TsdPlayer.prototype._setFmInPipe = function (ch, rate, pipe) {
    Log.getLog().info("TSD: fm in " + ch.id + " = " + rate + ", " + pipe);
    this.device.setModuleFmInPipe(ch.id, rate, pipe);
};

/**
 * Set frequency modulation output pipe connection.
 * @see TssChannel.Module.setFmOutPipe
 * @param ch channel object to control
 * @param mode connection mode
 * @param pipe pipe id
 */
TsdPlayer.prototype._setFmOutPipe = function (ch, mode, pipe) {
    Log.getLog().info("TSD: fm out " + ch.id + " = " + mode + ", " + pipe);
    this.device.setModuleFmOutPipe(ch.id, mode, pipe);
};

/**
 * Set voice of module.
 * @param ch channel object to control
 * @param voice voice id
 */
TsdPlayer.prototype._setVoice = function (ch, voice) {
    Log.getLog().info("TSD: voice " + ch.id + " = " + voice);
    //this.device.setModuleVoice(ch.id, voice);
    if (TssChannel.Module.TYPE_SIN != this.device.getModuleType(ch.id))
        return;
    // Old style FM pipe setting for compatibility.
    var fmIn = voice >> 4;
    var fmOut = voice & 0x0f;
    if (0 != fmIn)
        this._setFmInPipe(ch, 4, (fmIn % 5) - 1);
    else
        this._setFmInPipe(ch, 0, 0);
    if (0 != fmOut)
        this._setFmOutPipe(ch, 1, (fmOut % 5) - 1);
    else
        this._setFmOutPipe(ch, 0, 0);
};

/**
 * Set module device type.
 * @param ch channel object to control
 * @param module module type with frequency mode
 */
TsdPlayer.prototype._setModule = function (ch, module) {
    Log.getLog().info("TSD: module " + ch.id + " = " + module);
    this.device.setModuleType(ch.id, module &0x0f);
    if (0 != (module & 0x80))
        ch.frequency.type = module >> 7;
    else
        ch.frequency.type = module >> 4;
    Log.getLog().info("TSD: frequency type " + ch.id + " = " +
            ch.frequency.type);
};