/**
 * ErrorHandler Class
 */
class ErrorHandler {
    constructor() {
        this.apiKey = "hbp_f6R9jIfXi40Li5ddpEf3AwislT57Ni3zLqtH";
        this.errorQueue = [];
        this.isBlocked = false;

        // Initialize immediately
        this.init();
    }

    init() {
        this.setupGlobalListeners();
        this.injectScript();

        ErrorHandler.instance = this;
    }

    setupGlobalListeners() {
        window.addEventListener('error', (event) => {
            if (event.error) {
                this.report(event.error, { component: 'Global', source: 'window.onerror' });
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason || new Error("Unhandled Promise Rejection");
            this.report(error, { component: 'Global', source: 'unhandledrejection' });
        });
    }

    injectScript() {
        const script = document.createElement('script');
        script.src = "https://js.honeybadger.io/v6.12/honeybadger.min.js";
        script.type = "text/javascript";
        script.async = true;

        script.onload = () => this.configure();
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
                environment: "production",
                enableUncaught: false, // Prevent duplicate reporting (we handle this manually)
                enableUnhandledRejection: false // Prevent duplicate reporting (we handle this manually)
            });

            if (this.errorQueue.length > 0) {
                console.log(`Flushing ${this.errorQueue.length} queued errors to Honeybadger`);
                this.errorQueue.forEach(({ err, options }) => {
                    Honeybadger.notify(err, options);
                });
                this.errorQueue = [];
            }
        }
    }

    /**
     * Report an error to the backend (Honeybadger)
     */
    report(err, options = {}) {
        const errorObj = (err instanceof Error) ? err : new Error(String(err));

        if (ErrorHandler.isUserError(errorObj)) {
            console.warn("Skipping Honeybadger report for user error:", errorObj.message);
            return;
        }

        if (window.Honeybadger) {
            console.error("Reporting error to Honeybadger:", errorObj);
            try {
                Honeybadger.notify(errorObj, options);
            } catch (notifyErr) {
                console.warn("Failed to report error to Honeybadger:", notifyErr);
            }
        } else {
            console.warn("Honeybadger not loaded yet, queuing error:", errorObj);
            this.errorQueue.push({ err: errorObj, options });
        }
    }

    // Static Accessors for Ease of Use

    /**
     * Handle an error by showing a modal and reporting it.
     */
    static handle(err, context = {}, customTitle = "Error") {
        const errorObj = (err instanceof Error) ? err : new Error(String(err));

        // 1. Show UI Feedback
        if (window.Modal) {
            Modal.error(errorObj.message, customTitle);
        } else {
            console.error("Detailed Error:", errorObj);
            alert(`${customTitle}: ${errorObj.message}`);
        }

        // 2. Report to Backend
        this.report(errorObj, context);
    }

    /**
     * Report an error to the backend without showing a modal.
     */
    static report(err, context = {}) {
        if (ErrorHandler.instance) {
            ErrorHandler.instance.report(err, context);
        }
    }

    /**
     * Determines if an error is a safe "User Error" that shouldn't be reported.
     */
    static isUserError(err) {
        if (!err || !err.message) return false;

        const msg = err.message.toLowerCase();
        const IGNORED_PHRASES = [
            // Auth / StremioAPI
            "invalid email",
            "user not found",
            "wrong passphrase",
            "incorrect password",
            "session does not exist",
            "user already exists",

            // Validation
            "please enter",
            "required",
            "new password is too short",
            "invalid uuid or password",

            // Addon / Network specific
            "failed to fetch",
            "network error",
            "abort error",
            "all aiostreams hosts failed",
            "network connection lost",
            "too many requests from this ip"
        ];

        return IGNORED_PHRASES.some(phrase => msg.includes(phrase));
    }

    /**
     * Checks if Honeybadger (error tracking) was blocked/failed to load.
     */
    static isBlocked() {
        return ErrorHandler.instance ? ErrorHandler.instance.isBlocked : false;
    }
}

// Initialize
new ErrorHandler();
window.ErrorHandler = ErrorHandler;