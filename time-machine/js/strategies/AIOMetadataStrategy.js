/* AIOMetadata Capture Strategy Module
 * Every capture strategy should implement the following methods:
 * - isMatch(addon): boolean
 * - capture(addon): Promise<state>
 * - restore(addonUrl, state): Promise<string|null>
 */
class AIOMetadataStrategy {
    constructor() {
        this.id = 'aiometadata';
    }

    // Check if the addon is an AIOMetadata addon
    isMatch(addon) {
        if (!addon.transportUrl) {
            return false;
        }

        // Strict URL parsing.
        // Convert the manifest URL to a URL object to ensure it's valid.
        const urlObj = new URL(addon.transportUrl);
        const hostname = urlObj.hostname;
        const id = (addon.manifest && addon.manifest.id) || "";

        // Check 1: Use AIOMetadataAPI.HOSTS if available
        if (typeof AIOMetadataAPI !== 'undefined' && AIOMetadataAPI.HOSTS) {
            const hosts = Object.values(AIOMetadataAPI.HOSTS);
            if (hosts.some(host => addon.transportUrl.startsWith(host))) {
                return true;
            }
        }

        // Check 2: Fallback check for URL Hostname
        if (hostname.includes('aiometadata')) {
            return true;
        }

        // Check 3: Check ID or name
        // We also check for '/stremio/' in the URL to ensure it's a standard instance and not a wrapper.
        // We check for /stremio/ in the URL to prevent tools like https://ratingswrapper-production.up.railway.app
        // from being detected as an AIOMetadata addon.
        const isAioId = id.includes('aio-metadata') || (addon.manifest && addon.manifest.name && addon.manifest.name.toLowerCase().includes('aiometadata'));
        const hasStremioPath = urlObj.pathname.includes('/stremio/');

        return isAioId && hasStremioPath;
    }

    // Capture AIOMetadata settings
    async capture(addon) {
        const manifestUrl = addon.transportUrl;

        // Try standard Stremio addon URL pattern first
        const uuidMatch = manifestUrl.match(/\/stremio\/([^\/]+)/);
        let uuid = uuidMatch ? uuidMatch[1] : null;

        // If not found, try generic pattern (UUID is the part before manifest.json)
        if (!uuid) {
            const parts = manifestUrl.split('/');
            const manifestIndex = parts.indexOf('manifest.json');
            if (manifestIndex > 0) {
                uuid = parts[manifestIndex - 1];
            }
        }

        if (!uuid) {
            // If we can't find the UUID, we can't capture the addon
            return null;
        }

        // Get the host from the manifest URL
        const host = new URL(manifestUrl).origin;

        // Try persistent stored password first
        let password = TimeMachineStorage.getAioMetadataPassword(uuid);

        // If we have a password, try to fetch the config
        if (password) {
            try {
                // Use API method
                const config = await AIOMetadataAPI.getConfig(host, uuid, password);
                if (!config) {
                    throw new Error("No data returned from AIOMetadata.");
                }

                return { uuid, host, password, config: config };
            } catch (err) {
                console.warn('Stored AIOMetadata password failed, prompting user', err);
                TimeMachineStorage.setAioMetadataPassword(uuid, null);
            }
        }

        // Prompt user for their password
        const input = await Modal.prompt(
            `Enter password for <b>${addon.manifest.name}</b> to back up its deep configuration (AIOMetadata).`,
            "",
            "Deep Snapshot Auth"
        );

        // If the user doesn't enter a password, abort the snapshot
        if (!input) {
            throw new Error('Password is required for AIOMetadata deep snapshot. Snapshot aborted.');
        }
        password = input.trim();

        try {
            // Use API method
            const config = await AIOMetadataAPI.getConfig(host, uuid, password);
            if (!config) {
                throw new Error("No data returned from AIOMetadata.");
            }

            TimeMachineStorage.setAioMetadataPassword(uuid, password);
            return { uuid, host, password, config: config };
        } catch (err) {
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                TimeMachineStorage.setAioMetadataPassword(uuid, null);
                throw new Error('Incorrect password for AIOMetadata.');
            } else {
                // For other errors (like 404/521 Proxy Error), identify the server
                window.sendErrorToHoneyBadger(err);
                throw new Error("Failed to connect to AIOMetadata server (" + host + "): " + err.message);
            }
        }
    }

    // Restore AIOMetadata settings
    async restore(addonUrl, state) {
        const uuid = state.uuid;
        const host = state.host;
        const password = state.password;
        const config = state.config;

        try {
            // Try to update existing user first
            const json = await AIOMetadataAPI.setConfig(host, uuid, password, config);
            let newUrl = json.installUrl;

            // Return the new URL if it's different from the original
            if (newUrl && newUrl !== addonUrl) {
                return newUrl;
            }

            return null;
        } catch (err) {
            console.warn("AIOMetadata update failed, attempting to create new manifest...", err);
            try {
                // Use dedicated method for creation from raw config
                const newUrl = await AIOMetadataAPI.installConfig(host, password, config);
                if (newUrl) {
                    return newUrl;
                }
            } catch (createErr) {
                throw createErr;
            }

            throw err;
        }
    }
}

// Register strategy
if (window.DeepSnapshotManager) {
    DeepSnapshotManager.register(new AIOMetadataStrategy());
} else {
    // The DeepSnapshotManager should be loaded before strategies
    throw new Error("DeepSnapshotManager not found when registering AIOMetadataStrategy");
}
