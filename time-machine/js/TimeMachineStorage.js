/**
 * Time Machine Storage Layer
 * Handles persistence of Stremio account snapshots to localStorage.
 */

class TimeMachineStorage {
    static get STORAGE_KEY() { return 'stremio_time_machine_data'; }
    static get CURRENT_VERSION() { return 1; }

    // Load the entire storage object.
    static load() {
        const raw = localStorage.getItem(this.STORAGE_KEY);

        // If the storage is empty, initialize it.
        if (!raw) {
            return { version: this.CURRENT_VERSION, accounts: {} };
        }

        // Parse the storage object.
        try {
            return JSON.parse(raw);
        } catch (e) {
            window.sendErrorToHoneyBadger(e);
            Logger.error('TimeMachineStorage', "Failed to parse Time Machine storage", e);
            return { version: this.CURRENT_VERSION, accounts: {} };
        }
    }

    // Save the entire storage object.
    static save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    // Get all known accounts (email addresses).
    static getAccounts() {
        const data = this.load();
        return Object.keys(data.accounts);
    }

    // Get the snapshots for a specific account.
    static getSnapshots(email) {
        const data = this.load();
        const account = data.accounts[email];
        if (account) {
            return account.snapshots;
        }
        return [];
    }

    // Save a specific set of snapshots for an account.
    static saveSnapshots(email, snapshots) {
        const data = this.load();
        if (!data.accounts[email]) {
            data.accounts[email] = { snapshots: [] };
        }
        data.accounts[email].snapshots = snapshots;
        this.save(data);
    }

    // AIOStreams persistent password helpers
    static _ensureAioMap(data) {
        if (!data.aiostreamsPasswords) data.aiostreamsPasswords = {};
        return data.aiostreamsPasswords;
    }

    static getAioPassword(uuid) {
        const data = this.load();
        const map = data.aiostreamsPasswords || {};
        return map[uuid] || null;
    }

    static setAioPassword(uuid, password) {
        const data = this.load();
        this._ensureAioMap(data);
        if (password === null || typeof password === 'undefined') {
            delete data.aiostreamsPasswords[uuid];
        } else {
            data.aiostreamsPasswords[uuid] = password;
        }
        this.save(data);
    }

    // AIOMetadata persistent password helpers
    static _ensureAioMetadataMap(data) {
        if (!data.aiometadataPasswords) data.aiometadataPasswords = {};
        return data.aiometadataPasswords;
    }

    static getAioMetadataPassword(uuid) {
        const data = this.load();
        const map = data.aiometadataPasswords || {};
        return map[uuid] || null;
    }

    static setAioMetadataPassword(uuid, password) {
        const data = this.load();
        this._ensureAioMetadataMap(data);
        if (password === null || typeof password === 'undefined') {
            delete data.aiometadataPasswords[uuid];
        } else {
            data.aiometadataPasswords[uuid] = password;
        }
        this.save(data);
    }

    // Create and save a new snapshot for an account.
    static addSnapshot(email, addons, note = "", deepData = {}) {
        const snapshots = this.getSnapshots(email);

        const newSnapshot = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            addonCount: addons.length,
            note: note,
            addons: addons,
            deepData: deepData
        };

        snapshots.unshift(newSnapshot); // Add to beginning (newest first)
        this.saveSnapshots(email, snapshots);

        return newSnapshot;
    }

    // Delete a specific snapshot.
    static deleteSnapshot(email, snapshotId) {
        const data = this.load();
        if (data.accounts[email]) {
            data.accounts[email].snapshots = data.accounts[email].snapshots.filter(s => s.id !== snapshotId);
            this.save(data);
            return true;
        }
        return false;
    }

    // Update the note for a specific snapshot.
    static updateSnapshotNote(email, snapshotId, newNote) {
        const data = this.load();
        if (data.accounts[email]) {
            const snapshot = data.accounts[email].snapshots.find(s => s.id === snapshotId);
            if (snapshot) {
                snapshot.note = newNote;
                this.save(data);
                return true;
            }
        }
        return false;
    }
}

window.TimeMachineStorage = TimeMachineStorage;
