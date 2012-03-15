/**
 * T'SoundSystem for JavaScript
 */

/**
 * TsdPlayer prototype
 *
 * Play TSD format files.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function TsdPlayer () {
    this.master = null;
    this.device = null;
    this.input = null;
    this.buffer = null;
    this.interval = 0;
    this.header = null;
    this.channel = null;
    this.timerCount = 0;
    this.fixedCount = 0;
}

TsdPlayer.VERSION = 0.93;
TsdPlayer._DEFAULT_TIMER_COUNT = 368;

TsdPlayer.prototype.setMasterChannel = function (channel) {
    // TODO: Create TssChannel

    channel.clearChannel();
    channel.addChannel(this);
    this.master = channel;
};

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
TsdPlayer.prototype.setBufferLength = function (length) {
    this.buffer = new Int32Array(length);
};

/**
 * @see MasterChannel
 * @return audio stream buffer
 */
TsdPlayer.prototype.getBuffer = function () {
    return this.buffer;
};

/**
 * Generate specified length sound stream into internal buffer.
 * @see MasterChannel
 * @param length sound length in short to generate
 */
TsdPlayer.prototype.generate = function (length) {
};

TsdPlayer.prototype._compareWithString = function (offset, string) {
    var length = string.length;
    for (var i = 0; i < length; i++) {
        if (string.charCodeAt(i) != this.input[offset + i])
            return false;
    }
    return (0 == this.input[offset + length]);
};

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
                    result += String.fromCharCode(0xd800 + (w << 6) + (x >> 10));
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
 * Decode and play.
 * @param newInput ArrayBuffer to play
 * @return success or not
 */
TsdPlayer.prototype.play = function (newInput) {
    try {
        this.input = new Uint8Array(newInput);
        this.timerCount = TsdPlayer._DEFAULT_TIMER_COUNT;
        this.fixedCount = 0;
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
        if ((header.fullVersion <= 0.60) || (TsdPlayer.VERSION < header.fullVersion)) {
            Log.getLog().warn("TSD: unsupported format");
            return false;
        }

        // Parse the music title.
        header.titleSize = (this.input[16] << 8) | this.input[17];
        header.title = this._buildString(18, header.titleSize);
        Log.getLog().info("TSD: title = " + header.title);

        var offset = 18 + ((header.titleSize + 1) & ~1);
        header.numOfChannel = (this.input[offset] << 8) | this.input[offset + 1];
        offset += 2;
        Log.getLog().info("TSD: channel = " + header.numOfChannel);
        // TODO: Set channel number to TssChannel.
        this.header = header;

        // Parse channel information.
        var channel = [];
        var i;
        for (i = 0; i < header.numOfChannel; i++) {
            channel[i] = {
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
                pan: 3,
                frequency: {
                    type: 0,
                    param: 0
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
            channel[i].baseOffset = (this.input[offset + 0] << 24) || (this.input[offset + 1] << 16) ||
                    (this.input[offset + 2] << 8) | this.input[offset + 3];
            channel[i].size = (this.input[offset + 4] <<24) || (this.input[offset + 5] << 16) ||
                (this.input[offset + 6] << 8) | this.input[offset + 7];
            offset += 8;
            Log.getLog().info("TSD: ch." + i + " offset = " + channel[i].baseOffset + ", size = " + channel[i].size);
        }
        Log.getLog().info(channel);
        this.channel = channel;

        // Parse table information.
        var numOfWave = (this.input[offset] << 8) + this.input[offset + 1];
        offset += 2;
        for (i = 0; i < numOfWave; i++) {
            // TODO: Set wave data to TssChannel.
            offset += this.input[offset + 1] + 2;
        }
        var numOfTable = (this.input[offset] << 8) + this.input[offset + 1];
        offset += 2;
        for (i = 0; i < numOfTable; i++) {
            // TODO: Set table data.
            offset += this.input[offset + 1] + 2;
        }
    } catch (e) {
        Log.getLog().error(e);
        return false;
    }
    return true;
};
