/**
 * Deep Snapshot Manager
 * Handles logic for addons that require "Deep Snapshotting" (server-side config backup/restore).
 */
class DeepSnapshotManagerInternal {
    constructor() {
        this.strategies = [];
    }

    register(strategy) {
        this.strategies.push(strategy);
    }

    getStrategy(addon) {
        return this.strategies.find(s => s.isMatch(addon));
    }

    // Loop through all addons
    // If an addon has a deep clone strategy, capture it
    // This is used for addons that require server-side config backup/restore
    // (e.g., AIOStreams & AIOMetadata)
    async captureAll(addons) {
        const deepStates = {};

        // Loop through all addons
        for (const addon of addons) {
            // Get the deep clone strategy for the addon
            const strategy = this.getStrategy(addon);

            // If the addon has a deep clone strategy, capture it
            if (strategy) {
                console.log("Deep capturing addon: " + addon.manifest.name);
                const state = await strategy.capture(addon);
                if (state) {
                    deepStates[addon.transportUrl] = {
                        handler: strategy.id,
                        state: state
                    };
                }
            }
        }
        return deepStates;
    }

    // Restore deep state for a snapshot
    // This is used for addons that require server-side config backup/restore
    // (e.g., AIOStreams & AIOMetadata)
    async restoreAll(snapshot) {
        const deepData = snapshot.deepData || {};
        const results = {
            changed: {},
            errors: [] // Collect errors here
        };

        for (const addonUrl of Object.keys(deepData)) {
            const entry = deepData[addonUrl];
            const strategy = this.strategies.find(s => s.id === entry.handler);

            if (strategy && entry.state) {
                try {
                    console.log("Deep restoring addon: " + addonUrl + " via " + strategy.id);
                    const res = await strategy.restore(addonUrl, entry.state); // may return new URL or null

                    if (res && typeof res === 'string') {
                        results.changed[addonUrl] = res;
                    }
                } catch (err) {
                    // Collect the error. They'll be reported in TimeMachine.js
                    console.error("Failed to deep restore " + addonUrl + ": " + err);
                    results.errors.push(err);
                }
            }
        }
        return results;
    }
}

// Expose manager globally for strategies to register themselves
window.DeepSnapshotManager = new DeepSnapshotManagerInternal();
