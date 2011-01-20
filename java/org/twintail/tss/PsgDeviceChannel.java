/**
 * T'SoundSystem for Java
 */
package org.twintail.tss;

/**
 * class PsgDeviceChannel
 *
 * This class implement PSG sound device as Device and Channel.
 * AY-3-8910 is a reference model.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
public final class PsgDeviceChannel implements Device, Channel {
    public static final int CLOCK_4MHZ = 4000000;
    public static final int CLOCK_3_58MHZ = 3579545;
    public static final int REGISTER_CH_A_TP_LOW = 0;
    public static final int REGISTER_CH_A_TP_HIGH = 1;
    public static final int REGISTER_CH_B_TP_LOW = 2;
    public static final int REGISTER_CH_B_TP_HIGH = 3;
    public static final int REGISTER_CH_C_TP_LOW = 4;
    public static final int REGISTER_CH_C_TP_HIGH = 5;
    public static final int REGISTER_NOISE_TP = 6;
    public static final int REGISTER_MIXER = 7;
    public static final int REGISTER_CH_A_VOLUME = 8;
    public static final int REGISTER_CH_B_VOLUME = 9;
    public static final int REGISTER_CH_C_VOLUME = 10;
    public static final int REGISTER_EP_LOW = 11;
    public static final int REGISTER_EP_HIGH = 12;
    public static final int REGISTER_EP_CONTROL = 13;
    public static final int REGISTER_IO_A = 14;
    public static final int REGISTER_IO_B = 15;

    private static final int DEFAULT_CH_A_TP_LOW = 0x55;
    private static final int DEFAULT_CH_A_TP_HIGH = 0x00;
    private static final int DEFAULT_CH_B_TP_LOW = 0x00;
    private static final int DEFAULT_CH_B_TP_HIGH = 0x00;
    private static final int DEFAULT_CH_C_TP_LOW = 0x00;
    private static final int DEFAULT_CH_C_TP_HIGH = 0x00;
    private static final int DEFAULT_NOISE_TP = 0x00;
    private static final int DEFAULT_MIXER = 0xb8;
    private static final int DEFAULT_CH_A_VOLUME = 0x00;
    private static final int DEFAULT_CH_B_VOLUME = 0x00;
    private static final int DEFAULT_CH_C_VOLUME = 0x00;
    private static final int DEFAULT_EP_LOW = 0x0b;
    private static final int DEFAULT_EP_HIGH = 0x00;
    private static final int DEFAULT_EP_CONTROL = 0x00;
    private static final int REGISTERS = 16;
    private static final int CHANNELS = 3;
    private static final int REGISTER_MIN_VALUE = 0;
    private static final int REGISTER_MAX_VALUE = 255;
    private static final int BITS_PER_BYTE = 8;
    private static final int NOISE_TP_MASK = 0x1f;
    private static final int MIXER_CH_A_TONE = 1;
    private static final int MIXER_CH_A_NOISE = 8;
    private static final int MIXER_CH_B_TONE = 2;
    private static final int MIXER_CH_B_NOISE = 16;
    private static final int MIXER_CH_C_TONE = 4;
    private static final int MIXER_CH_C_NOISE = 32;
    private static final int VOLUME_MASK = 0x0f;
    private static final int ENVELOPE_MASK = 0x10;
    private static final int CH_A = 0;
    private static final int CH_B = 1;
    private static final int CH_C = 2;
    private static final int CLOCK_BIAS = 16000;
    private static final int STEP_BIAS = 18;
    private static final int VOLUME_BIAS = 5;
    private static final short DEFAULT_SEED = -1;
    private static final short UPDATE_SEED_MASK = 0x0009;
    private static final int UPDATE_SEED_RSHIFT = 3;
    private static final int UPDATE_SEED_LSHIFT = 15;
    private static final int SHORT_MASK = 0xffff;
    private static final short[] VOLUME_TABLE = {
        0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x09, 0x0B, 0x0D, 0x0F, 0x12,
        0x16, 0x1A, 0x1F, 0x25, 0x2D, 0x35, 0x3F, 0x4C,
        0x5A, 0x6A, 0x7F, 0x97, 0xB4, 0xD6, 0xFF, 0xFF,
    };

    private int clock = CLOCK_3_58MHZ;
    private int baseStep = 0;
    private short[] buffer = null;
    private int[] register = new int[REGISTERS];
    private short[] volume = new short[CHANNELS];
    private boolean[] envelope = new boolean[CHANNELS];
    private boolean[] active = new boolean[CHANNELS];
    private short seed = DEFAULT_SEED;
    private int[] stepTone = new int[CHANNELS];
    private int[] countTone = new int[CHANNELS];
    private boolean[] mixerTone = new boolean[CHANNELS];
    private int stepNoise = 0;
    private int countNoise = 0;
    private boolean[] mixerNoise = new boolean[CHANNELS];

    /**
     * Class constructor.
     */
    public PsgDeviceChannel() {
        setClock(CLOCK_3_58MHZ);
        for (int i = 0; i < CHANNELS; i++) {
            active[i] = true;
        }
        writeRegister(REGISTER_CH_A_TP_HIGH, DEFAULT_CH_A_TP_HIGH);
        writeRegister(REGISTER_CH_A_TP_LOW, DEFAULT_CH_A_TP_LOW);
        writeRegister(REGISTER_CH_B_TP_HIGH, DEFAULT_CH_B_TP_HIGH);
        writeRegister(REGISTER_CH_B_TP_LOW, DEFAULT_CH_B_TP_LOW);
        writeRegister(REGISTER_CH_C_TP_HIGH, DEFAULT_CH_C_TP_HIGH);
        writeRegister(REGISTER_CH_C_TP_LOW, DEFAULT_CH_C_TP_LOW);
        writeRegister(REGISTER_NOISE_TP, DEFAULT_NOISE_TP);
        writeRegister(REGISTER_MIXER, DEFAULT_MIXER);
        writeRegister(REGISTER_CH_A_VOLUME, DEFAULT_CH_A_VOLUME);
        writeRegister(REGISTER_CH_B_VOLUME, DEFAULT_CH_B_VOLUME);
        writeRegister(REGISTER_CH_C_VOLUME, DEFAULT_CH_C_VOLUME);
        writeRegister(REGISTER_EP_LOW, DEFAULT_EP_LOW);
        writeRegister(REGISTER_EP_HIGH, DEFAULT_EP_HIGH);
        writeRegister(REGISTER_EP_CONTROL, DEFAULT_EP_CONTROL);
    }

    /**
     * Set device clock frequency in Hz.
     * @param hz clock frequency in Hz
     */
    public void setClock(final int hz) {
        clock = hz; // tone frequency = clock / 32TP
        baseStep = (int) ((long) CLOCK_BIAS * (long) clock
                / (long) MasterChannel.SAMPLE_FREQUENCY);
    }

    /**
     * @see Channel
     * @param length buffer length or size in shorts
     */
    public void setBufferLength(final int length) {
        buffer = new short[length];
    }

    /**
     * @see Channel
     * @return audio stream buffer
     */
    public short[] getBuffer() {
        return buffer;
    }

    /**
     * Generate specified length sound stream into internal buffer.
     * @see Channel
     * @param length sound length in short to generate
     */
    public void generate(final int length) {
        for (int offset = 0; offset < length; offset += 2) {
            countNoise += baseStep;
            if (countNoise > stepNoise) {
                short v = (short) (seed & UPDATE_SEED_MASK);
                v ^= (v >>> UPDATE_SEED_RSHIFT);
                seed = (short) (((int) seed & SHORT_MASK) >> 1);
                seed |= ((v << UPDATE_SEED_LSHIFT) & SHORT_MASK);
                countNoise -= stepNoise;
            }
            short value = 0;
            boolean noise = 0 != (seed & 1);
            for (int channel = 0; channel < CHANNELS; channel++) {
                countTone[channel] += baseStep;
                if (countTone[channel] > stepTone[channel]) {
                    countTone[channel] -= stepTone[channel];
                    active[channel] = !active[channel];
                }
                if ((mixerTone[channel] && active[channel])
                        || (mixerNoise[channel] && noise)) {
                    value += volume[channel];
                }
            }
            buffer[offset + 0] = value;
            buffer[offset + 1] = value;
        }
    }

    /**
     * @see Device
     * @param address register address to write
     * @param value register value to write
     */
    public void writeRegister(final int address, final int value) {
        if ((address > REGISTERS)
                || (value < REGISTER_MIN_VALUE)
                || (REGISTER_MAX_VALUE < value)) {
            throw new IllegalArgumentException("Undefined register: "
                    + address);
        }
        register[address] = value;

        switch(address) {
        case REGISTER_CH_A_TP_LOW:
        case REGISTER_CH_A_TP_HIGH:
            stepTone[CH_A] = ((register[REGISTER_CH_A_TP_HIGH] << BITS_PER_BYTE)
                    | (register[REGISTER_CH_A_TP_LOW])) << STEP_BIAS;
            break;
        case REGISTER_CH_B_TP_LOW:
        case REGISTER_CH_B_TP_HIGH:
            stepTone[CH_B] = ((register[REGISTER_CH_B_TP_HIGH] << BITS_PER_BYTE)
                    | (register[REGISTER_CH_B_TP_LOW])) << STEP_BIAS;
            break;
        case REGISTER_CH_C_TP_LOW:
        case REGISTER_CH_C_TP_HIGH:
            stepTone[CH_C] = ((register[REGISTER_CH_C_TP_HIGH] << BITS_PER_BYTE)
                    | (register[REGISTER_CH_C_TP_LOW])) << STEP_BIAS;
            break;
        case REGISTER_NOISE_TP:
            stepNoise = ((value & NOISE_TP_MASK) << 1) << (STEP_BIAS + 1);
            if (stepNoise < baseStep) {
                stepNoise = baseStep;
            }
            break;
        case REGISTER_MIXER:
            mixerTone[CH_A] = 0 == (value & MIXER_CH_A_TONE);
            mixerTone[CH_B] = 0 == (value & MIXER_CH_B_TONE);
            mixerTone[CH_C] = 0 == (value & MIXER_CH_C_TONE);
            mixerNoise[CH_A] = 0 == (value & MIXER_CH_A_NOISE);
            mixerNoise[CH_B] = 0 == (value & MIXER_CH_B_NOISE);
            mixerNoise[CH_C] = 0 == (value & MIXER_CH_C_NOISE);
            break;
        case REGISTER_CH_A_VOLUME:
            volume[CH_A] = (short) (VOLUME_TABLE[(value & VOLUME_MASK) << 1]
                                                 << VOLUME_BIAS);
            envelope[CH_A] = 0 != (value & ENVELOPE_MASK);
            break;
        case REGISTER_CH_B_VOLUME:
            volume[CH_B] = (short) (VOLUME_TABLE[(value & VOLUME_MASK) << 1]
                                                 << VOLUME_BIAS);
            envelope[CH_B] = 0 != (value & ENVELOPE_MASK);
            break;
        case REGISTER_CH_C_VOLUME:
            volume[CH_C] = (short) (VOLUME_TABLE[(value & VOLUME_MASK) << 1]
                                                 << VOLUME_BIAS);
            envelope[CH_C] = 0 != (value & ENVELOPE_MASK);
            break;
        case REGISTER_EP_LOW:
            // TODO
            break;
        case REGISTER_EP_HIGH:
            // TODO
            break;
        case REGISTER_EP_CONTROL:
            // TODO
            break;
        case REGISTER_IO_A:
            break;
        case REGISTER_IO_B:
            break;
        default:
            break;
        }
    }

    /**
     * @see Device
     * @param address register address to read
     * @return read register value
     */
    public int readRegister(final int address) {
        if (address > REGISTERS) {
            throw new IllegalArgumentException("Undefined register: "
                    + address);
        }
        return register[address];
    }
}
