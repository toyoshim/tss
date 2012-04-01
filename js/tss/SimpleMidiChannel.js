/**
 * T'SoundSystem for JavaScript
 */

/**
 * SimpleMidiChannel prototype
 *
 * This prototype implements simple virtual MIDI device with square sound.
 * This virtual instrument implements only key-on/off handling.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function SimpleMidiChannel (frequency) {
    this.buffer = null;
    this.phase = 0;
    this.freq = 440;
    this.data = 8192;
}

SimpleMidiChannel.prototype = new MidiChannel();
SimpleMidiChannel.prototype.constructor = SimpleMidiChannel;

/**
 * @see MasterChannel
 * @param length buffer length or size in shorts
 */
SimpleMidiChannel.prototype.setBufferLength = function (length) {
    this.buffer = new Int32Array(length);
};

/**
 * @see MasterChannel
 * @return audio stream buffer
 */
SimpleMidiChannel.prototype.getBuffer = function () {
    return this.buffer;
};

/**
 * Generate specified length sound stream into internal buffer.
 * @see MasterChannel
 * @param length sound length in short to generate
 */
SimpleMidiChannel.prototype.generate = function (length) {
    for (var i = 0; i < length; i += 2) {
        this.phase += this.freq * 2;
        if (this.phase > MasterChannel.SAMPLE_FREQUENCY) {
            this.phase -= MasterChannel.SAMPLE_FREQUENCY;
            this.data = -this.data;
        }
        this.buffer[i + 0] = this.data;
        this.buffer[i + 1] = this.data;
    }
};

/**
 * Process note off event.
 * @see MidiChannel
 * @param ch channel
 * @param note note number
 * @param velocity key off velocity
 */
SimpleMidiChannel.prototype.processNoteOff = function (ch, note, velocity) {
    // TODO
};

/**
 * Process note on event.
 * @see MidiChannel
 * @param ch channel
 * @param note note number
 * @param velocity key on velocity
 */
SimpleMidiChannel.prototype.processNoteOn = function (ch, note, velocity) {
    // TODO
    if (0 != ch)
        return;
    this.freq = MidiChannel.getFrequencyForNote(note);
};
