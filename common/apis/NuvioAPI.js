/**
 * NuvioAPI Class
 * Implements StreamingService for Nuvio Cloud API (Supabase).
 */
class NuvioAPIProvider extends StreamingService {
    constructor() {
        super('nuvio');
        this.publishableKey = "sb_publishable_zcNkgqGJjBtj8GoRlMvl9A_zkdmXhf5";
        this.authUrl = "https://dpyhjjcoabcglfmgecug.supabase.co/auth/v1";
        this.restUrl = "https://dpyhjjcoabcglfmgecug.supabase.co/rest/v1";
        this.defaultProfileId = null; // Dynamically determined after login
    }

    // Override to specifically handle Nuvio's (Supabase) error on existing accounts.
    // Supabase returns "User already registered" with HTTP 422 for duplicate signups.
    isAccountExistsError(error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("422") ||
            super.isAccountExistsError(error)
        );
    }

    // Generic function to call Nuvio API
    async _call(baseUrl, endpoint, method, body = null) {
        const session = this.getSession();
        const headers = {
            "Content-Type": "application/json",
            "apikey": this.publishableKey
        };

        if (session?.token) {
            headers["Authorization"] = `Bearer ${session.token}`;
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const json = await Network.request(`${baseUrl}${endpoint}`, options);

        // Supabase uses two different error formats depending on the API:
        // - Auth API (/auth/v1/): { "error": "...", "error_description": "..." } or { "msg": "...", "code": 422 }
        // - REST API (/rest/v1/ PostgREST): { "code": "42501", "message": "...", "details": null, "hint": null }
        // Check for the Auth API error envelope first, then the REST API pattern.
        if (json?.error) {
            throw new Error(json.error.message || json.error_description || JSON.stringify(json.error));
        }
        // PostgREST errors have a top-level `code` (string like "42501") + `message`.
        // Valid success responses are always arrays or plain objects without a `code` string.
        if (json?.code && json?.message && typeof json.code === 'string') {
            throw new Error(json.message);
        }
        // Auth API v2 errors use { msg, code } where code is a number
        if (json?.msg && typeof json.code === 'number') {
            throw new Error(json.msg);
        }

        return json;
    }

    // Log in to Nuvio.
    async login(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            email: email,
            password: password
        };

        try {
            const data = await this._call(this.authUrl, "/token?grant_type=password", "POST", body);

            if (!data.access_token) {
                throw new Error("Login failed: No access token received");
            }

            // Store session
            ServiceSessionInstance.setSession(
                this.serviceName,
                email,
                data.access_token,
                Date.now() + (data.expires_in * 1000)
            );

            password = null; // Security
            Logger.debug('NuvioAPI', 'User logged in successfully', { email });

            // Initialize profile after login
            this.defaultProfileId = 1;
            Logger.debug('NuvioAPI', 'Profile initialized with ID: 1');

            // Return session
            return this.getSession();
        } catch (error) {
            Logger.error('NuvioAPI', 'Login failed', error, { email });
            throw error;
        }
    }

    // Log out from Nuvio.
    async logout() {
        try {
            await this._call(this.authUrl, "/logout", "POST");
        } catch (e) {
            Logger.warn('NuvioAPI', 'Logout request failed', {});
        }
        ServiceSessionInstance.clearSession(this.serviceName);
        Logger.debug('NuvioAPI', 'User logged out');
    }

    // Register a new Nuvio account.
    async register(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            email: email,
            password: password
        };

        await this._call(this.authUrl, "/signup", "POST", body);
        Logger.debug('NuvioAPI', 'Account registered successfully', { email });
    }

    // Get list of installed addons.
    async getAddons() {
        if (!this.defaultProfileId) return [];

        const endpoint = `/addons?select=*&profile_id=eq.${this.defaultProfileId}&order=sort_order`;
        const data = await this._call(this.restUrl, endpoint, "GET");

        // Normalize: Standardize 'url' field to 'transportUrl' to match Stremio/QuickStart conventions
        const addonList = Array.isArray(data) ? data : [];
        return addonList.map(item => ({
            ...item,
            transportUrl: item.url, // Map Nuvio's 'url' to 'transportUrl'
            manifest: item.manifest || { name: item.name } // Fallback if manifest is missing
        }));
    }

    // Set the entire list of addons (full replace).
    async setAddons(addons) {
        if (!this.defaultProfileId) return;

        const formattedAddons = Array.isArray(addons) ? addons.map((addon, index) => ({
            url: addon.url || addon.transportUrl,
            name: addon.name || addon.manifest?.name,
            enabled: addon.enabled !== false,
            sort_order: index
        })) : [];

        const body = {
            p_profile_id: this.defaultProfileId,
            p_addons: formattedAddons
        };

        // Sync with Nuvio
        await this._call(this.restUrl, "/rpc/sync_push_addons", "POST", body);
    }

    // Install a single addon via manifest URL.
    async installAddon(manifestUrl) {
        const currentAddons = await this.getAddons();

        // Fetch manifest to get the name
        const manifestJson = await Network.request(manifestUrl, { retries: 1 });

        // Validate manifest
        if (!manifestJson || !manifestJson.name) {
            throw new Error("Invalid Manifest: Missing name");
        }

        const newAddon = {
            url: manifestUrl,
            name: manifestJson.name,
            enabled: true
        };

        // Standard deduplication
        let newList = currentAddons.filter(a => a.url !== manifestUrl);
        newList.push(newAddon);

        // Save
        await this.setAddons(newList);
        Logger.debug('NuvioAPI', 'Addon installed successfully', { manifestUrl });
        return true;
    }
}

// Create and expose singleton instance
const NuvioAPIInstance = new NuvioAPIProvider();
window.NuvioAPI = NuvioAPIInstance;
