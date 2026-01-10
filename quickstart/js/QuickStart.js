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
        };

        // UI References
        this.ui = {
            form: document.getElementById("setupForm"),
            providerGroup: document.getElementById("providerGroup"),
            apiKeysContainer: document.getElementById("apiKeysContainer"),
            signupLink: document.getElementById("signupLink"),
            submitBtn: document.getElementById("submitBtn"),
            emailInput: document.getElementById("email"),
            passwordInput: document.getElementById("password"),
            generateBtn: document.getElementById("generateCredsBtn"),
            debridioInput: document.getElementById("debridioKey"),
            aiostreamsHostSelect: document.getElementById("aiostreamsHost"),
        };
    }

    // Initialize the app
    init() {
        this.populateAIOStreamsHostsSelect();

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

            // Create title label for input field
            const label = document.createElement("label");
            label.textContent = `${config.name} API Key`;
            label.htmlFor = `apiKey_${providerId}`;

            // Create input field for API key
            const input = document.createElement("input");
            input.type = "text";
            input.id = `apiKey_${providerId}`;
            input.name = `apiKey_${providerId}`; // beneficial for form data handling
            input.placeholder = `Enter your ${config.name} API Key`;
            input.required = true;
            input.autocomplete = "off";
            input.spellcheck = false;

            // Create helper text for getting API key
            const helper = document.createElement("div");
            helper.className = "helper";
            helper.innerHTML = `Find your API Key <a href="${config.api}" target="_blank" rel="noopener">here</a>.`;

            // Add the new fields to the UI
            field.appendChild(label);
            field.appendChild(input);
            field.appendChild(helper);
            this.ui.apiKeysContainer.appendChild(field);

            // Add signup link for debrid provider
            const linkDiv = document.createElement("div");
            linkDiv.style.marginTop = "0.25rem"; // reduced margin for compact list
            linkDiv.innerHTML = `Don't have a ${config.name} account? <a href="${config.signup}" target="_blank" rel="noopener">Sign up here</a>.`;
            this.ui.signupLink.appendChild(linkDiv);
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
        this.ui.submitBtn.innerHTML = '<span class="loading-spinner"></span> Setting up...';

        try {
            // 1. Gather Data
            const formData = this.getFormData();
            if (!formData) return; // Validation failed (modal already shown)

            const stremioEmail = formData.email;
            const stremioPassword = formData.password;
            const debridioKey = formData.debridioKey;
            const providersMap = formData.providersMap;

            // 2. Setup Stremio Account
            const isNewAccount = await this.setupStremioAccount(stremioEmail, stremioPassword);

            // 3. Create AIOStreams Manifest
            const manifestUrl = await this.createAIOStreamsManifest(stremioPassword, providersMap, debridioKey);

            // 4. Install Manifest
            await StremioAPI.installAddon(manifestUrl);

            // 5. Show Success
            await this.showSuccessModal(isNewAccount, stremioEmail, stremioPassword);

        } catch (err) {
            // Show error modal to user
            Modal.error(err.message);

            // If it's not a known user-error (wrong password, etc), send it to HoneyBadger
            // TODO: Update AIOStreamsAPI and AIOMetadataAPI to have versions of 'isKnownUserError'
            if (!StremioAPI.isUserError(err.message)) {
                window.handleError(err);
            }
        } finally {
            this.ui.submitBtn.disabled = false;
            this.ui.submitBtn.textContent = "Start Setup";
        }
    }

    // Get the user inputs from the form
    getFormData() {
        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value.trim();
        const debridioKey = this.ui.debridioInput.value.trim();

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

        return { email, password, debridioKey, providersMap };
    }

    // Log into the user's Stremio account
    async setupStremioAccount(email, password) {
        // Login to Stremio (registering a new account if needed)
        const isNewAccount = await StremioAPI.ensureAccount(email, password);

        // Configure Account
        if (isNewAccount) {
            // Erase all default addons if the account is new
            const currentAddons = await StremioAPI.getAddons();
            const ALLOWED = ["Cinemeta"];
            const filteredAddons = currentAddons.filter(a => ALLOWED.includes(a.manifest.name));
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
        // FIXME: The config should be refreshed for every host. For example, if MF times out on one host then it should try the next host.
        const config = await AIOStreamsAPI.populateJSON(providersMap, debridioKey, tmdbReadToken);

        let manifestUrl = null;
        if (selectedHostValue !== 'auto') {
            // Specific host selected
            manifestUrl = await this.createManifest(selectedHostValue, selectedHostName, config, password);
        } else {
            // Auto-select host
            // Try hosts in order: defined in AIOStreamsAPI
            const hosts = Object.entries(AIOStreamsAPI.HOSTS);

            const errors = [];
            for (const [name, url] of hosts) {
                try {
                    console.log("Creating manifest for AIOStreams (Host: " + name + ")...");
                    manifestUrl = await this.createManifest(url, name, config, password);
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

        await Modal.alert(
            `${modalMessage} ${detailsHtml} <br><br> Your Duck Streams password is the same as your Stremio password. <br><br> Login to Stremio with these credentials to start watching!`,
            "Success! 🎉"
        );
    }

    // Install AIOStreams config file on a specific host
    async createManifest(hostUrl, hostName, config, password) {
        // Update Addon Name based on Instance
        // Changes "Duck Streams" to "Duck Streams (Yeb)" for example
        config.addonName = `Duck Streams (${hostName})`;

        try {
            return await this.installWithRetry(hostUrl, password, config);
        } catch (err) {
            // Handle specific upstream errors by modifying config and retrying one last time.
            const isTorrentioError = err.message && err.message.includes("Torrentio") && err.message.includes("403");
            const isMediaFusionError = err.message && err.message.includes("Failed to fetch manifest for MediaFusion");
            const isBitmagnetError = err.message && err.message.includes("Addon 'Bitmagnet' is disabled");

            if (isTorrentioError || isMediaFusionError || isBitmagnetError) {

                let errorPrefix = "";
                let presetType = "";

                if (isTorrentioError) {
                    errorPrefix = `Torrentio 403 on ${hostName}`;
                    presetType = 'torrentio';
                } else if (isMediaFusionError) {
                    errorPrefix = `MediaFusion down on ${hostName}`;
                    presetType = 'mediafusion';
                } else if (isBitmagnetError) {
                    errorPrefix = `Bitmagnet not configured on ${hostName}`;
                    presetType = 'bitmagnet';
                }

                console.warn(errorPrefix + ". Removing and retrying...");
                // Find and remove the problematic preset
                const initialLength = config.presets.length;
                config.presets = config.presets.filter(p => p.type !== presetType);

                if (config.presets.length < initialLength) {
                    // Try one last time with removed preset
                    return await this.installWithRetry(hostUrl, password, config);
                }
            }

            // If we can't handle it, rethrow
            throw err;
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
