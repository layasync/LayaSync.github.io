/* AIOStreams Capture Strategy Module
 * Every capture strategy should implement the following methods:
 * - isMatch(addon): boolean
 * - capture(addon): Promise<state>
 * - restore(addonUrl, state): Promise<string|null>
 */
class AIOStreamsStrategy {
    constructor() {
        this.id = 'aiostreams';
    }

    // Check if the addon is an AIOStreams addon
    isMatch(addon) {
        if (!addon.transportUrl) {
            return false;
        }

        // Strict URL parsing.
        // Convert the manifest URL to a URL object to ensure it's valid.
        const urlObj = new URL(addon.transportUrl);
        const hostname = urlObj.hostname;
        const id = (addon.manifest && addon.manifest.id) || "";

        // Check 1: Use AIOStreamsAPI.HOSTS if available
        // If the addon manifest URL starts with any of the hosts in AIOStreamsAPI.HOSTS, it is an AIOStreams addon
        if (typeof AIOStreamsAPI !== 'undefined' && AIOStreamsAPI.HOSTS) {
            const hosts = Object.values(AIOStreamsAPI.HOSTS);
            if (hosts.some(host => addon.transportUrl.startsWith(host))) {
                return true;
            }
        }

        // Check 2: This is a fallback check.
        // If the addon URL Hostname contains 'aiostreams', it is an AIOStreams addon
        if (hostname.includes('aiostreams')) {
            return true;
        }

        // Check 3: If the addon ID or name contains 'aiostreams', it is an AIOStreams addon
        // We check for /stremio/ in the URL to prevent wrapped tools from being detected as an AIOStreams addon.
        const isAioId = id.includes('aiostreams') || (addon.manifest && addon.manifest.name && addon.manifest.name.toLowerCase().includes('aiostreams'));
        const hasStremioPath = urlObj.pathname.includes('/stremio/');

        return isAioId && hasStremioPath;
    }

    // Capture AIOStreams settings
    async capture(addon) {
        const manifestUrl = addon.transportUrl;
        const uuidMatch = manifestUrl.match(/\/stremio\/([^\/]+)/);
        if (!uuidMatch) {
            // If we can't find the UUID, we can't capture the addon
            throw new Error("AIOStreams addon detected, but could not find UUID in manifest URL: " + manifestUrl);
        }

        // Get the UUID and host from the manifest URL
        const uuid = uuidMatch[1];
        const host = new URL(manifestUrl).origin;

        // Try persistent stored password first
        let password = TimeMachineStorage.getAioPassword(uuid);

        // If we have a password, try to fetch the config
        if (password) {
            try {
                // Use API method
                const config = await AIOStreamsAPI.getConfig(host, uuid, password);
                if (!config) {
                    throw new Error("No data returned from AIOStreams");
                }
                return { uuid, host, password, config };
            } catch (err) {
                if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                    console.warn('Stored AIOStreams password failed (401), prompting user', err);
                    TimeMachineStorage.setAioPassword(uuid, null);
                } else {
                    // For network/proxy errors, we should probably fail fast too, or at least warn specifically.
                    // But to be safe and consistent with previous behavior (fallback to prompt), we'll just log loudly.
                    console.warn(`Stored AIOStreams password failed to connect to ${host}: ${err.message}. Falling back to prompt user.`);
                    TimeMachineStorage.setAioPassword(uuid, null);
                }
            }
        }

        // At this point, we either don't have a password or it failed

        // Prompt user for their password
        const input = await Modal.prompt(
            `Enter password for <b>${addon.manifest.name}</b> to back up its deep configuration (AIOStreams).`,
            "",
            "Deep Snapshot Auth"
        );

        // If the user doesn't enter a password, abort the snapshot
        if (!input) {
            const err = new Error('Password is required for AIOStreams deep snapshot. Snapshot aborted.');
            throw err;
        }
        password = input.trim();

        try {
            // Use API method
            const config = await AIOStreamsAPI.getConfig(host, uuid, password);
            if (!config) {
                throw new Error("No data returned from AIOStreams");
            }

            TimeMachineStorage.setAioPassword(uuid, password);
            return { uuid, host, password, config };
        } catch (err) {
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
                TimeMachineStorage.setAioPassword(uuid, null);
                const userErr = new Error('Incorrect password for AIOStreams.');
                throw userErr;
            } else {
                // For other errors
                const wrappedError = new Error("AIOStreams: " + err.message);
                throw wrappedError;
            }
        }
    }

    // Restore AIOStreams settings
    async restore(addonUrl, state) {
        const uuid = state.uuid;
        const host = state.host;
        const password = state.password;
        const config = state.config;

        // Attempt 1: Update existing configuration
        try {
            // Try to update existing user first
            const json = await AIOStreamsAPI.updateConfig(host, uuid, password, config);
            const returnedUuid = json.data && json.data.uuid;
            const returnedEncrypted = json.data && json.data.encryptedPassword;

            // We have to construct the manifest URL ourselves since the API doesn't return it
            let newManifestUrl = null;

            if (returnedUuid && returnedEncrypted) {
                // We default to 'stremio' compatibility mode for restored sessions
                newManifestUrl = AIOStreamsAPI.constructManifestUrl(host, returnedUuid, returnedEncrypted, 'stremio');
            }

            // Return the new URL if it's different from the original
            if (newManifestUrl && newManifestUrl !== addonUrl) {
                return newManifestUrl;
            }

            return null;
        } catch (updateErr) {
            console.warn("AIOStreams update failed, attempting to create new manifest...", updateErr);
        }

        // Attempt 2: Create new configuration (if update failed)
        try {
            // Use dedicated method for creation from raw config
            const { uuid, encryptedPassword } = await AIOStreamsAPI.installConfig(host, password, config);
            if (uuid && encryptedPassword) {
                // This assumes 'stremio' compatibility mode
                return AIOStreamsAPI.constructManifestUrl(host, uuid, encryptedPassword, 'stremio');
            }
        } catch (createErr) {
            // If creation also fails, we propagate the error up.
            throw createErr;
        }

        // If we got here without returning or throwing, something unexpected happened.
        throw new Error("AIOStreams restore failed: Unable to update or create configuration.");
    }
}

// Register strategy
if (window.DeepSnapshotManager) {
    DeepSnapshotManager.register(new AIOStreamsStrategy());
} else {
    // The DeepSnapshotManager should be loaded before strategies
    throw new Error("DeepSnapshotManager not found when registering AIOStreamsStrategy");
}
