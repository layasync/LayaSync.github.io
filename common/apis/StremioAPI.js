/**
 * StremioAPI Class
 */
class StremioAPI {
    // Current user session (email, password, authKey)
    static session = null;



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
            // If the API call throws an error, we'll end up here.
            // If the error is that a session expired, we'll try to re-login
            // and retry the request.
            if (err.message.includes("Session does not exist") &&
                endpoint !== "login" &&
                this.session &&
                body.authKey === this.session.authKey) {

                console.warn("Session expired, attempting auto-relogin...");
                try {
                    // Re-login to get a fresh authKey
                    await this.login(this.session.email, this.session.password);

                    // Update the authKey in the request body
                    const newBody = { ...body, authKey: this.session.authKey };

                    // Retry request
                    return await executeRequest(newBody);
                } catch (retryErr) {
                    console.error("Auto-relogin failed:", retryErr);
                    throw err; // Throw original session error if retry fails
                }
            }
            throw err;
        }
    }

    // Login to Stremio.
    static async login(email, password) {
        const body = {
            type: "Login",
            email: email,
            password: password
        };
        const data = await this.call("login", body);

        // Store session state
        this.session = {
            email,
            password,
            authKey: data.result.authKey
        };
    }

    // Register a new Stremio account.
    static async register(email, password) {
        const body = {
            type: "Register",
            email,
            password,
            gdpr_consent: {
                from: "web",
                time: new Date().toISOString()
            }
        };

        await this.call("register", body);
    }

    // Ensure an account exists.
    // First by trying to register, then by logging in.
    static async ensureAccount(email, password) {
        let isNewAccount = false;

        // First try to register the email and password as a new account.
        console.log("Attempting to register account...");
        try {
            await this.register(email, password);
            isNewAccount = true;
            console.log("Account created successfully.");
        } catch (e) {
            // If the account already exists, we suppress the error and proceed to login.
            // For any other error (server down, invalid params), we throw.
            if (!e.message.includes("already exists") && !e.message.includes("existingUser")) {
                throw e;
            }
            console.log("Account exists, attempting login...");
        }

        // We need to login to get the authKey (whether new or existing).
        await this.login(email, password);

        // Return whether the account was new.
        return isNewAccount;
    }

    // Get the addons for the account.
    static async getAddons() {
        // If no session is found, throw an error.
        if (!this.session) {
            throw new Error("No active session found.");
        }

        const data = await this.call("addonCollectionGet", {
            type: "AddonCollectionGet",
            authKey: this.session.authKey
        });

        // Return the addons.
        return data.result.addons;
    }

    // Set the addons for the account.
    static async setAddons(addons) {
        // If no session is found, throw an error.
        if (!this.session) {
            throw new Error("No active session found.");
        }

        await this.call("addonCollectionSet", {
            type: "AddonCollectionSet",
            authKey: this.session.authKey,
            addons: addons
        });
    }

    // Take in a manifest URL and install it to the account.
    static async installAddon(manifestUrl) {
        // If no session is found, throw an error.
        if (!this.session) {
            throw new Error("No active session found.");
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
        console.log("Addon installed successfully");
        return true;
    }
}

window.StremioAPI = StremioAPI;
