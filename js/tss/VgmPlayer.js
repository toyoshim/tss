/**
 * T'SoundSystem for JavaScript
 */

/**
 * VgmPlayer prototype
 *
 * Play VGM format files.
 * @see http://www.smspower.org/uploads/Music/vgmspec161.txt
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function VgmPlayer () {
    this.masterChannel = null;
    this.input = null;
    this.offset = 0;
    this.psg = null;
    this.minorVersion = 0;
    this.snClock = PsgDeviceChannel.CLOCK_3_58MHZ;
    this.error = false;
    this.loop = false;
    this.loopSkipOffset = 0;
    this.interval = VgmPlayer._PLAYER_INTERVAL_NTSC;
    this.wait = 0;
    this.writtenSamples = 0;
}

VgmPlayer._GZ_ID1 = 0x1f;
VgmPlayer._GZ_ID2 = 0x8b;
VgmPlayer._VGM_ID1 = 'V'.charCodeAt(0);
VgmPlayer._VGM_ID2 = 'g'.charCodeAt(0);
VgmPlayer._VGM_ID3 = 'm'.charCodeAt(0);
VgmPlayer._VGM_ID4 = ' '.charCodeAt(0);
VgmPlayer._VGM_IDENT_SIZE = 4;
VgmPlayer._VGM_VERSION_SIZE = 4;
VgmPlayer._VERSION_1_00 = 0x00;
VgmPlayer._VERSION_1_01 = 0x01;
VgmPlayer._VERSION_1_10 = 0x10;
VgmPlayer._VERSION_1_50 = 0x50;
VgmPlayer._UINT_SIZE = 4;
VgmPlayer._BYTE_MASK = 0xff;
VgmPlayer._OFFSET_0 = 0;
VgmPlayer._OFFSET_1 = 1;
VgmPlayer._OFFSET_2 = 2;
VgmPlayer._OFFSET_3 = 3;
VgmPlayer._LSHIFT_0_BYTE = 0;
VgmPlayer._LSHIFT_1_BYTE = 8;
VgmPlayer._LSHIFT_2_BYTE = 16;
VgmPlayer._LSHIFT_3_BYTE = 24;
VgmPlayer._PLAYER_INTERVAL_NTSC = 17;
VgmPlayer._PLAYER_INTERVAL_PAL = 20;
VgmPlayer._VGM_DEFAULT_DATA_OFFSET = 0x40;
VgmPlayer._VGM_1_00_EOH = 0x24;
VgmPlayer._CMD_WRITE_GG = 0x4f;
VgmPlayer._CMD_WRITE_SN = 0x50;
VgmPlayer._CMD_WRITE_YM2413 = 0x51;
VgmPlayer._CMD_WRITE_YM2612A = 0x52;
VgmPlayer._CMD_WRITE_YM2612B = 0x53;
VgmPlayer._CMD_WRITE_YM2151 = 0x54;
VgmPlayer._CMD_WAIT_NNNN = 0x61;
VgmPlayer._CMD_WAIT_735 = 0x62;
VgmPlayer._CMD_WAIT_882 =  0x63;
VgmPlayer._CMD_EOD = 0x66;
VgmPlayer._WAIT_735 = 735;
VgmPlayer._WAIT_882 = 882;

/**
 * Read unsigned int value from InputStream.
 * @param input InputStream to read
 * @return read unsigned int value
 * @throws Error exception on reading
 */
VgmPlayer.prototype.readUInt = function (input, offset) {
    if (input.length <= (offset + VgmPlayer._UINT_SIZE))
        throw new Error("Unexpected EOF");
    var l = (input[offset + VgmPlayer._OFFSET_0] & VgmPlayer._BYTE_MASK) <<
            VgmPlayer._LSHIFT_0_BYTE;
    var k = (input[offset + VgmPlayer._OFFSET_1] & VgmPlayer._BYTE_MASK) <<
            VgmPlayer._LSHIFT_1_BYTE;
    var j = (input[offset + VgmPlayer._OFFSET_2] & VgmPlayer._BYTE_MASK) <<
            VgmPlayer._LSHIFT_2_BYTE;
    var h = (input[offset + VgmPlayer._OFFSET_3] & VgmPlayer._BYTE_MASK) <<
            VgmPlayer._LSHIFT_3_BYTE;
    var i32 = h | j | k | l;
    if (i32 < 0)
        return 0x100000000 + i32;
    return i32;
};

/**
 * Set master channel to write output stream.
 * @param channel master channel
 */
VgmPlayer.prototype.setMasterChannel = function (channel) {
    this.psg = new PsgDeviceChannel();
    this.psg.setMode(PsgDeviceChannel.MODE_SIGNED);
    this.psg.setDevice(PsgDeviceChannel.DEVICE_SN76489);
    channel.clearChannel();
    channel.addChannel(this.psg);
    channel.setPlayer(this);
    // TODO: msec is not sufficient for NTSC (16.6... is not 17!)
    channel.setPlayerInterval(VgmPlayer._PLAYER_INTERVAL_NTSC);
    this.interval = VgmPlayer._WAIT_735;
    Log.getLog().info("VGM: assume as NTSC");
    this.masterChannel = channel;
};

/**
 * Channel reach to periodical call back point.
 */
VgmPlayer.prototype.updateDevice = function () {
    if (this.error || (this.input == null)) {
        return;
    }
    this.wait -= this.interval;
    if (this.wait > 0)
        return;
    try {
        while (true) {
            var command = this.input[this.offset++];
            var argument1;
            var argument2;
            switch (command) {
            case VgmPlayer._CMD_WRITE_GG:
                argument1 = this.input[this.offset++];
                this.psg.writeRegister(0, argument1 & VgmPlayer._BYTE_MASK);
                this.writtenSamples++;
                break;
            case VgmPlayer._CMD_WRITE_SN:
                argument1 = this.input[this.offset++];
                this.psg.writeRegister(0, argument1 & VgmPlayer._BYTE_MASK);
                this.writtenSamples++;
                break;
            case VgmPlayer._CMD_WRITE_YM2413:
            case VgmPlayer._CMD_WRITE_YM2612A:
            case VgmPlayer._CMD_WRITE_YM2612B:
            case VgmPlayer._CMD_WRITE_YM2151:
                this.error = true;
                Log.getLog().warn("VGM: FM sound is not supported");
                return;
            case VgmPlayer._CMD_WAIT_NNNN:
                argument1 = this.input[this.offset++];
                argument2 = this.input[this.offset++];
                this.wait = (argument1 & VgmPlayer._BYTE_MASK) | ((argument2 &
                        VgmPlayer._BYTE_MASK) << VgmPlayer._LSHIFT_1_BYTE);
                return;
            case VgmPlayer._CMD_WAIT_735:
                this.wait += VgmPlayer._WAIT_735;
                this.masterChannel.setPlayerInterval(
                        VgmPlayer._PLAYER_INTERVAL_NTSC);
                if (this.interval != VgmPlayer._WAIT_735) {
                    Log.getLog().info("VGM: detect as NTSC");
                    this.interval = VgmPlayer._WAIT_735;
                }
                return;
            case VgmPlayer._CMD_WAIT_882:
                this.wait += VgmPlayer._WAIT_882;
                this.masterChannel.setPlayerInterval(
                        VgmPlayer._PLAYER_INTERVAL_PAL);
                if (this.interval != VgmPlayer._WAIT_882) {
                    Log.getLog().info("VGM: detect as PAL");
                    this.interval = VgmPlayer._WAIT_882;
                }
                return;
            case VgmPlayer._CMD_EOD:
                if (this.loop) {
                    this.offset = this.loopSkipOffset;
                    Log.getLog().info("VGM: loop");
                } else {
                    // set error flag to stop music
                    this.error = true;
                    return;
                }
                break;
            default:
                Log.getLog().warn("VGM: unknown command 0x" + (command &
                        VgmPlayer._BYTE_MASK).toString(16));
                Log.getLog().warn("written samples = " + this.writtenSamples);
                return;
            }
        }
    } catch (e) {
        Log.getLog().error("VGM: " + e.toString());
        this.error = true;
    }
};

/**
 * Decode and play.
 * @param newInput ArrayBuffer to play
 * @return success or not
 */
VgmPlayer.prototype.play = function (newInput) {
    try {
        this.input = null;
        this.offset = 0;
        this.error = false;
        this.loop = false;

        var input = new Uint8Array(newInput);

        // check gzip or not
        if (VgmPlayer._GZ_ID1 == input[0] && VgmPlayer._GZ_ID2 == input[1]) {
            Log.getLog().info("VGM: GZip compressed, aka VGZ");
            Log.getLog().error("VGZ: Not supported");
            return false;
        }

        // check vgm header
        var offset = 0;
        if (input.byteLength <= (offset + VgmPlayer._VGM_IDENT_SIZE))
            return false;
        if ((input[offset + VgmPlayer._OFFSET_0] != VgmPlayer._VGM_ID1) ||
                (input[offset + VgmPlayer._OFFSET_1] != VgmPlayer._VGM_ID2) ||
                (input[offset + VgmPlayer._OFFSET_2] != VgmPlayer._VGM_ID3) ||
                (input[offset + VgmPlayer._OFFSET_3] != VgmPlayer._VGM_ID4)) {
            Log.getLog().error("VGM: Invalid IDENT");
            return false;
        }
        offset += VgmPlayer._VGM_IDENT_SIZE;
        Log.getLog().info("VGM: detect VGM indent");

        // EoF offset
        var vgmLength = this.readUInt(input, offset) + VgmPlayer._UINT_SIZE;
        offset += 4;
        Log.getLog().info("VGM: file length = " + vgmLength);

        // Version
        if (input.byteLength <= offset + VgmPlayer._VGM_VERSION_SIZE)
            return false;
        var vgmVersion = new Array(VgmPlayer._VGM_VERSION_SIZE);
        for (var i = 0; i < VgmPlayer._VGM_VERSION_SIZE; i++)
            vgmVersion[i] = input[offset++];
        if ((vgmVersion[VgmPlayer._OFFSET_3] != 0) ||
                (vgmVersion[VgmPlayer._OFFSET_2] != 0) ||
                (vgmVersion[VgmPlayer._OFFSET_1] != 1)) {
            Log.getLog().error("VGM: version is not 1.x ("
                    + vgmVersion[VgmPlayer._OFFSET_3] + "."
                    + vgmVersion[VgmPlayer._OFFSET_2] + "."
                    + vgmVersion[VgmPlayer._OFFSET_1] + "."
                    + vgmVersion[VgmPlayer._OFFSET_0] + ")");
            return false;
        }
        this.minorVersion = vgmVersion[VgmPlayer._OFFSET_0] &
                VgmPlayer._BYTE_MASK;
        switch (this.minorVersion) {
        case VgmPlayer._VERSION_1_00:
            Log.getLog().info("VGM: version 1.00");
            break;
        case VgmPlayer._VERSION_1_01:
            Log.getLog().info("VGM: version 1.01");
            break;
        case VgmPlayer._VERSION_1_10:
            Log.getLog().info("VGM: version 1.10");
            break;
        case VgmPlayer._VERSION_1_50:
            Log.getLog().info("VGM: version 1.50");
            break;
        default:
            Log.getLog().info("VGM: unknown version 1.["
                    + this.minorVersion + "]");
            return false;
        }

        // clock settings
        var clock;
        clock = this.readUInt(input, offset);
        offset += 4;
        if (0 == clock) {
            Log.getLog().warn("VGM: SN76489 is not used");
            return false;
        }
        Log.getLog().info("VGM: SN76489 clock is " + clock + " Hz");
        if (clock != this.snClock) {
            Log.getLog().info("VGM:   not " + this.snClock + " Hz");
            this.snClock = clock;
        }
        this.psg.setClock(this.snClock);
        clock = this.readUInt(input, offset);
        offset += 4;
        if (0 != clock) {
            // TODO: support YM2413
            Log.getLog().info("VGM: YM2413 clock is " + clock + " Hz");
            return false;
        }

        // GD3 tag (TODO: support GD3 tag)
        var gd3Offset = this.readUInt(input, offset);
        offset += 4;
        Log.getLog().info("VGM: GD3 offset = " + gd3Offset);

        // check offsets
        var totalSamples = this.readUInt(input, offset);
        Log.getLog().info("VGM: Total # samples = " + totalSamples);
        offset += 4;
        var loopOffset = this.readUInt(input, offset);
        Log.getLog().info("VGM: Loop offset = " + loopOffset);
        if (0 != loopOffset) {
            this.loop = true;
            this.loopSkipOffset = offset + loopOffset;
        }
        offset += 4;
        var loopSamples = this.readUInt(input, offset);
        Log.getLog().info("VGM: Loop # samples = " + loopSamples);
        offset += 4;

        // 1.00 complete
        if (this.minorVersion == VgmPlayer._VERSION_1_00) {
            offset += VgmPlayer._VGM_DEFAULT_DATA_OFFSET -
                    VgmPlayer._VGM_1_00_EOH;
            this.offset = offset;
            this.input = input;
            return true;
        }

        // 1.01 features
        // TODO

        // 1.10 features
        // TODO
        if (this.minorVersion <= VgmPlayer._VERSION_1_50) {
            offset += VgmPlayer._VGM_DEFAULT_DATA_OFFSET -
                    VgmPlayer._VGM_1_00_EOH;
            this.offset = offset;
            this.input = input;
            return true;
        }

        // 1.50 features
        // TODO

        // 1.51 features
        // TODO

        // 1.60 features
        // TODO

        // 1.61 feature
        // TODO
        return false;
    } catch (e) {
        return false;
    }
};
