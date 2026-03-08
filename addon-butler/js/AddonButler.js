
class AddonButler {
    constructor() {
        // State
        this.state = {
            addons: [],          // Current working copy (staged changes, not yet saved)
            savedOrder: [],      // Snapshot of server order at last successful save (array of IDs)
            savedAddons: [],     // Deep snapshot of full addon objects at last successful save
            isLoggedIn: false,
            isSaving: false,
            pendingChanges: false,  // True when there are unsaved toggle or reorder changes
        };

        // Drag state
        this.drag = {
            sourceIndex: null,
            targetIndex: null,
        };

        // DOM Elements
        this.ui = {
            loginSection: document.getElementById('loginSection'),
            addonSection: document.getElementById('addonSection'),

            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            loginBtn: document.getElementById('loginBtn'),

            loggedInHeader: document.getElementById('loggedInHeader'),
            addonContainer: document.getElementById('addonContainer'),

            reorderActions: document.getElementById('reorderActions'),
            applyReorderBtn: document.getElementById('applyReorderBtn'),
            cancelReorderBtn: document.getElementById('cancelReorderBtn'),
        };
    }

    init() {
        this.ui.loginBtn?.addEventListener('click', (e) => this.handleLogin(e));
        this.ui.applyReorderBtn?.addEventListener('click', () => this.applyReorder());
        this.ui.cancelReorderBtn?.addEventListener('click', () => this.cancelReorder());
        this.switchView('login');
    }

    // =========================================================
    // View Management
    // =========================================================

    switchView(viewName) {
        if (viewName === 'login') {
            this.ui.loginSection.classList.remove('hidden');
            this.ui.addonSection.classList.add('hidden');
            this.ui.loggedInHeader.style.display = 'none';
            this.setPendingNotice(false);
        } else if (viewName === 'app') {
            this.ui.loginSection.classList.add('hidden');
            this.ui.addonSection.classList.remove('hidden');
            this.ui.loggedInHeader.style.display = 'block';
        }
    }

    setPendingNotice(visible) {
        if (visible) {
            this.ui.reorderActions.classList.remove('hidden');
        } else {
            this.ui.reorderActions.classList.add('hidden');
        }
        this.state.pendingChanges = visible;
    }

    // =========================================================
    // Auth
    // =========================================================

    async handleLogin(e) {
        if (e) e.preventDefault();

        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value.trim();

        if (!email || !password) {
            Modal.error("Please enter your Stremio email and password.");
            return;
        }

        this.setLoginLoading(true);

        try {
            await StremioAPI.login(email, password);
            if (!StremioAPI.isAuthenticated()) {
                throw new Error('Login failed: No session created.');
            }

            const addons = await StremioAPI.getAddons();
            this.state.addons = addons;
            this.state.savedOrder = this._getOrderSnapshot(addons);
            this.state.savedAddons = this._deepCloneAddons(addons);
            this.state.isLoggedIn = true;

            this.showLoggedInUI(email);
            this.renderAddonList();
            this.switchView('app');

        } catch (error) {
            ErrorHandler.handle(error, { method: "AddonButler.handleLogin" }, "Login Failed");
        } finally {
            this.setLoginLoading(false);
        }
    }

    async handleLogout(e) {
        if (e) e.preventDefault();

        this.state.addons = [];
        this.state.savedOrder = [];
        this.state.savedAddons = [];
        this.state.isLoggedIn = false;
        this.state.pendingChanges = false;
        await StremioAPI.logout();

        this.ui.emailInput.value = '';
        this.ui.passwordInput.value = '';
        this.ui.addonContainer.innerHTML = '';
        this.switchView('login');
    }

    showLoggedInUI(email) {
        this.ui.loggedInHeader.innerHTML = `
            <div class="user-status-pill">
                <span>Logged in as <b>${this.escapeHtml(email)}</b></span>
                <span class="logout-link" id="logoutLink">Logout</span>
            </div>
        `;

        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => this.handleLogout(e));
        }
    }

    // =========================================================
    // Rendering
    // =========================================================

    renderAddonList() {
        const container = this.ui.addonContainer;
        container.innerHTML = '';

        if (!this.state.addons || this.state.addons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path>
                    </svg>
                    <p>No addons found. Install some addons first!</p>
                </div>
            `;
            return;
        }

        this.state.addons.forEach((addon, index) => {
            const item = this._buildAddonItem(addon, index);
            container.appendChild(item);
        });

        this._attachToggleListeners();
        this._attachDragListeners();
    }

    _buildAddonItem(addon, index) {
        const manifest = addon.manifest || {};
        const name = manifest.name || 'Unknown Addon';
        const logo = manifest.logo || null;

        const canEdit = !!(manifest.behaviorHints && manifest.behaviorHints.configurable);
        const isProtected = addon.flags ? (addon.flags.protected === true) : false;
        const canUninstall = !isProtected;

        let iconHtml = '';
        if (logo) {
                iconHtml = `<img src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
                        <div class="addon-icon-fallback" style="display:none">🧩</div>`;
            } else {
                iconHtml = `<div class="addon-icon-fallback">🧩</div>`;
            }

        const item = document.createElement('div');
        item.className = 'butler-addon-item';
        item.draggable = true;
        item.dataset.index = index;
        item.innerHTML = `
            <div class="butler-drag-handle" title="Drag to reorder">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5"/>
                    <circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/>
                    <circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/>
                    <circle cx="15" cy="19" r="1.5"/>
                </svg>
            </div>

            <div class="butler-addon-icon">
                ${iconHtml}
            </div>

            <div class="butler-addon-name" title="${this.escapeHtml(name)}">${this.escapeHtml(name)}</div>

            <div class="addon-controls">
                <div class="addon-control-pair">
                    <div class="control-header">
                        <span class="addon-control-label-text">Uninstalling</span>
                        <span class="addon-control-status ${canUninstall ? 'allowed' : 'blocked'}">${canUninstall ? 'Allowed' : 'Blocked'}</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-index="${index}" data-type="uninstall" ${canUninstall ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="control-divider"></div>

                <div class="addon-control-pair">
                    <div class="control-header">
                        <span class="addon-control-label-text">Configuring</span>
                        <span class="addon-control-status ${canEdit ? 'allowed' : 'blocked'}">${canEdit ? 'Allowed' : 'Blocked'}</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-index="${index}" data-type="edit" ${canEdit ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;

        return item;
    }

    // =========================================================
    // Toggle Listeners (Lock/Unlock)
    // =========================================================

    _attachToggleListeners() {
        const toggles = this.ui.addonContainer.querySelectorAll('input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => this.handleToggleChange(e));
        });
    }

    handleToggleChange(e) {
        const checkbox = e.target;
        const index = parseInt(checkbox.dataset.index);
        const type = checkbox.dataset.type;

        if (this.state.isSaving) return;

        // Update the status label to reflect the new toggle state
        const statusSpan = checkbox.closest('.addon-control-pair').querySelector('.addon-control-status');
        if (statusSpan) {
            if (checkbox.checked) {
                statusSpan.textContent = 'Allowed';
                statusSpan.classList.remove('blocked');
                statusSpan.classList.add('allowed');
            } else {
                statusSpan.textContent = 'Blocked';
                statusSpan.classList.remove('allowed');
                statusSpan.classList.add('blocked');
            }
        }

        // Stage the change in local state — do NOT call StremioAPI here.
        const targetAddon = this.state.addons[index];
        if (type === 'uninstall') {
            if (!targetAddon.flags) targetAddon.flags = {};
            targetAddon.flags.protected = !checkbox.checked;
        } else if (type === 'edit') {
            if (!targetAddon.manifest.behaviorHints) targetAddon.manifest.behaviorHints = {};
            targetAddon.manifest.behaviorHints.configurable = checkbox.checked;
        }

        // Enable the Apply Changes notice so the user can commit when ready.
        this.setPendingNotice(true);
    }

    // =========================================================
    // Drag-and-Drop Reorder
    // =========================================================

    _attachDragListeners() {
        const items = this.ui.addonContainer.querySelectorAll('.butler-addon-item');

        items.forEach((item) => {
            item.addEventListener('dragstart', (e) => this._onDragStart(e, item));
            item.addEventListener('dragend', (e) => this._onDragEnd(e, item));
            item.addEventListener('dragover', (e) => this._onDragOver(e, item));
            item.addEventListener('dragleave', (e) => this._onDragLeave(e, item));
            item.addEventListener('drop', (e) => this._onDrop(e, item));
        });
    }

    _onDragStart(e, item) {
        this.drag.sourceIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        e.dataTransfer.setData('text/plain', this.drag.sourceIndex);
    }

    _onDragEnd(e, item) {
        item.classList.remove('dragging');
        // Clean up any lingering drag-over highlights
        this.ui.addonContainer.querySelectorAll('.butler-addon-item').forEach(i => {
            i.classList.remove('drag-over');
        });
    }

    _onDragOver(e, item) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetIndex = parseInt(item.dataset.index);
        if (targetIndex !== this.drag.sourceIndex) {
            item.classList.add('drag-over');
        }
    }

    _onDragLeave(e, item) {
        item.classList.remove('drag-over');
    }

    _onDrop(e, item) {
        e.preventDefault();
        item.classList.remove('drag-over');

        const fromIndex = this.drag.sourceIndex;
        const toIndex = parseInt(item.dataset.index);

        if (fromIndex === null || fromIndex === toIndex) return;

        // Reorder the local state array
        const reordered = [...this.state.addons];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        this.state.addons = reordered;

        this.drag.sourceIndex = null;
        this.drag.targetIndex = null;

        // Re-render to reflect new order
        this.renderAddonList();

        // Check if order actually changed vs last-saved state — always show pending notice after a drop
        this.setPendingNotice(true);
    }

    // =========================================================
    // Apply / Cancel Reorder
    // =========================================================

    async applyReorder() {
        if (this.state.isSaving) return;
        this.state.isSaving = true;

        const applyBtn = this.ui.applyReorderBtn;
        const originalText = applyBtn.textContent;
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

        try {
            // Check whether the server state has changed since we loaded.
            // If so, refuse to overwrite — the user must reload.
            const serverAddons = await StremioAPI.getAddons();
            const serverSnapshot = this._getOrderSnapshot(serverAddons);
            const serverChanged =
                serverSnapshot.length !== this.state.savedOrder.length ||
                serverSnapshot.some((id, i) => id !== this.state.savedOrder[i]);

            if (serverChanged) {
                Modal.error(
                    "Your addon list has been modified from another device or session since you loaded this page. " +
                    "Please log out and log back in to reload your current addons before applying changes.",
                    "Addon List Changed"
                );
                return;
            }

            await StremioAPI.setAddons(this.state.addons);
            this.state.savedOrder = this._getOrderSnapshot(this.state.addons);
            this.state.savedAddons = this._deepCloneAddons(this.state.addons);
            this.setPendingNotice(false);
            Modal.success("Your changes have been saved.", "Changes Applied!");
        } catch (error) {
            ErrorHandler.handle(error, { method: "AddonButler.applyReorder" }, "Failed to save changes.");
        } finally {
            this.state.isSaving = false;
            applyBtn.disabled = false;
            applyBtn.textContent = originalText;
        }
    }

    cancelReorder() {
        // Restore the full addon state from the deep snapshot taken at last save.
        // This reverts both reorder changes AND any staged toggle changes.
        this.state.addons = this._deepCloneAddons(this.state.savedAddons);
        this.setPendingNotice(false);
        this.renderAddonList();
    }

    // =========================================================
    // Helpers
    // =========================================================

    /** Returns a stable array of IDs representing addon order */
    _getOrderSnapshot(addons) {
        return addons.map(a => a.transportUrl || (a.manifest && a.manifest.id) || '');
    }

    /** Returns a deep clone of an addons array so snapshots are immutable */
    _deepCloneAddons(addons) {
        return JSON.parse(JSON.stringify(addons));
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        // Coerce non-strings (e.g. numeric manifest IDs) before calling replace.
        const str = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return str.replace(/[&<>"']/g, m => map[m]);
    }

    setLoginLoading(isLoading) {
        if (isLoading) {
            this.ui.loginBtn.disabled = true;
            this.ui.loginBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
            this.ui.emailInput.disabled = true;
            this.ui.passwordInput.disabled = true;
        } else {
            this.ui.loginBtn.disabled = false;
            this.ui.loginBtn.textContent = 'Load Addons';
            this.ui.emailInput.disabled = false;
            this.ui.passwordInput.disabled = false;
        }
    }
}

// Initialize
const app = new AddonButler();
app.init();
