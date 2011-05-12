/**
 * T'SoundSystem for JavaScript (Web Audio API)
 */

/**
 * AudioPlayback prototype
 *
 * This prototype provides an audio output stream for real time sound
 * rendering.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 *
 */
function AudioLooper () {
    // Initialize variables.
    this.channel = null;

    // This object is valid on Chrome and Safari.
    this.audioContext = new webkitAudioContext();
    if (null == this.audioContext) return;

    // Allocate JavaScript synthesis node.
    this.bufferSize = 4096;
    this.jsNode = this.audioContext.createJavaScriptNode(this.bufferSize);

    // Connect to output audio device.
    this.jsNode.connect(this.audioContext.destination);

    // Register callback
    this.jsNode.owner = this;
    this.jsNode.onaudioprocess = function (event) {
        this.owner.onAudioProcess(event);
    }
}

/**
 * Register sound generator.
 * @param newChannel sound generator
 */
AudioLooper.prototype.setChannel = function (newChannel) {
    newChannel.setBufferLength(this.bufferSize * 2);
    this.channel = newChannel;
}

/**
 * Audio processing event handler.
 * @param event AudioProcessingEvent
 */
AudioLooper.prototype.onAudioProcess = function (event) {
    // Logged event contents at the first event.
    if (null == this.firstAudioEvent) {
        this.firstAudioEvent = true;
        Log.getLog().info(event);
    }

    // Get Float32Array output buffer.
    var lOut = event.outputBuffer.getChannelData(0);
    var rOut = event.outputBuffer.getChannelData(1);

    // Process no input channel.
    if (null == this.channel) {
        for (var i = 0; i < this.bufferSize; i++) {
            lOut[i] = 0.0;
            rOut[i] = 0.0;
        }
        return;
    }

    // Get Int32Array input buffer.
    this.channel.generate(this.bufferSize * 2);
    var lrIn = this.channel.getBuffer();

    // Process buffer conversion.
    for (var i = 0; i < this.bufferSize; i++) {
        lOut[i] = lrIn[i * 2 + 0] / 32768.0;
        rOut[i] = lrIn[i * 2 + 1] / 32768.0;
    }
}
