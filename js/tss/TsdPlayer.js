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
TsdPlayer._CMD_LAST_NOTE = 0x7f;
TsdPlayer._CMD_NOTE_OFF = 0x80;
TsdPlayer._CMD_VOLUME_MONO = 0x81;
TsdPlayer._CMD_SASTIN_MODE = 0x82;
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
TsdPlayer._NOTE_FREQUENCY_TABLE = [
    // from note id to frequency
    [   // NORMAL
        0x0008, 0x0008, 0x0009, 0x0009, 0x000a, 0x000a, 0x000b, 0x000c,
        0x000c, 0x000d, 0x000e, 0x000f, 0x0010, 0x0011, 0x0012, 0x0013,
        0x0014, 0x0015, 0x0017, 0x0018, 0x0019, 0x001b, 0x001d, 0x001e,
        0x0020, 0x0022, 0x0024, 0x0026, 0x0029, 0x002b, 0x002e, 0x0030,
        0x0033, 0x0037, 0x003a, 0x003d, 0x0041, 0x0045, 0x0049, 0x004d,
        0x0052, 0x0057, 0x005c, 0x0061, 0x0067, 0x006e, 0x0074, 0x007b,
        0x0082, 0x008a, 0x0092, 0x009b, 0x00a4, 0x00ae, 0x00b8, 0x00c3,
        0x00cf, 0x00dc, 0x00e9, 0x00f6, 0x0105, 0x0115, 0x0125, 0x0137,
        0x0149, 0x015d, 0x0171, 0x0187, 0x019f, 0x01b8, 0x01d2, 0x01ed,
        0x020b, 0x022a, 0x024b, 0x026e, 0x0293, 0x02ba, 0x02e3, 0x030f,
        0x033e, 0x0370, 0x03a4, 0x03db, 0x0416, 0x0454, 0x0496, 0x04dc,
        0x0526, 0x0574, 0x05c7, 0x061f, 0x067d, 0x06e0, 0x0748, 0x07b7,
        0x082d, 0x08a9, 0x092d, 0x09b9, 0x0a4d, 0x0ae9, 0x0b8f, 0x0c3f,
        0x0cfa, 0x0dc0, 0x0e91, 0x0f6f, 0x105a, 0x1152, 0x125a, 0x1372,
        0x149a, 0x15d3, 0x171f, 0x187f, 0x19f4, 0x1b80, 0x1d22, 0x1ede,
        0x20b4, 0x22a5, 0x24b5, 0x26e4, 0x2934, 0x2ba7, 0x2e3f, 0x30ff
    ],
    [], // MSX
    [], // FM
    [   // GB_SQUARE
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x002c, 0x009d, 0x0107, 0x016b,
        0x01c9, 0x0223, 0x0277, 0x02c7, 0x0312, 0x0358, 0x039b, 0x03da,
        0x0416, 0x044e, 0x0483, 0x04b5, 0x04e5, 0x0511, 0x053b, 0x0563,
        0x0589, 0x05ac, 0x05ce, 0x05ed, 0x060b, 0x0627, 0x0642, 0x065b,
        0x0672, 0x0689, 0x069e, 0x06b2, 0x06c4, 0x06d6, 0x06e7, 0x06f7,
        0x0706, 0x0714, 0x0721, 0x072d, 0x0739, 0x0744, 0x074f, 0x0759,
        0x0762, 0x076b, 0x0773, 0x077b, 0x0783, 0x078a, 0x0790, 0x0797,
        0x079d, 0x07a2, 0x07a7, 0x07ac, 0x07b1, 0x07b6, 0x07ba, 0x07be,
        0x07c1, 0x07c5, 0x07c8, 0x07cb, 0x07ce, 0x07d1, 0x07d4, 0x07d6,
        0x07d9, 0x07db, 0x07dd, 0x07df, 0x07e1, 0x07e2, 0x07e4, 0x07e6,
        0x07e7, 0x07e9, 0x07ea, 0x07eb, 0x07ec, 0x07ed, 0x07ee, 0x07ef,
        0x07f0, 0x07f1, 0x07f2, 0x07f3, 0x07f4, 0x07f4, 0x07f5, 0x07f6
    ]
];
TsdPlayer._NOTE_PARAMETER_TABLE = [
    // from note id to parameter
    [], // NORMAL
    [   // MSX
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0D5D, 0x0C9C, 0x0BE7, 0x0B3C,
        0x0A9B, 0x0A02, 0x0973, 0x08EB, 0x086B, 0x07F2, 0x0780, 0x0714,
        0x06AF, 0x064E, 0x05F4, 0x059E, 0x054E, 0x0501, 0x04BA, 0x0476,
        0x0436, 0x03F9, 0x03C0, 0x038A, 0x0357, 0x0327, 0x02FA, 0x02CF,
        0x02A7, 0x0281, 0x025D, 0x023B, 0x021B, 0x01FD, 0x01E0, 0x01C5,
        0x01AC, 0x0194, 0x017D, 0x0168, 0x0153, 0x0140, 0x012E, 0x011D,
        0x010D, 0x00FE, 0x00F0, 0x00E3, 0x00D6, 0x00CA, 0x00BE, 0x00B4,
        0x00AA, 0x00A0, 0x0097, 0x008F, 0x0087, 0x007F, 0x0078, 0x0071,
        0x006B, 0x0065, 0x005F, 0x005A, 0x0055, 0x0050, 0x004C, 0x0047,
        0x0043, 0x0040, 0x003C, 0x0039, 0x0035, 0x0032, 0x0030, 0x002D,
        0x002A, 0x0028, 0x0026, 0x0024, 0x0022, 0x0020, 0x001E, 0x001C,
        0x001B, 0x0019, 0x0018, 0x0016, 0x0015, 0x0014, 0x0013, 0x0012,
        0x0011, 0x0010, 0x000F, 0x000E, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000
    ],
    [], // FM (<< 6)
    []  // GB_SQUARE
];
TsdPlayer._PARAMETER_FREQUENCY_TABLE = [
    // from parameter to frequency
    [], // NORMAL
    new Uint16Array(4096),  // MSX
    new Uint16Array(0x2000),  // FM
    []  // GB_SQUARE
];

// Calculate tables.
(function () {
    var i;
    var table = TsdPlayer._PARAMETER_FREQUENCY_TABLE[
            TsdPlayer._FREQUENCY_TYPE_MSX];
    for (i = 0; i < 4096; i++) {
        var val = (0 == i) ? 0xffff : ~~((1.7897725e+6 / 16 / i / 2) + 0.5);
        table[i] = val;
    }

    table = TsdPlayer._PARAMETER_FREQUENCY_TABLE[TsdPlayer._FREQUENCY_TYPE_FM];
    for (i = 0; i < 0x2000; i++) {
        var tone = i >> 6;
        var fine = i & 0x3f;
        var power = ((tone - 69) + fine / 64) / 12;
        table[i] = ~~(440 * Math.pow(2, power) + 0.5);
    }
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
        data = 0x100 - data;
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
                id: i,
                baseOffset: 0,
                size: 0,
                offset: 0,
                loop: {
                    offset: 0,
                    count: 0
                },
                localLoop:[],
                wait: 1,
                sastinLevel: 0,
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
                    vol: {
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
    // TODO
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
                // Tone data
                this._noteOn(ch, cmd);
                ch.wait = this.input[ch.baseOffset + ch.offset++];
                if (0xff == ch.wait) {
                    ch.wait = this._readU16(ch.baseOffset + ch.offset);
                    ch.offset += 2;
                }
                if (0 != ch.wait)
                    break;
            } else if (cmd == TsdPlayer._CMD_NOTE_OFF) {
                this._noteOff(ch);
                ch.wait = this.input[ch.baseOffset + ch.offset++];
                if (0xff == ch.wait) {
                    ch.wait = this._readU16(ch.baseOffset + ch.offset);
                    ch.offset += 2;
                }
                if (0 != ch.wait)
                    break;
            } else if (cmd == TsdPlayer._CMD_VOLUME_MONO) {
                dt = this.input[ch.baseOffset + ch.offset++];
                if (ch.pan & TsdPlayer._PAN_L)
                    this._setVolume(ch, TsdPlayer._CH_L, dt);
                if (ch.pan & TsdPlayer._PAN_R)
                    this._setVolume(ch, TsdPlayer._CH_R, dt);
            } else if (cmd == TsdPlayer._CMD_SASTIN_MODE) {
                dt = this.input[ch.baseOffset + ch.offset++];
                // TODO
            } else if (cmd == TsdPlayer._CMD_DETUNE) {
                ch.detune = this._readI8(ch.baseOffset + ch.offset);
                ch.offset++;
            } else if (cmd == TsdPlayer._CMD_PORTAMENT) {
                ch.offset++;
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
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_DEPTH) {
                dt = this.input[ch.baseOffset + ch.offset++];
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_WIDTH) {
                dt = this.input[ch.baseOffset + ch.offset++];
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_HEIGHT) {
                dt = this.input[ch.baseOffset + ch.offset++];
                // TODO
            } else if (cmd == TsdPlayer._CMD_PITCH_MODULATION_DELTA) {
                dt = this.input[ch.baseOffset + ch.offset++];
                // TODO
            } else if (cmd == TsdPlayer._CMD_ENDLESS_LOOP_POINT) {
                ch.loop.offset = ch.offset;
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

    // TODO: Set volume.
    // TODO: Key on.
    // TODO: Reset phase.
    // TODO: Reset modulation, envelope, and sastin.
};

TsdPlayer.prototype._noteOff = function (ch) {
    // TODO
};

TsdPlayer.prototype._setVolume = function (ch, lr, volume) {
    // TODO: volume type
    this.device.setModuleVolume(ch.id, lr, volume);
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

TsdPlayer.prototype._setFmInPipe = function (ch, rate, pipe) {
    Log.getLog().info("TSD: fm in " + ch.id + " = " + rate + ", " + pipe);
    this.device.setModuleFmInPipe(ch.id, rate, pipe);
};

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
 * @param module module id
 */
TsdPlayer.prototype._setModule = function (ch, module) {
    Log.getLog().info("TSD: module " + ch.id + " = " + module);
    this.device.setModuleType(ch.id, module);
    if (0 != (module & 0x80))
        ch.frequency.type = module >> 7;
    else
        ch.frequency.type = module >> 4;
    Log.getLog().info("TSD: frequency type " + ch.id + " = " +
            ch.frequency.type);
    // TODO: Handle frequency type
};