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
    this.bufferSize = 8192;
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
    //newChannel.setBufferLength(this.bufferSize);
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
    var l = event.outputBuffer.getChannelData(0);
    var r = event.outputBuffer.getChannelData(1);

    // Test code.
    // TODO: Delegate to Channel object and convert it.
    for (var i = 0; i < this.bufferSize; i++) {
        if (0 == (i & 0x80)) {
            l[i] = 0.5;
            r[i] = 0.5;
        } else {
            l[i] = -0.5;
            r[i] = -0.5;
        }
    }
}
