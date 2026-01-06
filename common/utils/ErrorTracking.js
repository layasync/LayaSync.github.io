/**
 * ErrorTracking Class
 * Manages Honeybadger integration.
 */
class ErrorTracking {
    constructor() {
        this.apiKey = "hbp_f6R9jIfXi40Li5ddpEf3AwislT57Ni3zLqtH";
        this.environment = "production";
        this.errorQueue = [];
        this.isBlocked = false;
        this.init();
    }

    init() {
        this.injectScript();
        this.exposeGlobalHelpers();
    }

    injectScript() {
        const script = document.createElement('script');
        script.src = "https://js.honeybadger.io/v6.12/honeybadger.min.js";
        script.type = "text/javascript";
        script.async = true;

        // When the script loads, configure Honeybadger
        script.onload = () => this.configure();

        // When the script fails to load, set isBlocked to true
        script.onerror = () => {
            console.warn("Honeybadger script failed to load. Likely blocked by an ad blocker.");
            this.isBlocked = true;
        };

        document.head.appendChild(script);
    }

    configure() {
        if (window.Honeybadger) {
            Honeybadger.configure({
                apiKey: this.apiKey,
                environment: this.environment
            });

            // Flush queued errors
            if (this.errorQueue.length > 0) {
                console.log(`Flushing ${this.errorQueue.length} queued errors to Honeybadger`);
                this.errorQueue.forEach(([err, options]) => {
                    Honeybadger.notify(err, options);
                });
                this.errorQueue = [];
            }
        }
    }

    exposeGlobalHelpers() {
        // Helper to safely report errors even if caught
        window.sendErrorToHoneyBadger = (err, options) => this.reportError(err, options);
        // Helper to check if tracking is blocked
        window.isErrorTrackingBlocked = () => this.isBlocked;
    }

    reportError(err, options = {}) {
        if (window.Honeybadger) {
            console.error("Reporting error to Honeybadger:", err);
            Honeybadger.notify(err, options);
        } else {
            console.warn("Honeybadger not loaded yet, queuing error:", err);
            this.errorQueue.push([err, options]);
        }
    }
}

// Initialize
new ErrorTracking();
