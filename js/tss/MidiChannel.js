/**
 * T'SoundSystem for JavaScript
 */

/**
 * MidiChannel base prototype
 *
 * Abstract MIDI device.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
function MidiChannel () {
}

MidiChannel.EVENT_TYPE_MIDI = 0;

MidiChannel.createEvent = function (data) {
    return {
        type: MidiChannel.EVENT_TYPE_MIDI,
        midiData: data
    }
};

MidiChannel.prototype.processEvents = function (events) {
    Log.getLog().info("MIDI: event " + events.midiData[0].toString(16));
};
