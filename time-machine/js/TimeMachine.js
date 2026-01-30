/**
 * TimeMachine
 * 
 * Main application logic for the Stremio Time Machine (Snapshot Manager).
 */
class TimeMachine {
    constructor() {
        // Variables to keep track of state
        this.currentUserEmail = null;
        this.activeSnapshotId = null;

        // Define references to the UI elements
        this.ui = {
            views: {
                login: document.getElementById('loginView'),
                dashboard: document.getElementById('dashboardView')
            },
            forms: {
                login: document.getElementById('loginForm')
            },
            buttons: {
                login: document.getElementById('loginBtn'),
                createSnapshot: document.getElementById('createSnapshotBtn')
            },
            containers: {
                userStatus: document.getElementById('userStatus'),
                timeline: document.getElementById('timelineSection'),
                // Dynamic elements will be fetched when needed
            }
        };
    }

    // Initialize the app
    init() {
        this.attachEventListeners();
        this.exposeGlobalHelpers();
        this.showLogin(); // Default state
    }

    // Listen for user interactions
    attachEventListeners() {
        // Login Form Submit
        // We reference this.ui.form and "submit" to handle the submit button rather than this.ui.submitBtn
        // because doing it this way also captures when the user presses enter while focused on the form
        this.ui.forms.login.addEventListener('submit', (e) => this.handleLogin(e));

        // Create Snapshot Click
        this.ui.buttons.createSnapshot.addEventListener('click', () => this.handleCreateSnapshot());
    }

    // Expose class methods to the global scope (`window`)
    // because the HTML uses inline `onclick` handlers.
    exposeGlobalHelpers() {
        window.editSnapshotNote = (id) => this.editSnapshotNote(id);
        window.restoreSnapshot = (id, btn) => this.restoreSnapshot(id, btn);
        window.deleteSnapshot = (id) => this.deleteSnapshot(id);
        window.createFallbackIconSpan = () => this.createFallbackIconSpan();
    }

    // ---------------------------------------------------------
    // Navigation & View Logic
    // ---------------------------------------------------------

    // Show a specific view
    showView(viewName) {
        Object.values(this.ui.views).forEach(el => el.classList.add('hidden'));
        if (this.ui.views[viewName]) {
            this.ui.views[viewName].classList.remove('hidden');
        }
    }

    // Show the login view
    showLogin() {
        this.currentUserEmail = null;
        this.updateUserStatus();
        this.showView('login');
    }

    // Show the dashboard view
    showDashboard(email) {
        this.currentUserEmail = email;
        this.updateUserStatus();
        this.showView('dashboard');
        this.renderUserTimeline();
    }

    // Update the user status display
    updateUserStatus() {
        const userStatus = this.ui.containers.userStatus;

        // If no user is logged in, hide the status
        if (!this.currentUserEmail) {
            userStatus.classList.add('hidden');
            userStatus.innerHTML = '';
            return;
        }

        // If a user is logged in, show the status
        userStatus.classList.remove('hidden');
        userStatus.innerHTML = `
            <div class="user-status-pill">
                <span>Logged in as <b>${this.currentUserEmail}</b></span>
                <span class="logout-link" id="logoutLink">Logout</span>
            </div>
        `;

        // Add logout functionality
        document.getElementById('logoutLink').onclick = () => this.showLogin();
    }

    // ---------------------------------------------------------
    // Core Logic (Handlers)
    // ---------------------------------------------------------

    // When the login form is submitted
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // If the user doesn't provide an email and password, do nothing
        if (!email || !password) return;

        // Capture the text of the login button
        // We do this so the single source of truth for the button text is the HTML
        const loginBtnText = this.ui.buttons.login.textContent;

        // Disable the login button and show a loading spinner
        this.ui.buttons.login.disabled = true;
        this.ui.buttons.login.innerHTML = '<span class="loading-spinner"></span> Logging in...';

        try {
            // Authenticate (using Stremio API)
            await StremioAPI.login(email, password);

            // Show the dashboard for that user
            this.showDashboard(email);
        } catch (err) {
            ErrorHandler.handle(err, { method: "handleLogin" }, "Login Failed");
        } finally {
            this.ui.buttons.login.disabled = false;
            this.ui.buttons.login.innerHTML = loginBtnText;
        }
    }

    // When the create snapshot button is clicked
    async handleCreateSnapshot() {
        // If no user is logged in, do nothing
        // This should never happen because the button is disabled if no user is logged in
        if (!this.currentUserEmail) {
            return;
        }

        // Capture the text of the create snapshot button
        // We do this so the single source of truth for the button text is the HTML
        const createSnapshotBtnText = this.ui.buttons.createSnapshot.textContent;

        // Disable the create snapshot button and show a loading spinner
        this.ui.buttons.createSnapshot.disabled = true;
        this.ui.buttons.createSnapshot.innerHTML = '<span class="loading-spinner"></span> Creating...';

        try {
            // Fetch Addons (using Stremio API)
            const addons = await StremioAPI.getAddons();

            // Deep Capture (for stateful addons like AIOStreams and AIOMetadata)
            const deepData = await DeepSnapshotManager.captureAll(addons);

            // Save to Storage
            const snapshot = TimeMachineStorage.addSnapshot(this.currentUserEmail, addons, "", deepData);

            // Refresh View (Switch to new snapshot)
            this.activeSnapshotId = snapshot.id;
            this.renderUserTimeline();

            // Feedback
            this.ui.buttons.createSnapshot.innerHTML = '<span class="btn-icon">🎉</span> Snapshot Created!';
            setTimeout(() => {
                this.ui.buttons.createSnapshot.innerHTML = createSnapshotBtnText;
                this.ui.buttons.createSnapshot.disabled = false;
            }, 2000);
        } catch (err) {
            ErrorHandler.handle(err, { method: "handleCreateSnapshot" }, "Snapshot Failed");
        } finally {
            this.ui.buttons.createSnapshot.innerHTML = createSnapshotBtnText;
            this.ui.buttons.createSnapshot.disabled = false;
        }
    }

    // When the edit snapshot note button is clicked
    async editSnapshotNote(snapshotId) {
        // Get current note from storage
        const snapshots = TimeMachineStorage.getSnapshots(this.currentUserEmail);
        const snapshot = snapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            return; // Snapshot not found
        }

        const currentNote = snapshot.note || "";

        // Custom Modal Prompt
        const newNote = await Modal.prompt("Enter a note for this snapshot:", currentNote, "Edit Note");
        if (newNote === null) {
            // The user cancelled the prompt
            return;
        }

        // allow empty string to clear note
        TimeMachineStorage.updateSnapshotNote(this.currentUserEmail, snapshotId, newNote.trim());

        // Refresh UI
        this.renderUserTimeline();
    }

    // When the restore snapshot button is clicked
    async restoreSnapshot(id, btnElement) {
        // Find the snapshot to restore
        const snapshots = TimeMachineStorage.getSnapshots(this.currentUserEmail);
        const snapshot = snapshots.find(s => s.id === id);

        if (!snapshot) {
            console.error(`Snapshot ${id} not found`);
            return;
        }

        const confirmed = await Modal.confirm(
            `Are you sure you want to restore to the snapshot from <b>${new Date(snapshot.timestamp).toLocaleString()}</b>? <br><br>This will overwrite your current addons with the ${snapshot.addonCount} addons in this snapshot.`,
            "Restore Snapshot"
        );

        if (!confirmed) {
            console.log("User cancelled restore");
            return;
        }

        // UI Feedback
        const restoreBtn = btnElement || document.querySelector('.restore-btn');
        const originalText = restoreBtn.textContent;
        if (restoreBtn) {
            restoreBtn.innerHTML = `<span class="loading-spinner"></span> Restoring...`;
            restoreBtn.disabled = true;
        }

        try {
            // Deep Restore Phase
            const deepResults = await DeepSnapshotManager.restoreAll(snapshot);

            // Failed deep restores should be reported to HoneyBadger
            if (deepResults.errors && deepResults.errors.length > 0) {
                console.warn("Deep restore encountered errors.");
                deepResults.errors.forEach(err => ErrorHandler.report(err, { method: 'restoreSnapshot_deep' }));
            }

            // Failed deep restores should abort the restore process
            if (deepResults.errors.length > 0) {
                const error = new Error("Deep restore failed for addon(s). Restoration aborted to protect your configuration.");
                error.debugDetails = deepResults.errors.map(e => e.message || e.toString());
                throw error;
            }

            // If any deep restore produced new addon URLs, update snapshot addons in storage
            // This is critical for addons like AIOStreams where restoring the config to the server
            // might generate a brand new manifest URL (new UUID/Encryption Key).
            // We must update our local snapshot to point to this new "live" URL so that:
            // 1. The immediate restoration (setAddons) uses the valid URL.
            // 2. Future restorations from this snapshot use the valid URL.
            if (deepResults.changed && Object.keys(deepResults.changed).length > 0) {
                const updatedSnapshots = TimeMachineStorage.getSnapshots(this.currentUserEmail);
                const idx = updatedSnapshots.findIndex(s => s.id === snapshot.id);
                if (idx !== -1) {
                    const addons = updatedSnapshots[idx].addons;
                    Object.entries(deepResults.changed).forEach(([oldUrl, newUrl]) => {
                        const ai = addons.find(a => a.transportUrl === oldUrl);
                        if (ai) ai.transportUrl = newUrl;
                    });
                    TimeMachineStorage.saveSnapshots(this.currentUserEmail, updatedSnapshots);
                    // Refresh local ref
                    snapshot.addons = updatedSnapshots[idx].addons;
                }
            }

            // Standard Restore Phase
            await StremioAPI.setAddons(snapshot.addons);
            await Modal.alert("🎉 Account successfully restored!", "Success");
        } catch (err) {
            const context = { method: "restoreSnapshot" };
            if (err.debugDetails) context.deepRestoreErrors = err.debugDetails;
            ErrorHandler.handle(err, context, "Restore Failed");
        } finally {
            if (restoreBtn) {
                restoreBtn.innerHTML = originalText;
                restoreBtn.disabled = false;
            }
        }
    }

    // Delete a snapshot
    async deleteSnapshot(id) {
        const confirmed = await Modal.confirm(
            "Are you sure you want to permanently delete this snapshot?",
            "Delete Snapshot"
        );

        if (!confirmed) {
            // The user cancelled the confirmation
            return;
        }

        try {
            TimeMachineStorage.deleteSnapshot(this.currentUserEmail, id);

            if (this.activeSnapshotId === id) {
                this.activeSnapshotId = null;
            }

            this.renderUserTimeline();
        } catch (err) {
            ErrorHandler.handle(err, { method: "deleteSnapshot" });
        }
    }

    // ---------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------

    // Render the user timeline
    renderUserTimeline() {
        if (!this.currentUserEmail) {
            console.error('No current user found.');
            return;
        }
        const email = this.currentUserEmail;
        const snapshots = TimeMachineStorage.getSnapshots(email);
        this.ui.containers.timeline.innerHTML = '';

        // Empty State
        if (snapshots.length === 0) {
            this.ui.containers.timeline.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🕸️</span>
                    <p>No snapshots found.</p>
                    <p>Click "Create Snapshot Now" to start time traveling.</p>
                </div>
            `;
            return;
        }

        // Default to first (latest) if none active or active not found
        if (!this.activeSnapshotId || !snapshots.find(s => s.id === this.activeSnapshotId)) {
            this.activeSnapshotId = snapshots[0].id;
        }

        // Layout Structure
        // Dynamically create the stage and ticks
        this.ui.containers.timeline.innerHTML = `
            <div class="tm-stage" id="tmStage"></div>
            <div class="tm-ticks" id="tmTicks"></div>
        `;

        // Find the active snapshot and render the stage and ticks
        const activeSnapshot = snapshots.find(s => s.id === this.activeSnapshotId);
        this.renderStage(activeSnapshot);
        this.renderTicks(snapshots);
    }

    // Render the stage (the main content area)
    renderStage(snapshot) {
        // Find the stage element (dynamically created in renderUserTimeline)
        const stage = document.getElementById('tmStage');
        if (!snapshot) {
            // If no snapshot is provided, do nothing
            return;
        }

        const date = new Date(snapshot.timestamp);
        const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        const noteIcon = snapshot.note ? '📝' : '➕';
        const noteText = snapshot.note || 'Add a note...';
        const noteClass = snapshot.note ? 'has-note' : 'no-note';

        // Build the addons grid HTML
        let addonsHtml = '';
        if (snapshot.addons.length > 0) {
            addonsHtml = this.buildAddonsGridHtml(snapshot.addons);
        } else {
            addonsHtml = '<div style="text-align:center; padding:2rem; opacity:0.5;">No addons in this snapshot</div>';
        }

        stage.innerHTML = `
            <div class="tm-snapshot-view">
                <div class="tm-snapshot-header">
                    <div class="header-top">
                        <span class="tm-snapshot-date">${dateStr}</span>
                        <div class="tm-snapshot-note-container ${noteClass}" onclick="editSnapshotNote('${snapshot.id}')">
                            <span class="note-icon">${noteIcon}</span>
                            <span class="note-content">${noteText}</span>
                        </div>
                    </div>
                    
                    <div class="header-sub">
                        <span class="tm-snapshot-time">${timeStr}</span> 
                        <span class="separator">•</span>
                        <span class="badge-text">${snapshot.addonCount} Addons</span>
                    </div>
                </div>

                <div class="tm-snapshot-content">
                    ${addonsHtml}
                </div>

                <div class="tm-snapshot-footer">
                    <button class="icon-btn delete-btn" onclick="deleteSnapshot('${snapshot.id}')" title="Delete Snapshot">
                        🗑️
                    </button>
                    <button class="restore-btn" onclick="restoreSnapshot('${snapshot.id}', this)">
                        Restore This Version
                    </button>
                </div>
            </div>
        `;
    }

    // Render the timeline ticks (the sidebar with the snapshot dates)
    renderTicks(snapshots) {
        // Find the ticks container (dynamically created in renderUserTimeline)
        const ticksContainer = document.getElementById('tmTicks');

        snapshots.forEach(snap => {
            const date = new Date(snap.timestamp);
            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            const tick = document.createElement('div');
            tick.className = `tm-tick ${snap.id === this.activeSnapshotId ? 'active' : ''}`;

            let noteHtml = '';
            if (snap.note) {
                noteHtml = `<span class="tm-tick-note" title="${snap.note}">${snap.note}</span>`;
            }

            tick.innerHTML = `
                <span>${dateStr}</span>
                <span class="tm-tick-time">${timeStr}</span>
                ${noteHtml}
            `;

            // Add click handler to select snapshot
            tick.onclick = () => {
                this.activeSnapshotId = snap.id;
                this.renderUserTimeline();
            };

            ticksContainer.appendChild(tick);
        });
    }

    // Build the addons grid HTML
    buildAddonsGridHtml(addons) {
        let html = '<div class="addon-list">';

        addons.forEach(addon => {
            const manifest = addon.manifest || {};
            const name = manifest.name || "Unknown";
            const version = manifest.version || "0.0.0";
            const desc = manifest.description || "";
            const icon = manifest.logo || null;

            let addonIcon = '';
            if (icon) {
                addonIcon = `<img src="${icon}" class="addon-icon" onerror="this.replaceWith(createFallbackIconSpan())" />`;
            } else {
                addonIcon = `<div class="addon-icon-fallback">🧩</div>`;
            }

            html += `
                <div class="addon-item">
                    ${addonIcon}
                    <div class="addon-info">
                        <div class="addon-name" title="${name}">${name}</div>
                        <div class="addon-version">v${version}</div>
                        <div class="addon-desc">${desc}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    // Create a fallback icon span for addons without icons
    createFallbackIconSpan() {
        const span = document.createElement('div');
        span.className = 'addon-icon-fallback';
        span.textContent = '🧩';
        return span;
    }
}

// Initialize the app
const app = new TimeMachine();
app.init();
