/**
 * ErrorTracking Class
 * Manages Honeybadger integration.
 */
class ErrorTracking {
    constructor() {
        this.apiKey = "hbp_f6R9jIfXi40Li5ddpEf3AwislT57Ni3zLqtH";
        this.environment = "production";
        this.init();
    }

    init() {
        this.injectScript();
        this.exposeGlobalHelpers();
    }

    injectScript() {
        const script = document.createElement('script');
        script.src = "//js.honeybadger.io/v6.12/honeybadger.min.js";
        script.type = "text/javascript";
        script.async = true;

        script.onload = () => this.configure();

        document.head.appendChild(script);
    }

    configure() {
        if (window.Honeybadger) {
            Honeybadger.configure({
                apiKey: this.apiKey,
                environment: this.environment
            });
        }
    }

    exposeGlobalHelpers() {
        // Helper to safely report errors even if caught
        window.sendErrorToHoneyBadger = (err, options) => this.reportError(err, options);
    }

    reportError(err, options = {}) {
        if (window.Honeybadger) {
            console.error("Reporting error to Honeybadger:", err);
            Honeybadger.notify(err, options);
        } else {
            console.warn("Honeybadger not loaded yet, cannot report error:", err);
        }
    }
}

// Initialize
new ErrorTracking();
