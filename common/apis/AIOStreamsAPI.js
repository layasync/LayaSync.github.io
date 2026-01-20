/**
 * AIOStreamsAPI Class
 */
class AIOStreamsAPI {
    static get HOSTS() {
        return {
            Yeb: "https://aiostreamsfortheweak.nhyira.dev",
            ATBP: "https://aio.atbphosting.com",
            Omni: "https://aiostreams.12312023.xyz",
            Midnight: "https://aiostreamsfortheweebsstable.midnightignite.me",
            Kuu: "https://aiostreams.stremio.ru",
        };
    }

    // Helper to identify known user errors that shouldn't be reported to logging services
    static isUserError(errorMessage) {
        const IGNORED = [
            "new password is too short",
            "invalid uuid or password"
        ];
        return IGNORED.some(msg => errorMessage.toLowerCase().includes(msg.toLowerCase()));
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
            throw new Error(json.error.message);
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
        throw new Error("API response did not contain the expected UUID and encrypted password.");
    }

    // Create a new AIOStreams manifest based on the provided parameters.
    static async populateJSON(providersMap, debridioKey, tmdbAccessToken, formatterDefinition) {
        // Fetch the AIOStreams config file to use as a template.
        let aiostreamsConfig;
        try {
            // Force no-store to bypass browser cache
            // This ensures we get the newest config each time
            aiostreamsConfig = await Network.request("config/aiostreams-config.json", { cache: 'no-store' });

            // Note: The addon name is not set here. It's dynamically set in QuickStart.js
            // This is because the default host, auto mode, will try all the hosts so we don't
            // know which one will be used until this config is installed.

            // Insert TMDB Access Token
            aiostreamsConfig.tmdbAccessToken = tmdbAccessToken;

            // Configure debrid providers
            // Disable all first
            aiostreamsConfig.services.forEach(s => { s.enabled = false; });

            // Enable the user debrid provider(s) and put in the user API keys
            if (providersMap && typeof providersMap === 'object') {
                Object.entries(providersMap).forEach(([providerId, apiKey]) => {
                    const service = aiostreamsConfig.services.find(s => s.id === providerId);
                    if (service) {
                        service.enabled = true;
                        service.credentials = service.credentials || {};
                        service.credentials.apiKey = apiKey;
                    }
                });
            }

            // Newznab Logic
            // If the user passed in a TorBox API key for their debrid provider, I need to add it to the Newznab addon
            // otherwise I need to delete it. It should only work with TorBox.
            let enableNewznab = false;
            const torboxKey = providersMap && providersMap.torbox;

            if (torboxKey) {
                try {
                    // If the user is a PRO subscriber, they get Newznab
                    const torboxUserData = await TorBoxAPI.getUserData(torboxKey);
                    // Plan IDs: 0: Free, 1: Essential, 2: Pro, 3: Standard
                    if (torboxUserData && torboxUserData.plan === 2) {
                        enableNewznab = true;
                    }
                } catch (e) {
                    console.error("Failed to check TorBox plan:", e);
                }
            }

            if (enableNewznab) {
                const newznabPreset = aiostreamsConfig.presets.find(p => p.type === 'newznab');
                if (newznabPreset) {
                    newznabPreset.options.apiKey = torboxKey;
                }
            } else {
                aiostreamsConfig.presets = aiostreamsConfig.presets.filter(p => p.type !== 'newznab');
            }

            // Set the formatter in the config
            aiostreamsConfig.formatter.definition = formatterDefinition;

            // Regex imports
            try {
                // Fetch the regex patterns from the remote source
                // const regexUrl = "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/merged-regexes.json";
                const regexUrl = "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/refs/heads/main/merged-anime-regexes.json";
                const regexData = await Network.request(regexUrl, { cache: 'no-store' });

                // Filter out unwanted keys based on the requirements
                const filteredRegexPatterns = [];

                if (regexData && typeof regexData === 'object') {
                    for (const item of Object.values(regexData)) {
                        if (item.name && !item.name.toLowerCase().startsWith("anime")) {
                            // This check inherently filters out "", "bad" and "web scene"
                            const tierMatch = item.name.match(/T(\d+)$/);
                            if (tierMatch) {
                                item.tier = parseInt(tierMatch[1], 10);
                                item.name = `Tier ${item.tier}`;
                                filteredRegexPatterns.push(item);
                            }
                        }
                    }
                }

                filteredRegexPatterns.sort((a, b) => a.tier - b.tier);

                // Apply the filtered patterns to the config
                console.log("Regex keys after filtering:", filteredRegexPatterns);
                aiostreamsConfig.preferredRegexPatterns = filteredRegexPatterns;
            } catch (e) {
                console.error("Failed to fetch or apply regex patterns:", e);
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
        } catch (err) {
            throw err;
        }

        return aiostreamsConfig;
    }
}

window.AIOStreamsAPI = AIOStreamsAPI;
