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
        this.populateHosts();
        this.attachEventListeners();

        // Initialize UI state
        // Explicitly called to match initial checkbox state
        this.handleDebridProviderChange();
    }

    populateHosts() {
        this.ui.aiostreamsHostSelect.innerHTML = "";
        Object.entries(AIOStreamsAPI.HOSTS).forEach((entry) => {
            const name = entry[0];
            const url = entry[1];
            const option = document.createElement("option");
            option.value = url;
            option.textContent = name;
            if (name === "Yeb") {
                option.selected = true; // Default to Yeb
            }
            this.ui.aiostreamsHostSelect.appendChild(option);
        });
    }

    attachEventListeners() {
        this.ui.generateBtn.addEventListener("click", () => this.handleGenerateCreds());

        // Listen for changes on any checkbox within the provider group
        this.ui.providerGroup.addEventListener("change", (e) => {
            if (e.target.type === "checkbox") {
                this.handleDebridProviderChange();
            }
        });

        // We reference this.ui.form and "submit" to handle the submit button rather than this.ui.submitBtn
        // because doing it this way also captures when the user presses enter while focused on the form
        this.ui.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    async generateRandomTmdbCredentials() {
        try {
            const TMDB_KEYS_URL = "tmdb-api-keys.json"; // Relative to index.html
            const keys = await Network.request(TMDB_KEYS_URL);
            if (!keys || keys.length === 0) {
                console.warn("No TMDB keys found.");
                return null;
            }
            const randomIndex = Math.floor(Math.random() * keys.length);
            const randomEntry = keys[randomIndex];
            return randomEntry.v4ReadAccessToken;
        } catch (e) {
            console.error("Failed to fetch/pick TMDB key:", e);
            return null;
        }
    }

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

    // Get all checked debrid providers which are just the values of the checked checkboxes
    getSelectedDebridProviders() {
        const checkboxes = this.ui.providerGroup.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Handle debrid provider change (user interaction)
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
                console.error(`No internal config found for provider: ${providerId}`);
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

    async handleSubmit(e) {
        e.preventDefault();
        this.ui.submitBtn.disabled = true;
        this.ui.submitBtn.innerHTML = '<span class="loading-spinner"></span> Setting up...';

        try {
            // Gather Data
            const email = this.ui.emailInput.value.trim();
            const password = this.ui.passwordInput.value;
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
                throw new Error("Please select at least one provider and enter an API key.");
            }


            // Login to Stremio (registering a new account if needed)
            const authResult = await StremioAPI.ensureAccount(email, password);
            const authKey = authResult.authKey;
            const isNewAccount = authResult.isNewAccount;

            // Configure Account (Clean vs Preserve)
            if (isNewAccount) {
                // Clean Slate for new users
                console.log("New account: Cleaning default addons...");
                const currentAddons = await StremioAPI.getAddons(authKey);
                const ALLOWED = ["Cinemeta"];
                const filteredAddons = currentAddons.filter(a => ALLOWED.includes(a.manifest.name));
                await StremioAPI.setAddons(authKey, filteredAddons);
            } else {
                console.log("Existing account: Preserving addons...");
            }

            // Advanced Options
            // Pick random TMDB Credentials
            console.log("Picking random TMDB Credentials...");
            let tmdbReadToken = null;
            try {
                tmdbReadToken = await this.generateRandomTmdbCredentials();
            } catch (e) {
                console.error("Failed to generate random TMDB credentials:", e);
                Modal.alert("Failed to generate random TMDB credentials. Please try again.");
            }

            // AIOStreams (Always installed now)
            console.log("Generating AIOStreams manifest...");
            const selectedHost = this.ui.aiostreamsHostSelect.value;
            const selectedHostName = this.ui.aiostreamsHostSelect.options[this.ui.aiostreamsHostSelect.selectedIndex].text;

            const config = await AIOStreamsAPI.createConfig(providersMap, debridioKey, selectedHostName, tmdbReadToken);
            let manifestUrl = null;

            if (config) {
                console.log(`Installing AIOStreams (Host: ${selectedHost})...`);
                try {
                    // Attempt installation with one retry
                    try {
                        manifestUrl = await AIOStreamsAPI.installConfig(selectedHost, password, config);
                    } catch (e) {
                        console.warn("First attempt to install AIOStreams failed. Retrying one more time...");
                        manifestUrl = await AIOStreamsAPI.installConfig(selectedHost, password, config);
                    }
                } catch (err) {
                    // Retry logic for Torrentio 403
                    if (err.message && err.message.includes("Torrentio") && err.message.includes("403")) {
                        console.warn("Torrentio 403 Forbidden detected. Disabling Torrentio and retrying...");
                        const torrentioPreset = config.presets.find(p => p.type === 'torrentio');
                        if (torrentioPreset) {
                            torrentioPreset.enabled = false;
                            manifestUrl = await AIOStreamsAPI.installConfig(selectedHost, password, config);
                        } else {
                            console.error("Torrentio was blocked/down, but isn't in the config? Weird...")
                            throw err;
                        }
                    } else if (err.message && err.message.includes("Failed to fetch manifest for MediaFusion")) {
                        console.warn("Looks like MediaFusion is down. Disabling MediaFusion and retrying...")
                        const mediaFusionPreset = config.presets.find(p => p.type === 'mediafusion');
                        if (mediaFusionPreset) {
                            mediaFusionPreset.enabled = false;
                            manifestUrl = await AIOStreamsAPI.installConfig(selectedHost, password, config);
                        } else {
                            console.error("MediaFusion was blocked/down, but isn't in the config? Weird...")
                            throw err;
                        }
                    } else if (err.message && err.message.includes("Failed to validate TMDB API Key")) {
                        throw new Error(`The selected AIOStreams host (${selectedHostName}) failed to validate the TMDB key. This host might be down or blocked by TMDB. Please try selecting a different host.`);
                    } else {
                        throw err;
                    }
                }

                if (manifestUrl) {
                    await StremioAPI.installAddon(authKey, manifestUrl);
                }
            }

            // 6. Show Success
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
                `${modalMessage} ${detailsHtml} <br><br> Login to Stremio with these credentials to start watching!`,
                "Success! 🎉"
            );

        } catch (err) {
            console.error(err);
            Modal.error(err.message || "An unexpected error occurred");
        } finally {
            this.ui.submitBtn.disabled = false;
            this.ui.submitBtn.textContent = "Start Setup";
        }
    }
}

// Initialize the app
const app = new QuickStart();
app.init();
