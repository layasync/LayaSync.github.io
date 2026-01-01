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
        const resp = await fetch(`https://api.strem.io/api/${endpoint}`, payload);
        return resp.json();
    }

    // Login to Stremio.
    static async login(email, password) {
        const body = {
            type: "Login",
            email: email,
            password: password
        };
        const data = await this.call("login", body);

        // If the login failed, throw an error.
        if (data.error) {
            throw new Error(data.error.message || "Login failed");
        }

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

        // If the registration failed, throw an error.
        if (data.error) {
            throw new Error(data.error.message || "Registration failed");
        }

        // Return the email and password.
        return { email, password };
    }

    // Ensure an account exists.
    // First by trying to register, then by logging in.
    static async ensureAccount(email, password) {
        let isNewAccount = false;
        let authKey;

        // First try to register the email and password.
        try {
            await this.register(email, password);
            isNewAccount = true;
            console.log("Account created successfully.");
        } catch (regErr) {
            const errMsg = regErr.message || "";
            if (errMsg.includes("already exists") || errMsg.includes("existingUser")) {
                console.log("Account exists, attempting login...");
                isNewAccount = false;
            } else {
                window.reportError(regErr);
                throw regErr;
            }
        }

        // Then try to login.
        try {
            authKey = await this.login(email, password);
        } catch (loginErr) {
            // If the login failed, but it's also not a new account,
            // then the password was incorrect. Throw an error.
            if (!isNewAccount) {
                throw new Error("Account exists, but password was incorrect.");
            }
            window.reportError(loginErr);
            throw loginErr;
        }

        // Return the auth key and whether the account was new.
        return { authKey, isNewAccount };
    }

    // Get the addons for the account.
    static async getAddons(authKey) {
        const data = await this.call("addonCollectionGet", {
            type: "AddonCollectionGet",
            authKey: authKey
        });
        if (data.error) return [];
        return data.result.addons || [];
    }

    // Set the addons for the account.
    static async setAddons(authKey, addons) {
        return await this.call("addonCollectionSet", {
            type: "AddonCollectionSet",
            authKey: authKey,
            addons: addons
        });
    }

    // Take in a manifest URL and install it to the account.
    static async installAddon(authKey, manifestUrl) {
        try {
            // Get current addons
            const currentAddons = await this.getAddons(authKey);

            // Fetch manifest content
            // Usage of Network (class)
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

        } catch (err) {
            window.reportError(err);
            throw err;
        }
    }
}

window.StremioAPI = StremioAPI;
