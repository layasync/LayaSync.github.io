/**
 * StremioAPI Class
 */
class StremioAPI {
    // Helper to identify known user errors that shouldn't be reported to logging services
    static isUserError(errorMessage) {
        // List of errors that are "normal" user interactions and not system failures
        const IGNORED = [
            "User not found",
            "Wrong passphrase",
            "Incorrect password"
        ];
        return IGNORED.some(msg => errorMessage.includes(msg));
    }

    // Generic function to call Stremio API
    static async call(endpoint, body) {
        const payload = {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify(body)
        };

        const json = await Network.request(`https://api.strem.io/api/${endpoint}`, {
            ...payload
        });

        if (json.error) {
            throw new Error(json.error.message);
        }

        return json;
    }

    // Login to Stremio.
    static async login(email, password) {
        const body = {
            type: "Login",
            email: email,
            password: password
        };
        const data = await this.call("login", body);

        // Return the auth key.
        return data.result.authKey;
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
        const data = await this.call("register", body);

        // Return the email and password.
        return { email, password };
    }

    // Ensure an account exists.
    // First by trying to register, then by logging in.
    static async ensureAccount(email, password) {
        let isNewAccount = false;
        let authKey;

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
        authKey = await this.login(email, password);

        // Return the auth key and whether the account was new.
        return { authKey, isNewAccount };
    }

    // Get the addons for the account.
    static async getAddons(authKey) {
        const data = await this.call("addonCollectionGet", {
            type: "AddonCollectionGet",
            authKey: authKey
        });
        return data.result.addons;
    }

    // Set the addons for the account.
    static async setAddons(authKey, addons) {
        const data = await this.call("addonCollectionSet", {
            type: "AddonCollectionSet",
            authKey: authKey,
            addons: addons
        });
    }

    // Take in a manifest URL and install it to the account.
    static async installAddon(authKey, manifestUrl) {
        // Get current addons
        const currentAddons = await this.getAddons(authKey);

        // Fetch manifest content
        const manifestJson = await Network.request(manifestUrl);

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
        await this.setAddons(authKey, newAddonsList);
        console.log("Addon installed successfully");
        return true;
    }
}

window.StremioAPI = StremioAPI;
