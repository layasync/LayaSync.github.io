/**
 * AddonLocker
 * 
 * Logic for the AddonLocker tool.
 * Allows users to control which addons can be edited or uninstalled.
 */
class AddonLocker {
    constructor() {
        // State
        this.state = {
            addons: [],
            isLoggedIn: false,
            isSaving: false,
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
        };
    }

    init() {
        this.ui.loginBtn?.addEventListener('click', (e) => this.handleLogin(e));
        this.switchView('login');
    }

    // Switch between Login and Main views
    switchView(viewName) {
        if (viewName === 'login') {
            this.ui.loginSection.classList.remove('hidden');
            this.ui.addonSection.classList.add('hidden');
            this.ui.loggedInHeader.style.display = 'none';
        } else if (viewName === 'app') {
            this.ui.loginSection.classList.add('hidden');
            this.ui.addonSection.classList.remove('hidden');
            this.ui.loggedInHeader.style.display = 'block';
        }
    }

    // Handle Login
    async handleLogin(e) {
        if (e) e.preventDefault();

        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value.trim();

        // Input validation
        if (!email || !password) {
            Modal.error("Please enter your Stremio email and password.");
            return;
        }

        this.setLoginLoading(true);

        try {
            // Login
            await StremioAPI.login(email, password);
            if (!StremioAPI.session || !StremioAPI.session.authKey) {
                throw new Error('Login failed: No session created.');
            }

            // Fetch Addons
            const addons = await StremioAPI.getAddons();
            this.state.addons = addons;
            this.state.isLoggedIn = true;

            // Update UI - Show logged in state
            this.showLoggedInUI(email);
            this.renderAddonList();
            this.switchView('app');

        } catch (error) {
            ErrorHandler.handle(error, { method: "AddonLocker.handleLogin" }, "Login Failed");
        } finally {
            this.setLoginLoading(false);
        }
    }

    // Handle Logout
    handleLogout(e) {
        if (e) e.preventDefault();

        this.state.addons = [];
        this.state.isLoggedIn = false;
        StremioAPI.session = null;

        // Reset UI
        this.ui.emailInput.value = '';
        this.ui.passwordInput.value = '';
        this.ui.addonContainer.innerHTML = '';
        this.switchView('login');
    }

    // Show logged in UI header
    showLoggedInUI(email) {
        // Render the pill style header
        this.ui.loggedInHeader.innerHTML = `
            <div class="user-status-pill">
                <span>Logged in as <b>${this.escapeHtml(email)}</b></span>
                <span class="logout-link" id="logoutLink">Logout</span>
            </div>
        `;

        // Attach logout listener now that element exists
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => this.handleLogout(e));
        }
    }

    // Render addon list
    renderAddonList() {
        const container = this.ui.addonContainer;
        container.innerHTML = '';

        if (!this.state.addons || this.state.addons.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path>
                    </svg>
                    <p>No addons found. Install some addons first!</p>
                </div>
            `;
            return;
        }

        this.state.addons.forEach((addon, index) => {
            const manifest = addon.manifest || {};
            const name = manifest.name || 'Unknown Addon';
            const logo = manifest.logo || null;

            // Determine permissions
            // Configuring: based on manifest.behaviorHints.configurable
            const canEdit = manifest.behaviorHints && manifest.behaviorHints.configurable;

            // Uninstalling: based on !flags.protected (if protected is true, cannot uninstall)
            const isProtected = addon.flags ? (addon.flags.protected === true) : false;
            const canUninstall = !isProtected;

            // Fallback icon logic
            let iconHtml = '';
            if (logo) {
                iconHtml = `<img src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(name)}" onerror="this.replaceWith(document.createElement('div')); this.nextElementSibling.style.display='flex'" />
                            <div class="addon-icon-fallback" style="display:none">🧩</div>`;
            } else {
                iconHtml = `<div class="addon-icon-fallback">🧩</div>`;
            }

            const item = document.createElement('div');
            item.className = 'addon-item';
            item.innerHTML = `
                <div class="addon-icon">
                    ${iconHtml}
                </div>
                <div class="addon-name" title="${this.escapeHtml(name)}">${this.escapeHtml(name)}</div>
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

            container.appendChild(item);
        });

        // Attach event listeners to all toggles
        this.attachToggleListeners();
    }

    // Attach toggle event listeners for immediate saves
    attachToggleListeners() {
        const toggles = this.ui.addonContainer.querySelectorAll('input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => this.handleToggleChange(e));
        });
    }

    // Handle toggle change
    async handleToggleChange(e) {
        const checkbox = e.target;
        const index = parseInt(checkbox.dataset.index);
        const type = checkbox.dataset.type; // 'edit' or 'uninstall'

        if (this.state.isSaving) return;

        // Optimistic UI update - we let the checkbox switch immediately
        // We also want to update the text immediately to feel responsive
        const statusSpan = checkbox.closest('.addon-control-pair').querySelector('.addon-control-status');
        const originalStatusText = statusSpan.textContent;
        const originalStatusClass = statusSpan.className; // Save strictly for revert

        // Apply optimistic text update
        if (checkbox.checked) {
            statusSpan.textContent = 'Allowed';
            statusSpan.classList.remove('blocked');
            statusSpan.classList.add('allowed');
        } else {
            statusSpan.textContent = 'Blocked';
            statusSpan.classList.remove('allowed');
            statusSpan.classList.add('blocked');
        }

        this.state.isSaving = true;

        try {
            // Identify the addon we want to modify from our current local state
            const targetAddon = this.state.addons[index];
            if (!targetAddon) throw new Error("Addon not found in local state.");

            // We use transportUrl as the unique identifier. 
            // Fallback to manifest.id if transportUrl is missing (though it shouldn't be for installed addons).
            const targetId = targetAddon.transportUrl || (targetAddon.manifest && targetAddon.manifest.id);

            if (!targetId) {
                throw new Error("Cannot identify addon uniquely (missing transportUrl and manifest.id).");
            }

            // 1. Fetch fresh list to avoid race conditions (wiping out other changes)
            const freshAddons = await StremioAPI.getAddons();

            // 2. Find our addon in the fresh list
            const freshIndex = freshAddons.findIndex(a =>
                (a.transportUrl && a.transportUrl === targetId) ||
                (a.manifest && a.manifest.id === targetId)
            );

            if (freshIndex === -1) {
                throw new Error("Addon has been removed externally. Please refresh.");
            }

            const freshAddon = freshAddons[freshIndex];

            // 3. Apply the change to the fresh addon
            if (type === 'uninstall') {
                // Toggle 'protected' flag
                if (!freshAddon.flags) freshAddon.flags = {};
                freshAddon.flags.protected = !checkbox.checked;
            }
            else if (type === 'edit') {
                // Toggle 'configurable' behavior hint
                if (!freshAddon.manifest.behaviorHints) freshAddon.manifest.behaviorHints = {};
                freshAddon.manifest.behaviorHints.configurable = checkbox.checked;
            }

            // 4. Save the FRESH list
            await StremioAPI.setAddons(freshAddons);

            // 5. Update local state to match the fresh list we just saved
            this.state.addons = freshAddons;
        } catch (error) {
            console.error("Failed to save addon settings:", error);

            // Revert changes on error
            checkbox.checked = !checkbox.checked;
            statusSpan.textContent = originalStatusText;
            statusSpan.className = originalStatusClass;

            ErrorHandler.handle(error, { method: "AddonLocker.handleToggleChange" }, "Failed to update settings. Changes reverted.");

            // If the error was severe (like addon missing), arguably we should refresh the whole list.
            if (error.message.includes("removed externally")) {
                this.handleLogin(null);
            }
        } finally {
            this.state.isSaving = false;
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Toggle Loading State for Login
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
const app = new AddonLocker();
app.init();
