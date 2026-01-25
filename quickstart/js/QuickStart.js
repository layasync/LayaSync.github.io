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
        this.formatters = {}; // Will hold loaded formatter definitions

        // UI References
        this.ui = {
            infoBtn: document.getElementById("infoBtn"),
            form: document.getElementById("setupForm"),
            providerGroup: document.getElementById("providerGroup"),
            apiKeysContainer: document.getElementById("apiKeysContainer"),
            signupLink: document.getElementById("signupLink"),
            formatSelect: document.getElementById("formatSelect"),
            formatPreviewImage: document.getElementById("formatPreviewImage"),
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
            // Advanced Settings Modal
            advancedModalOverlay: document.getElementById("advancedModalOverlay"),
            advancedSettingsBtn: document.getElementById("advancedSettingsBtn"),
            closeAdvancedModalBtn: document.getElementById("closeAdvancedModal"),
            saveAdvancedSettingsBtn: document.getElementById("saveAdvancedSettings"),
        };
    }

    // Initialize the app
    async init() {
        this.populateAIOStreamsHostsSelect();
        await this.loadFormatters(); // Load formatters from config


        // Initialize Clipboard
        if (window.Clipboard) {
            Clipboard.setup();
        }

        // Listen for tab button clicks
        this.ui.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Listen for generate button click
        this.ui.generateBtn.addEventListener("click", () => this.handleGenerateCreds());

        // Listen for submit button click
        this.ui.submitBtn.addEventListener("click", (e) => this.handleSubmit(e));


        // Listen for changes on any checkbox within the provider group
        this.handleDebridProviderChange(); // Initialize the checkboxes to their default state
        this.ui.providerGroup.addEventListener("change", (e) => {
            if (e.target.type === "checkbox") {
                this.handleDebridProviderChange();
            }
        });

        // Listen for changes in the format select
        this.ui.formatSelect.addEventListener("change", (e) => this.handleFormatterSelection(e.target.value));

        // Initialize UI state based on default mode
        this.switchMode(this.mode);

        // Advanced Settings Modal Handlers
        this.ui.advancedSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.ui.advancedModalOverlay.classList.remove('hidden');
        });
        this.ui.closeAdvancedModalBtn.addEventListener('click', () => this.ui.advancedModalOverlay.classList.add('hidden'));
        this.ui.saveAdvancedSettingsBtn.addEventListener('click', () => this.ui.advancedModalOverlay.classList.add('hidden'));

        // Info Button
        this.ui.infoBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.showInfoModal();
        });
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


    // Load formatters from the config directory
    async loadFormatters() {
        this.ui.formatSelect.innerHTML = '';

        try {
            // 1. Fetch the formatter manifest
            const folders = await Network.request('config/formatters/index.json');


            // 3. Parse and Sort
            // Expected format: "#.Name" (e.g. "1.Standard")
            const parsedFormatters = folders.map(folder => {
                const parts = folder.split('.');
                let order = 999;
                let name = folder;

                if (parts.length > 1 && !isNaN(parts[0])) {
                    order = parseInt(parts[0]);
                    name = parts.slice(1).join('.'); // Join back in case name has dots
                }

                return {
                    folder: folder,
                    name: name,
                    order: order,
                    id: name.toLowerCase()
                };
            }).sort((a, b) => a.order - b.order);

            // 3. Load Definitions
            for (const item of parsedFormatters) {
                const id = item.id;

                // Create option element
                const option = document.createElement("option");
                option.value = id;
                option.textContent = item.name;
                this.ui.formatSelect.appendChild(option);

                // Fetch definition
                try {
                    const definition = await Network.request(`config/formatters/${item.folder}/formatter.json`);

                    this.formatters[id] = {
                        id: id,
                        name: item.name,
                        definition: definition,
                        image: `config/formatters/${item.folder}/preview.png`
                    };
                } catch (err) {
                    console.warn(`Error loading formatter ${item.folder}:`, err);
                }
            }

            // 4. Select Default (First item)
            if (parsedFormatters.length > 0) {
                const firstId = parsedFormatters[0].id;
                this.ui.formatSelect.value = firstId;
                this.handleFormatterSelection(firstId);
            }

        } catch (err) {
            console.error("Error initializing formatters:", err);
        }
    }


    handleFormatterSelection(formatterId) {
        const formatter = this.formatters[formatterId];

        // If no valid formatter was found, return
        if (!formatter) return;

        // Update Preview Image
        this.updateFormatPreview(formatter);
    }

    updateFormatPreview(formatter) {
        const imagePath = formatter.image;

        this.ui.formatPreviewImage.src = imagePath;
        this.ui.formatPreviewImage.alt = `${formatter.name} Preview`;

        this.ui.formatPreviewImage.onerror = () => {
            this.ui.formatPreviewImage.style.display = 'none';
        };
        this.ui.formatPreviewImage.onload = () => {
            this.ui.formatPreviewImage.style.display = 'block';
        };
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
                ErrorHandler.handle(err);
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
            const selectedFormatterId = formData.selectedFormatterId;

            // 2. Setup Stremio Account (Only if mode is account)
            if (this.mode === 'account') {
                isNewAccount = await this.setupStremioAccount(stremioEmail, password, cleanupOldInstalls);
            } else {
                // Manifest-only mode: password is already retrieved from form data
                // No action needed here
            }

            // 3. Create AIOStreams Manifest
            const manifestUrl = await this.createAIOStreamsManifest(password, providersMap, debridioKey, selectedFormatterId);

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
            ErrorHandler.handle(err, { method: "handleSubmit" }, "Setup Failed");
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

        // Get selected formatter
        const selectedFormatterId = this.ui.formatSelect.value;

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

        return { email, password, debridioKey, providersMap, cleanupOldInstalls, selectedFormatterId };
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

    async createAIOStreamsManifest(password, providersMap, debridioKey, selectedFormatterId) {
        // Pick random TMDB Credentials
        const tmdbReadToken = await this.generateRandomTmdbCredentials();

        const selectedHostValue = this.ui.aiostreamsHostSelect.value;
        const selectedHostName = this.ui.aiostreamsHostSelect.options[this.ui.aiostreamsHostSelect.selectedIndex].text;

        // Get Formatter Definition
        const formatterName = this.formatters[selectedFormatterId].name;
        const formatterDefinition = this.formatters[selectedFormatterId].definition;

        // Prepare the config
        const config = await AIOStreamsAPI.populateJSON(providersMap, debridioKey, tmdbReadToken, formatterName, formatterDefinition);

        let manifestUrl = null;
        if (selectedHostValue !== 'auto') {
            // Specific host selected
            console.log("Creating manifest for AIOStreams (Host: " + selectedHostName + ")...");
            manifestUrl = await AIOStreamsAPI.installConfigWithSmartRetry(selectedHostValue, selectedHostName, config, password);
        } else {
            // Auto-select host
            // Try hosts in order: defined in AIOStreamsAPI
            const hosts = Object.entries(AIOStreamsAPI.HOSTS);

            const errors = [];
            for (const [name, url] of hosts) {
                try {
                    console.log("Creating manifest for AIOStreams (Host: " + name + ")...");
                    // Clone config so modifications (like removing presets) don't persist to the next host
                    manifestUrl = await AIOStreamsAPI.installConfigWithSmartRetry(url, name, structuredClone(config), password);
                    break; // Break if successful
                } catch (err) {
                    errors.push(name + ": " + err.message);
                }
            }

            if (!manifestUrl) {
                // This gets caught in the catch block of handleSubmit
                throw new Error("All AIOStreams hosts failed to generate a manifest URL. Please wait a few minutes and try again.");
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

    showInfoModal() {
        const html = `
        <div style="text-align: left; line-height: 1.6;">
            <p style="margin-bottom: 1rem;">Stremio relies on four key components to create your streaming experience:</p>
            <ul style="margin: 0 0 1.5rem 1.5rem; list-style-type: disc; color: var(--text-secondary);">
                <li style="margin-bottom: 0.5rem;"><strong style="color: var(--text-primary);">Scrapers:</strong> Addons that find playable video links.</li>
                <li style="margin-bottom: 0.5rem;"><strong style="color: var(--text-primary);">Catalogs:</strong> The lists you see on your home screen (e.g., "Featured").</li>
                <li style="margin-bottom: 0.5rem;"><strong style="color: var(--text-primary);">Metadata:</strong> Details like cover art, release dates, and cast info.</li>
                <li style="margin-bottom: 0.5rem;"><strong style="color: var(--text-primary);">Subtitles:</strong> Captions for your content.</li>
            </ul>
            
            <p style="margin-bottom: 1rem;"><strong>QuickStart</strong> installs <strong>Duck Streams</strong> to handle Scrapers and Subtitles. The built-in <strong>Cinemeta</strong> addon handles your Catalogs and Metadata. Therefore, you only <strong>need</strong> Cinemeta and Duck Streams for a full setup.</p>
            
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 10px; margin-top: 15px; border-radius: 4px;">
                <strong>Pro Tip:</strong> For complete control, you can check out <a href="https://duckkota.gitlab.io/guides/aiometadata/" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: bold;">AIOMetadata</a>. It replaces Cinemeta to give you fully customizable catalogs and metadata.
            </div>
        </div>
        `;

        Modal.alert(html, "About QuickStart", "Got it");
    }
}

// Initialize the app
const app = new QuickStart();
app.init();
