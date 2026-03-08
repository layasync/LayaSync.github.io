/**
 * StremioAPI Class 
*/
class StremioAPI {
    // Generic function to call Stremio API
    static async call(endpoint, body) {
        const payload = {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify(body)
        };

        const executeRequest = async (currentBody) => {
            const json = await Network.request(`https://api.strem.io/api/${endpoint}`, {
                ...payload,
                body: JSON.stringify(currentBody)
            });

            if (json.error) {
                throw new Error(json.error.message);
            }
            return json;
        };

        try {
            return await executeRequest(body);
        } catch (err) {
            // Session expired - user must re-login manually
            // We do NOT auto-relogin with stored password (security risk)
            if (err.message.includes("Session does not exist") && endpoint !== "login") {
                Logger.warn('StremioAPI', 'Session expired - user must re-authenticate', {});
                // Clear the expired session
                const currentSession = StremioSessionInstance.getSession();
                if (currentSession) {
                    this.logout();
                }
                // Re-throw with clear message
                throw new Error("Your session has expired. Please log in again.");
            }
            throw err;
        }
    }

    // Login to Stremio
    static async login(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }
        if (!InputValidator.isValidPassword(password)) {
            throw new Error("Password must be 6-20 characters");
        }

        const body = {
            type: "Login",
            email: email,
            password: password
        };
        
        try {
            const data = await this.call("login", body);

            // Store ONLY email and authKey - NOT password
            StremioSessionInstance.setSession(email, data.result.authKey);
            
            // Zero out the password parameter for security
            password = null;

            Logger.debug('StremioAPI', 'User logged in successfully', { email });
            
            // Return session without password
            return StremioSessionInstance.getSession();
        } catch (error) {
            Logger.error('StremioAPI', 'Login failed', error, { email });
            throw error;
        }
    }

    // Logout - clear session and any stored credentials
    static async logout() {
        const session = StremioSessionInstance.getSession();
        
        // Optionally notify the server (best effort)
        if (session?.authKey) {
            try {
                await this.call("logout", {
                    type: "Logout",
                    authKey: session.authKey
                });
            } catch (e) {
                // Logout may fail if session already expired - still continue
                Logger.warn('StremioAPI', 'Logout request failed (may already be expired)', {});
            }
        }

        // Clear session locally
        StremioSessionInstance.clearSession();
        
        // Clear any stored credentials from previous version
        sessionStorage.clear();
        localStorage.removeItem('lastEmail');
        localStorage.removeItem('lastPassword');
        
        Logger.debug('StremioAPI', 'User logged out');
    }

    // Check if authenticated
    static isAuthenticated() {
        return StremioSessionInstance.isAuthenticated();
    }

    // Register a new Stremio account.
    static async register(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }
        if (!InputValidator.isValidPassword(password)) {
            throw new Error("Password must be 6-20 characters");
        }

        const body = {
            type: "Register",
            email,
            password,
            gdpr_consent: {
                from: "web",
                time: new Date().toISOString()
            }
        };

        try {
            await this.call("register", body);
            Logger.debug('StremioAPI', 'Account registered successfully', { email });
        } catch (error) {
            Logger.error('StremioAPI', 'Registration failed', error, { email });
            throw error;
        }
    }

    // Ensure an account exists.
    // First by trying to register, then by logging in.
    static async ensureAccount(email, password) {
        let isNewAccount = false;

        // First try to register the email and password as a new account.
        Logger.debug('StremioAPI', 'Attempting to register account...', { email });
        try {
            await this.register(email, password);
            isNewAccount = true;
            Logger.debug('StremioAPI', 'Account created successfully', { email });
        } catch (e) {
            // If the account already exists, we suppress the error and proceed to login.
            // For any other error (server down, invalid params), we throw.
            if (!e.message.includes("already exists") && !e.message.includes("existingUser")) {
                throw e;
            }
            Logger.debug('StremioAPI', 'Account exists, attempting login...', { email });
        }

        // We need to login to get the authKey (whether new or existing).
        await this.login(email, password);

        // Return whether the account was new.
        return isNewAccount;
    }

    // Get the addons for the account.
    static async getAddons() {
        // If no session is found, throw an error.
        const session = StremioSessionInstance.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        const data = await this.call("addonCollectionGet", {
            type: "AddonCollectionGet",
            authKey: session.authKey
        });

        // Return the addons.
        return data.result.addons;
    }

    // Set the addons for the account.
    static async setAddons(addons) {
        // If no session is found, throw an error.
        const session = StremioSessionInstance.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        await this.call("addonCollectionSet", {
            type: "AddonCollectionSet",
            authKey: session.authKey,
            addons: addons
        });
    }

    // Take in a manifest URL and install it to the account.
    static async installAddon(manifestUrl) {
        // If no session is found, throw an error.
        const session = StremioSessionInstance.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        // Get current addons
        const currentAddons = await this.getAddons();

        // Fetch manifest content
        const manifestJson = await Network.request(manifestUrl, { retries: 1 });

        // Validate manifest
        if (!manifestJson || typeof manifestJson !== 'object') {
            throw new Error("Invalid Manifest: Response is not a valid JSON object");
        }
        if (!manifestJson.id || !manifestJson.version || !manifestJson.name) {
            throw new Error(`Invalid Manifest: Missing required fields (id, version, name). Found: ${JSON.stringify(Object.keys(manifestJson))}`);
        }

        // Construct new addon object
        const newAddon = {
            transportUrl: manifestUrl,
            transportName: "http",
            manifest: manifestJson,
            flags: {
                official: false,
                protected: false
            }
        };

        // Save existing addons to a new list
        let newAddonsList = [...currentAddons];

        // Search for the addon we're installing
        const existingIndex = newAddonsList.findIndex(a => a.transportUrl === manifestUrl);
        if (existingIndex !== -1) {
            // If we found the addon that we're trying to install, update it.
            newAddonsList[existingIndex] = newAddon;
        } else {
            // If we didn't find the addon, add it.
            newAddonsList.push(newAddon);
        }

        // Save
        await this.setAddons(newAddonsList);
        Logger.debug('StremioAPI', 'Addon installed successfully', { manifestUrl: manifestUrl });
        return true;
    }
}

window.StremioAPI = StremioAPI;
