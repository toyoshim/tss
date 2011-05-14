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

/**
 * Log prototype function. This prototype provide three kinds of Log
 * mechanisms. User can specify its type by id argument.
 * @param id Log type
 *     undefined: Use native console.log if it's available.
 *     null: Eliminate all logs.
 *     <string>: Output as pre element under DOM object which has <string> id.
 */
function Log (id) {
    this.lastLevel = "";

    // Set default log scheme.
    this.print = function (object) { /* Do nothing. */ }

    if (id == undefined) {
        // Try to use native console.
        if (window.console != undefined) {
            this.print = function (object) {
                console.log(object);
            }
        }
    } else if (id != null) {
        // Try to output under specified DOM object.
        this.frameDiv = document.getElementById(id);
        if (this.frameDiv == undefined) {
            return;
        }

        this.print = function (object) {
            if (window.console != undefined) {
                console.log(object);
            }
            if (object instanceof Object) {
                this.framePre = undefined;
                var pre = document.createElement('pre');
                var text = object.toString();
                var textNode = document.createTextNode(text);
                pre.appendChild(textNode);
                var title = "";
                for (var item in object) {
                    title += item + ":" + object[item] + "; \n";
                }
                pre.setAttribute('title', title);
                this.frameDiv.appendChild(pre);
            } else {
                if (this.framePre == undefined) {
                    this.framePre = document.createElement('pre');
                    this.frameDiv.appendChild(this.framePre);
                }
                var textNode = document.createTextNode(object + "\n");
                this.framePre.appendChild(textNode);
            }
            /*
            var text = object.toString() + "\n";
            if (object instanceof Object) {
                for (var item in object)
                text += " " + item + ":*\n"
            }
            var textNode = document.createTextNode(text);
            this.framePre.appendChild(textNode);
            */
        }
    }
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
        this.print("*FATAL*");
    }
    this.print(message);
}

/**
 * Log error message.
 * @param message error message
 */
Log.prototype.error = function (message) {
    if (this.LastLevel != "ERROR") {
        this.LastLevel = "ERROR";
        this.print("*ERROR*");
    }
    this.print(message);
}
/**
 * Log warning message.
 * @param message warning message
 */
Log.prototype.warn = function (message) {
    if (this.LastLevel != "WARN") {
        this.LastLevel = "WARN";
        this.print("*WARN*");
    }
    this.print(message);
}

/**
 * Log information message.
 * @param message information message
 */
Log.prototype.info = function (message) {
    if (this.LastLevel != "INFO") {
        this.LastLevel = "INFO";
        this.print("*INFO*");
    }
    this.print(message);
}
