/**
 * T'SoundSystem for JavaScript
 */

/**
 * BiquadFilterChannel prototype
 *
 * This prototype implements biquad IIR filter channel.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function BiquadFilterChannel () {
    this.zL = 0;
    this.zR = 0;
    this.zzL = 0;
    this.zzR = 0;
    this.a0 = 1;
    this.a1 = 0;
    this.a2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.inBuffer = null;
    this.outBuffer = null;
    this.bufferLength = 0;
    this.channel = null;
}

BiquadFilterChannel.TYPE_LPF = 'LPF';
BiquadFilterChannel.TYPE_HPF = 'HPF';
BiquadFilterChannel.TYPE_BPF = 'BPF';
BiquadFilterChannel.TYPE_BEF = 'BEF';
BiquadFilterChannel.TYPE_APF = 'APF';
BiquadFilterChannel.TYPE_PEG = 'PEG';
BiquadFilterChannel.TYPE_LOS = 'LOS';
BiquadFilterChannel.TYPE_HIS = 'HIS';
BiquadFilterChannel.TYPE_NOTCH = BiquadFilterChannel.TYPE_BEF;
BiquadFilterChannel.TYPE_EQ = BiquadFilterChannel.TYPE_PEQ;
BiquadFilterChannel.TYPE_PEAKING_EQ = BiquadFilterChannel.TYPE_PEQ;
BiquadFilterChannel.TYPE_LOW_SHELF = BiquadFilterChannel.TYPE_LOS;
BiquadFilterChannel.TYPE_HIGH_SHELF = BiquadFilterChannel.TYPE_HIS;

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
BiquadFilterChannel.prototype.setBufferLength = function (length) {
    this.outBuffer = new Int32Array(length);
    this.bufferLength = length;
    if (null != this.channel) {
        this.channel.setBufferLength(length);
        this.inBuffer = this.channel.getBuffer();
    }
};

/**
 * @see MasterChannel
 * @return audio stream buffer
 */
BiquadFilterChannel.prototype.getBuffer = function () {
    return this.outBuffer;
};

/**
 * Set processing channel.
 * @param channel channel to process
 */
BiquadFilterChannel.prototype.setChannel = function (channel) {
    if (0 != this.bufferLength) {
        channel.setBufferLength(this.bufferLength);
        this.inBuffer = channel.getBuffer();
    }
    this.channel = channel;
};

/**
 * Set filter characteristic by direct parameter.
 * These direct parameter realize the transfer function as
 *         b0 + b1*z^-1 + b2*z^-2
 * H(z) = ------------------------
 *         a0 + a1*z^-1 + a2*z^-2
 * @param a0 a0 of the transfer function
 * @param a1 a1 of the transfer function
 * @param a2 a2 of the transfer function
 * @param b0 a0 of the transfer function
 * @param b1 b1 of the transfer function
 * @param b2 b2 of the transfer function
 */
BiquadFilterChannel.prototype.setDirectParameter =
        function (a0, a1, a2, b0, b1, b2) {
    this.a0 = 1;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
};

/**
 * Set filter characteristic by sound parameter.
 */
BiquadFilterChannel.prototype.setParameter = function (type, f, q) {
    // TODO
};

/**
 * Generate specified length sound stream into internal buffer.
 * @see MasterChannel
 * @param length sound length in short to generate
 */
BiquadFilterChannel.prototype.generate = function (length) {
    if (null == this.channel)
        return;

    this.channel.generate(length);
    for (var i = 0; i < length; i += 2) {
        var L = this.inBuffer[i + 0] - this.a1 * this.zL - this.a2 * this.zzL;
        var R = this.inBuffer[i + 1] - this.a1 * this.zR - this.a2 * this.zzR;
        this.outBuffer[i + 0] =
                this.b0 * L + this.b1 * this.zL + this.b2 * this.zzL;
        this.outBuffer[i + 1] =
                this.b0 * R + this.b1 * this.zR + this.b2 * this.zzR;
        this.zzL = this.zL;
        this.zzR = this.zR;
        this.zL = L;
        this.zR = R;
    }
};
