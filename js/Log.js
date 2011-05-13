/**
 * TOYOSHIMA-HOUSE Library for JavaScript
 */

/**
 * Log prototype
 *
 * This prototype provide common log interfaces.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 *
 */
function Log () {
    this.lastLevel = "";
}

Log.log = new Log();

/**
 * Set default log instance.
 * @param newLog Log instance to set
 */
Log.setLog = function (newLog) {
    Log.log = newLog;
}

/**
 * Get default log instance.
 * @return default Log instance
 */
Log.getLog = function () {
    return Log.log;
}

/**
 * Log fatal message.
 * @param message fatal message
 */
Log.prototype.fatal = function (message) {
    if (this.LastLevel != "FATAL") {
        this.LastLevel = "FATAL";
        console.log("FATAL:");
    }
    console.log(message);
}

/**
 * Log error message.
 * @param message error message
 */
Log.prototype.error = function (message) {
    if (this.LastLevel != "ERROR") {
        this.LastLevel = "ERROR";
        console.log("ERROR:");
    }
    console.log(message);
}
/**
 * Log warning message.
 * @param message warning message
 */
Log.prototype.warn = function (message) {
    if (this.LastLevel != "WARN") {
        this.LastLevel = "WARN";
        console.log("WARN:");
    }
    console.log(message);
}

/**
 * Log information message.
 * @param message information message
 */
Log.prototype.info = function (message) {
    if (this.LastLevel != "INFO") {
        this.LastLevel = "INFO";
        console.log("INFO:");
    }
    console.log(message);
}
