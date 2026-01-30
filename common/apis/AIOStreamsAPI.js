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
    static async installConfig(baseAIOStreamsUrl, password, config, compatibilityMode = 'stremio') {
        const payload = {
            config: config,
            password: password
        };

        const json = await this.call(baseAIOStreamsUrl, 'POST', '/api/v1/user', payload);
        const newUuid = json.data && json.data.uuid;
        const encrypted = json.data && json.data.encryptedPassword;

        if (newUuid && encrypted) {
            if (compatibilityMode === 'chilllink') {
                return `${baseAIOStreamsUrl.replace(/\/$/, "")}/chilllink/${newUuid}/${encrypted}`;
            }
            return `${baseAIOStreamsUrl.replace(/\/$/, "")}/stremio/${newUuid}/${encrypted}/manifest.json`;
        }
        throw new Error("API response did not contain the expected UUID and encrypted password.");
    }

    // Install config with smart retry logic for common upstream errors
    static async installConfigWithSmartRetry(hostUrl, hostName, config, password, compatibilityMode = 'stremio') {
        let attempts = 0;
        const maxAttempts = 4;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                // Try initial install
                return await this.installConfig(hostUrl, password, config, compatibilityMode);
            } catch (err) {
                // If we've run out of attempts, throw the error
                if (attempts >= maxAttempts) throw err;

                // Handle specific upstream errors
                const errorMsg = (err.message || err.toString()).toLowerCase();
                const isTorrentioError = errorMsg.includes("torrentio");
                const isMediaFusionError = errorMsg.includes("mediafusion");
                const isBitmagnetError = errorMsg.includes("bitmagnet");
                const isSeaDexError = errorMsg.includes("seadex not found");

                let presetType = "";
                if (isTorrentioError) presetType = 'torrentio';
                else if (isMediaFusionError) presetType = 'mediafusion';
                else if (isBitmagnetError) presetType = 'bitmagnet';
                else if (isSeaDexError) presetType = 'seadex';

                // Log for debugging
                console.log(`SmartRetry: Attempt ${attempts}/${maxAttempts}. Error: "${errorMsg}". Detected Type: "${presetType}"`);

                // If not an identifiable/fixable error, throw immediately
                const hasPreset = config.presets && config.presets.some(p => p.type === presetType);
                if (!presetType || !hasPreset) {
                    console.warn(`SmartRetry: Cannot fix error. Type: ${presetType}, HasPreset: ${hasPreset}`);
                    throw err;
                }

                // Log and Fix
                console.warn(`Upstream error (${presetType}) on ${hostName}. Removing and retrying...`);
                config.presets = config.presets.filter(p => p.type !== presetType);
            }
        }
    }

    // Create a new AIOStreams manifest based on the provided parameters.
    static async populateJSON(providersMap, debridioKey, tmdbAccessToken, formatterName, formatterDefinition, exclude4k, excludeDolby, maxSize) {
        // Fetch the AIOStreams config file to use as a template.
        let aiostreamsConfig;
        try {
            // Force no-store to bypass browser cache
            // This ensures we get the newest config each time
            aiostreamsConfig = await Network.request("config/aiostreams-config.json", { cache: 'no-store' });

            // Insert TMDB Access Token
            aiostreamsConfig.tmdbAccessToken = tmdbAccessToken;

            if (exclude4k) {
                aiostreamsConfig.preferredResolutions = aiostreamsConfig.preferredResolutions.filter(res => res !== "2160p");
                aiostreamsConfig.excludedResolutions.push("2160p");
            }

            if (excludeDolby) {
                const dvTags = aiostreamsConfig.preferredVisualTags.filter(tag => tag.includes("DV"));
                aiostreamsConfig.preferredVisualTags = aiostreamsConfig.preferredVisualTags.filter(tag => !tag.includes("DV"));
                aiostreamsConfig.excludedVisualTags.push(...dvTags);
            }

            if (maxSize !== "unlimited") {
                const maxBytes = parseInt(maxSize) * 1000 * 1000 * 1000;
                aiostreamsConfig.size.global.movies[1] = maxBytes;
                aiostreamsConfig.size.global.series[1] = maxBytes;
                aiostreamsConfig.size.global.anime[1] = maxBytes;
            }

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
                                if (formatterName === "Snoak") { // This is a special case for Snoak
                                    if (item.name.startsWith("Remux")) item.name = "  🥇";
                                    if (item.name.startsWith("Bluray")) item.name = "  🥈";
                                    if (item.name.startsWith("Web")) item.name = "  🥉";
                                }
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
