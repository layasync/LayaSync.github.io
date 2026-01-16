/**
 * QuickStart
 * 
 * Main application logic for the Stremio QuickStart tool.
 */
class QuickStart {
    constructor() {
        // Supported debrid providers
        this.PROVIDER_CONFIG = {
            torbox: {
                name: "TorBox",
                signup: "https://torbox.app/subscription?referral=7a2aa2e2-337b-4302-ab41-7ecf1caf0cf1",
                api: "https://torbox.app/settings",
            },
            realdebrid: {
                name: "Real-Debrid",
                signup: "https://real-debrid.com/",
                api: "https://real-debrid.com/apitoken",
            },
            premiumize: {
                name: "Premiumize",
                signup: "https://www.premiumize.me/register",
                api: "https://www.premiumize.me/account",
            },
            alldebrid: {
                name: "AllDebrid",
                signup: "https://alldebrid.com/?uid=3n8qa&lang=en",
                api: "https://alldebrid.com/apikeys",
            },
        };

        // State
        this.mode = 'account'; // 'account' or 'manifest'

        // UI References
        this.ui = {
            form: document.getElementById("setupForm"),
            providerGroup: document.getElementById("providerGroup"),
            apiKeysContainer: document.getElementById("apiKeysContainer"),
            signupLink: document.getElementById("signupLink"),
            submitBtn: document.getElementById("submitBtn"),
            // Account Mode Inputs
            emailInput: document.getElementById("email"),
            passwordInput: document.getElementById("password"),
            generateBtn: document.getElementById("generateCredsBtn"),
            // Shared Inputs
            debridioInput: document.getElementById("debridioKey"),
            aiostreamsHostSelect: document.getElementById("aiostreamsHost"),
            // Mode Switching
            tabButtons: document.querySelectorAll('.tab-btn'),
            modeAccount: document.getElementById("mode-account"),
            modeManifest: document.getElementById("mode-manifest"),
            // Manifest Mode Inputs
            aiostreamsPasswordInput: document.getElementById("aiostreamsPassword"),
            cleanDuckStreamsCheckbox: document.getElementById("cleanDuckStreams"),
        };
    }

    // Initialize the app
    init() {
        this.populateAIOStreamsHostsSelect();

        // Initialize Clipboard
        if (window.Clipboard) {
            Clipboard.setup();
        }

        // Tab Event Listeners
        this.ui.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Event Listeners
        this.ui.generateBtn.addEventListener("click", () => this.handleGenerateCreds());
        this.ui.submitBtn.addEventListener("click", (e) => this.handleSubmit(e));

        // Listen for changes on any checkbox within the provider group
        this.handleDebridProviderChange(); // Initialize the checkboxes to their default state
        this.ui.providerGroup.addEventListener("change", (e) => {
            if (e.target.type === "checkbox") {
                this.handleDebridProviderChange();
            }
        });

        // Initialize UI state based on default mode
        this.switchMode(this.mode);
    }

    switchMode(mode) {
        this.mode = mode;

        // Update Tabs
        this.ui.tabButtons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update UI
        if (mode === 'account') {
            this.ui.modeManifest.classList.add('hidden');
            this.ui.modeAccount.classList.remove('hidden');
            this.ui.cleanDuckStreamsCheckbox.disabled = false;
            this.ui.submitBtn.textContent = "Start Setup";
        } else {
            this.ui.modeAccount.classList.add('hidden');
            this.ui.modeManifest.classList.remove('hidden');
            this.ui.submitBtn.textContent = "Generate Manifest";
            this.ui.cleanDuckStreamsCheckbox.disabled = true;
            this.ui.cleanDuckStreamsCheckbox.checked = false;
        }
    }

    populateAIOStreamsHostsSelect() {
        // Clear existing options
        this.ui.aiostreamsHostSelect.innerHTML = "";

        // Add Auto option
        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.textContent = "Auto (Recommended)";
        autoOption.selected = true;
        this.ui.aiostreamsHostSelect.appendChild(autoOption);

        // Add the rest of the AIOStreams hosts
        Object.entries(AIOStreamsAPI.HOSTS).forEach((entry) => {
            const name = entry[0];
            const url = entry[1];
            const option = document.createElement("option");
            option.value = url;
            option.textContent = name;
            this.ui.aiostreamsHostSelect.appendChild(option);
        });
    }


    // --- Frontend Methods ---


    // The user wants to generate random credentials
    handleGenerateCreds() {
        this.ui.emailInput.value = CredentialGenerator.generateRandomEmail();
        this.ui.passwordInput.value = CredentialGenerator.generateRandomPassword();

        // Flashing effect to show update
        const inputs = [this.ui.emailInput, this.ui.passwordInput];
        inputs.forEach(el => {
            el.style.transition = "background-color 0.2s";
            el.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
            setTimeout(() => el.style.backgroundColor = "", 300);
        });
    }

    // The user selected a debrid provider
    handleDebridProviderChange() {
        const selectedProviders = this.getSelectedDebridProviders();
        this.ui.apiKeysContainer.innerHTML = ""; // Clear existing inputs
        this.ui.signupLink.innerHTML = ""; // Clear existing links

        if (selectedProviders.length === 0) {
            // Show placeholder if no provider selected
            const placeHolder = document.createElement("div");
            placeHolder.className = "field";
            placeHolder.innerHTML = `
                <label>API Key</label>
                <input type="text" placeholder="Select at least one provider above" disabled>
             `;
            this.ui.apiKeysContainer.appendChild(placeHolder);
            return;
        }

        // For each selected provider, create a HTML input field
        selectedProviders.forEach(providerId => {
            const config = this.PROVIDER_CONFIG[providerId];
            if (!config) {
                // Show error modal to user and report it to Honeybadger
                const err = new Error("No internal config found for provider: " + providerId);
                Modal.error(err.message);
                window.handleError(err);
                return;
            }

            const field = document.createElement("div");
            field.className = "field";

            // Create header container for Label + Link
            const header = document.createElement("div");
            header.style.display = "flex";
            header.style.justifyContent = "space-between";
            header.style.alignItems = "baseline";

            // Create title label for input field
            const label = document.createElement("label");
            label.textContent = `${config.name} API Key`;
            label.htmlFor = `apiKey_${providerId}`;
            label.style.marginBottom = "0"; // Remove bottom margin as header handles spacing

            // Create links container (Get Key | Sign Up)
            const linksDiv = document.createElement("div");
            linksDiv.style.fontSize = "0.75rem";
            linksDiv.style.color = "var(--text-secondary)";

            linksDiv.innerHTML = `
                <a href="${config.api}" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:none;">Get Key</a>
                <span style="margin: 0 6px; opacity: 0.3;">|</span>
                <a href="${config.signup}" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:none;">Sign Up</a>
            `;

            // Append to header
            header.appendChild(label);
            header.appendChild(linksDiv);

            // Create input field for API key
            const input = document.createElement("input");
            input.type = "text";
            input.id = `apiKey_${providerId}`;
            input.style.marginTop = "0.5rem"; // Add spacing between header and input
            input.name = `apiKey_${providerId}`; // beneficial for form data handling
            input.placeholder = `Enter your ${config.name} API Key`;
            input.required = true;
            input.autocomplete = "off";
            input.spellcheck = false;

            // Add the new fields to the UI
            field.appendChild(header);
            field.appendChild(input);
            this.ui.apiKeysContainer.appendChild(field);
        });
    }


    // --- Helper Methods ---


    // Get random TMDB read access token from tmdb-api-keys.json
    async generateRandomTmdbCredentials() {
        let readAccessToken = "";

        try {
            const TMDB_KEYS_URL = "tmdb-api-keys.json"; // Relative to index.html
            // Force no-store to bypass browser cache
            // This ensures we get the newest keys each time
            const keys = await Network.request(TMDB_KEYS_URL, { cache: 'no-store' });
            if (!keys || keys.length === 0) {
                // This will get caught by the catch block in handleSubmit
                throw new Error("No TMDB keys found in the configuration file.");
            }

            const randomIndex = Math.floor(Math.random() * keys.length);
            const randomEntry = keys[randomIndex];

            readAccessToken = randomEntry.v4ReadAccessToken;
        } catch (err) {
            throw err;
        }

        return readAccessToken;
    }

    // Get all checked debrid providers which are just the values of the checked checkboxes
    getSelectedDebridProviders() {
        const checkboxes = this.ui.providerGroup.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }


    // --- Backend Methods ---


    async handleSubmit(e) {
        e.preventDefault();
        this.ui.submitBtn.disabled = true;
        this.ui.submitBtn.innerHTML = '<span class="loading-spinner"></span> Working...';

        try {
            // 1. Gather Data
            const formData = this.getFormData();
            if (!formData) return; // Validation failed (modal already shown)

            let isNewAccount = false;
            const stremioEmail = formData.email;
            const password = formData.password;
            const providersMap = formData.providersMap;
            const debridioKey = formData.debridioKey;
            const cleanupOldInstalls = formData.cleanupOldInstalls;

            // 2. Setup Stremio Account (Only if mode is account)
            if (this.mode === 'account') {
                isNewAccount = await this.setupStremioAccount(stremioEmail, password, cleanupOldInstalls);
            } else {
                // Manifest-only mode: password is already retrieved from form data
                // No action needed here
            }

            // 3. Create AIOStreams Manifest
            const manifestUrl = await this.createAIOStreamsManifest(password, providersMap, debridioKey);

            if (this.mode === 'account') {
                // 4. Install Manifest
                await StremioAPI.installAddon(manifestUrl);

                // 5. Show Success
                await this.showSuccessModal(isNewAccount, stremioEmail, password);
            } else {
                // 4. Show Manifest Result
                this.showManifestResult(manifestUrl, password);
            }

        } catch (err) {
            // Show error modal to user
            Modal.error(err.message);

            // If it's not a known user-error (wrong password, etc), send it to HoneyBadger
            if (!StremioAPI.isUserError(err.message) && !AIOStreamsAPI.isUserError(err.message)) {
                window.handleError(err);
            }
        } finally {
            this.ui.submitBtn.disabled = false;
            this.ui.submitBtn.textContent = this.mode === 'account' ? "Start Setup" : "Generate Manifest";
        }
    }

    // Get the user inputs from the form
    getFormData() {
        let email = null;
        let password = null;

        // Only validate email/password in account mode
        if (this.mode === 'account') {
            email = this.ui.emailInput.value.trim();
            password = this.ui.passwordInput.value.trim();

            if (!email || !password) {
                Modal.error("Please enter a Stremio email and password.");
                return null;
            }
        }
        else {
            // Manifest mode validation
            password = this.ui.aiostreamsPasswordInput.value.trim();
            if (!password) {
                Modal.error("Please enter an AIOStreams password.");
                return null;
            }
        }

        const debridioKey = this.ui.debridioInput.value.trim();
        const cleanupOldInstalls = this.ui.cleanDuckStreamsCheckbox.checked;

        // Gather API Keys from dynamic inputs
        const providersMap = {};
        const selectedDebridProviders = this.getSelectedDebridProviders();

        selectedDebridProviders.forEach(providerId => {
            const input = document.getElementById(`apiKey_${providerId}`);
            if (input && input.value.trim()) {
                providersMap[providerId] = input.value.trim();
            }
        });

        if (Object.keys(providersMap).length === 0) {
            Modal.error("Please select at least one provider and enter an API key.");
            return null;
        }

        return { email, password, debridioKey, providersMap, cleanupOldInstalls };
    }

    // Log into the user's Stremio account
    async setupStremioAccount(email, password, cleanupOldInstalls) {
        // Login to Stremio (registering a new account if needed)
        const isNewAccount = await StremioAPI.ensureAccount(email, password);

        // Configure Account
        if (isNewAccount) {
            // Erase all default addons if the account is new
            const currentAddons = await StremioAPI.getAddons();
            const ALLOWED = ["Cinemeta"];
            const filteredAddons = currentAddons.filter(a => ALLOWED.includes(a.manifest.name));
            await StremioAPI.setAddons(filteredAddons);
        } else if (cleanupOldInstalls) {
            // User requested to clean up existing "Duck Streams" addons
            const currentAddons = await StremioAPI.getAddons();
            const filteredAddons = currentAddons.filter(a => !a.manifest.name.startsWith("Duck Streams"));
            await StremioAPI.setAddons(filteredAddons);
        }

        return isNewAccount;
    }

    async createAIOStreamsManifest(password, providersMap, debridioKey) {
        // Pick random TMDB Credentials
        const tmdbReadToken = await this.generateRandomTmdbCredentials();

        const selectedHostValue = this.ui.aiostreamsHostSelect.value;
        const selectedHostName = this.ui.aiostreamsHostSelect.options[this.ui.aiostreamsHostSelect.selectedIndex].text;

        // Prepare the config
        const config = await AIOStreamsAPI.populateJSON(providersMap, debridioKey, tmdbReadToken);

        let manifestUrl = null;
        if (selectedHostValue !== 'auto') {
            // Specific host selected
            console.log("Creating manifest for AIOStreams (Host: " + selectedHostName + ")...");
            manifestUrl = await this.createManifest(selectedHostValue, selectedHostName, config, password);
        } else {
            // Auto-select host
            // Try hosts in order: defined in AIOStreamsAPI
            const hosts = Object.entries(AIOStreamsAPI.HOSTS);

            const errors = [];
            for (const [name, url] of hosts) {
                try {
                    console.log("Creating manifest for AIOStreams (Host: " + name + ")...");
                    // Clone config so modifications (like removing presets) don't persist to the next host
                    manifestUrl = await this.createManifest(url, name, structuredClone(config), password);
                    break; // Break if successful
                } catch (err) {
                    errors.push(name + ": " + err.message);
                }
            }

            if (!manifestUrl) {
                // This gets caught in the catch block of handleSubmit
                throw new Error("All AIOStreams hosts failed to generate a manifest URL: " + errors.join(", "));
            }
        }

        return manifestUrl;
    }

    async showSuccessModal(isNewAccount, email, password) {
        let modalMessage = "";
        if (isNewAccount) {
            modalMessage = `Created a <b>new account</b> and set it up.`;
        } else {
            modalMessage = `Updated your <b>existing account</b>.`;
        }

        let detailsHtml = '';
        if (isNewAccount) {
            detailsHtml = `
            <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem; margin-top:1rem; text-align:left;">
                <div style="margin-bottom:0.5rem; font-size:0.85rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Credentials</div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <span>Email: <b style="color:#fff;">${email}</b></span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>Password: <b style="color:#fff;">${password}</b></span>
                </div>
                <div style="font-size:0.8rem; color:#64748b; margin-top:0.5rem; font-style:italic;">Make sure to save these!</div>
            </div>`;
        }

        await Modal.success(
            `${modalMessage} ${detailsHtml} <br><br> Your Duck Streams password is the same as your Stremio password. <br><br> Login to Stremio with these credentials to start watching!`,
            "Success! 🎉"
        );
    }

    async showManifestResult(url, password) {
        const messageHtml = `
            <div style="text-align: left;">
                <p>AIOStreams manifest has been created successfully.</p>
                
                <div class="credential-group">
                    <div class="credential-item">
                        <div class="credential-info">
                            <span class="credential-label">Manifest URL</span>
                            <span id="res-url" class="credential-value" title="${url}">${url}</span>
                        </div>
                        <button class="copy-icon-btn" data-copy="res-url">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z"></path></svg>
                        </button>
                    </div>
                     <div class="credential-item">
                        <div class="credential-info">
                            <span class="credential-label">Password</span>
                            <span id="res-pwd" class="credential-value">${password}</span>
                        </div>
                         <button class="copy-icon-btn" data-copy="res-pwd">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z"></path></svg>
                        </button>
                    </div>
                </div>
                
                <div style="font-size:0.8rem; color:#94a3b8; font-style:italic;">
                    Use the Manifest URL above to install a new addon in your streaming client.
                </div>
            </div>
        `;

        await Modal.success(messageHtml, "Manifest Generated 🎉");
    }

    // Install AIOStreams config file on a specific host
    async createManifest(hostUrl, hostName, config, password) {
        // Allow up to 3 repair attempts (for MF, Torrentio, Bitmagnet)
        let attempts = 0;
        const maxAttempts = 4; // 1 initial + 3 fixes

        while (attempts < maxAttempts) {
            attempts++;
            try {
                // Try to install
                return await this.installWithRetry(hostUrl, password, config);
            } catch (err) {
                // If we've run out of attempts, throw the error
                if (attempts >= maxAttempts) throw err;

                // Handle specific upstream errors by modifying config and retrying.
                const isTorrentioError = err.message && err.message.includes("Torrentio");
                const isMediaFusionError = err.message && err.message.includes("MediaFusion");
                const isBitmagnetError = err.message && err.message.includes("Bitmagnet");
                const isSeaDexError = err.message && err.message.includes("seadex not found");

                let presetType = "";

                if (isTorrentioError) {
                    presetType = 'torrentio';
                } else if (isMediaFusionError) {
                    presetType = 'mediafusion';
                } else if (isBitmagnetError) {
                    presetType = 'bitmagnet';
                } else if (isSeaDexError) {
                    presetType = 'seadex';
                }

                // If we can't identify the error, or if the addon is already gone, throw
                const hasPreset = config.presets && config.presets.some(p => p.type === presetType);
                if (!presetType || !hasPreset) throw err;

                let errorPrefix = "";
                if (isTorrentioError) errorPrefix = `Torrentio 403 on ${hostName}`;
                else if (isMediaFusionError) errorPrefix = `MediaFusion down on ${hostName}`;
                else if (isBitmagnetError) errorPrefix = `Bitmagnet not configured on ${hostName}`;
                else if (isSeaDexError) errorPrefix = `SeaDex not configured on ${hostName}`;

                console.warn(`${errorPrefix}. Removing and retrying...`);
                // Find and remove the problematic preset
                config.presets = config.presets.filter(p => p.type !== presetType);
            }
        }
    }

    // Helper to attempt installation with a simple retry strategy
    async installWithRetry(hostUrl, password, config) {
        try {
            return await AIOStreamsAPI.installConfig(hostUrl, password, config);
        } catch (e) {
            console.warn("First attempt to install failed. Retrying...");
            return await AIOStreamsAPI.installConfig(hostUrl, password, config);
        }
    }
}

// Initialize the app
const app = new QuickStart();
app.init();
