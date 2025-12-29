/**
 * AIOStreamsAPI Class
 */
class AIOStreamsAPI {
    static get HOSTS() {
        return {
            Viren: "https://aiostreams.viren070.me",
            Yeb: "https://aiostreamsfortheweak.nhyira.dev",
            Midnight: "https://aiostreamsfortheweebsstable.midnightignite.me",
            ATBP: "https://aio.atbphosting.com",
            Omni: "https://aiostreams.12312023.xyz",
            Kuu: "https://aiostreams.stremio.ru",
        };
    }

    // Generic function to call AIOStreams API
    static async call(baseUrl, method, endpoint, payload = null, queryParams = {}) {
        // Construct URL with query parameters
        let url = baseUrl.replace(/\/$/, "") + endpoint;
        if (Object.keys(queryParams).length > 0) {
            const queryString = new URLSearchParams(queryParams).toString();
            url += `?${queryString}`;
        }

        const options = {
            method: method,
            headers: {}
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        const json = await Network.request(url, options);

        // Check for errors
        if (json.error) {
            throw new Error(json.error.message || "Unknown AIOStreams error");
        }

        return json;
    }

    // Retrieve the user's configuration from AIOStreams
    static async getConfig(baseUrl, uuid, password) {
        const payload = {
            uuid: uuid,
            password: password
        };
        const json = await this.call(baseUrl, 'GET', '/api/v1/user', null, payload);
        return json.data.userData;
    }

    // Update the user's configuration on AIOStreams
    static async setConfig(baseUrl, uuid, password, config) {
        const payload = {
            config: config,
            password: password,
            uuid: uuid
        };
        return await this.call(baseUrl, 'PUT', '/api/v1/user', payload);
    }

    // Create a new user/manifest from a config object (e.g. from restore)
    static async installConfig(baseAIOStreamsUrl, password, config) {
        const payload = {
            config: config,
            password: password
        };

        const json = await this.call(baseAIOStreamsUrl, 'POST', '/api/v1/user', payload);

        const newUuid = json.data && json.data.uuid;
        const encrypted = json.data && json.data.encryptedPassword;

        if (newUuid && encrypted) {
            return `${baseAIOStreamsUrl.replace(/\/$/, "")}/stremio/${newUuid}/${encrypted}/manifest.json`;
        }
        return null;
    }

    // Create a new AIOStreams manifest based on the provided parameters.
    static async createConfig(debridProvider, debridApiKey, debridioKey, instanceName, tmdbAccessToken) {
        // Fetch the AIOStreams config file to use as a template.
        let aiostreamsConfig;
        try {
            aiostreamsConfig = await Network.request("../common/configs/aiostreams-personal-config.json");
        } catch (err) {
            throw new Error("Found an error loading the configuration file. Please report this to the developer.", err);
        }

        // Update Addon Name based on Instance
        // Changes "Duck Streams" to "Duck Streams (Yeb)" for example
        aiostreamsConfig.addonName = `${aiostreamsConfig.addonName} (${instanceName})`;

        // Insert TMDB Access Token
        aiostreamsConfig.tmdbAccessToken = tmdbAccessToken;

        // Configure debrid providers
        // Disable all first
        aiostreamsConfig.services.forEach(s => { s.enabled = false; });

        // Enable the user debrid provider and put in the user API key
        const service = aiostreamsConfig.services.find(s => s.id === debridProvider);
        if (service) {
            service.enabled = true;
            service.credentials = service.credentials || {};
            service.credentials.apiKey = debridApiKey;
        }

        // Debridio Logic
        if (debridioKey) {
            // If a Debridio API key is provided, add it to the Debridio addon
            const preset = aiostreamsConfig.presets.find(p => p.type === 'debridio');
            if (preset) {
                preset.options.debridioApiKey = debridioKey;
            }
        } else {
            // If no Debridio API key is provided, remove the Debridio addon
            aiostreamsConfig.presets = aiostreamsConfig.presets.filter(p => p.type !== 'debridio');
        }

        return aiostreamsConfig;
    }
}

window.AIOStreamsAPI = AIOStreamsAPI;
