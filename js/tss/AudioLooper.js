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

    // Web Audio API on Chrome and Safari.
    if (window.webkitAudioContext != undefined) {
        Log.getLog().info("use Web Audio API");
        this.audioContext = new webkitAudioContext();
        if (this.audioContext == null) {
            Log.getLog().fatal("could not use webkitAudioContext");
            return;
        }

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

        return;
    }

    // Audio Data API on Firefox.
    if (window.Audio != undefined) {
        Log.getLog().info("use Audio Data API");
        this.audio = new Audio();
        if (this.audio == null) {
            Log.getLog().fatal("could not use Audio");
            return;
        }

        // Set up playback configuration.
        this.audioChannel = 2;
        this.audioFrequency = 44100;
        this.audio.mozSetup(this.audioChannel, this.audioFrequency);

        // Set up output buffer.
        this.bufferId = 0;
        this.bufferPage = 4;
        this.bufferSize = 4096; // 92msec
        this.bufferWritten = 0;
        this.buffer = new Array(this.bufferPage);
        var arraySize = this.bufferSize * this.audioChannel;
        for (var i = 0; i < this.bufferPage; i++) {
            this.buffer[i] = new Float32Array(arraySize);
            var written = this.audio.mozWriteAudio(this.buffer[i]);
            this.bufferWritten += written;
        }

        // Register callback with 50msec interval.
        this.audio.owner = this;
        setInterval(function (object) { object.onAudioInterval() }, 50, this);

        return;
    }
}

/**
 * Register sound generator.
 * @param newChannel sound generator
 */
AudioLooper.prototype.setChannel = function (newChannel) {
    if (null != newChannel) {
        newChannel.setBufferLength(this.bufferSize * 2);
    }
    this.channel = newChannel;
}

/**
 * Audio processing event handler for Web Audio API.
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

/**
 * Audio interval callback handler for Audio Data API.
 */
AudioLooper.prototype.onAudioInterval = function () {
    // Logged event contents at the first event.
    if (null == this.firstAudioEvent) {
        this.firstAudioEvent = true;
        Log.getLog().info("onAudioInterval");
        Log.getLog().info(this);
    }

    // Check buffer status.
    var audioRead = this.audio.mozCurrentSampleOffset();
    var pageSize = this.bufferSize * this.audioChannel;
    var pageOffset = audioRead % (pageSize * this.bufferPage);
    var playingPage = ~~(pageOffset / pageSize);
    if (this.bufferId == playingPage &&
            this.bufferWritten != audioRead) {
        // Buffers are busy.
        return;
    }

    // Update buffer tracking variables.
    var outLr = this.buffer[this.bufferId];
    this.bufferId = (this.bufferId + 1) % this.bufferPage;

    // Process next buffer.
    if (null == this.channel) {
        // Process no input channel.
        for (var i = 0; i < this.bufferSize; i++) {
            outLr[i * 2 + 0] = 0.0;
            outLr[i * 2 + 1] = 0.0;
        }
    } else {
        // Process buffer conversion.
        this.channel.generate(this.bufferSize * this.audioChannel);
        var inLr = this.channel.getBuffer();
        for (var i = 0; i < this.bufferSize; i++) {
            outLr[i * 2 + 0] = inLr[i * 2 + 0] / 32768.0;
            outLr[i * 2 + 1] = inLr[i * 2 + 1] / 32768.0;
        }
    }

    // Play next buffer.
    var written = this.audio.mozWriteAudio(outLr);
    this.bufferWritten += written;
}
