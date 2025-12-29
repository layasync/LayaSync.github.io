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
                length: 36
            },
            realdebrid: {
                name: "Real-Debrid",
                signup: "https://real-debrid.com/",
                api: "https://real-debrid.com/apitoken",
                length: 52
            },
        };

        // UI References
        this.ui = {
            form: document.getElementById("setupForm"),
            providerSelect: document.getElementById("provider"),
            apiKeyInput: document.getElementById("apiKey"),
            helperText: document.getElementById("helperText"),
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
        this.ui.providerSelect.dispatchEvent(new Event('change'));
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
        this.ui.providerSelect.addEventListener("change", () => this.handleProviderChange());

        // We reference this.ui.form and "submit" to handle the submit button rather than this.ui.submitBtn
        // because doing it this way also captures when the user presses enter while focused on the form
        this.ui.form.addEventListener("submit", (e) => this.handleSubmit(e));

        // Input validation listeners
        const inputs = [this.ui.emailInput, this.ui.passwordInput, this.ui.apiKeyInput];
        inputs.forEach(el => {
            el.addEventListener("input", () => this.validateForm());
        });
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
        this.validateForm();
    }

    handleProviderChange() {
        const debridProvider = this.ui.providerSelect.value;
        this.ui.apiKeyInput.value = ""; // Clear API key
        this.validateForm();

        if (!debridProvider) {
            this.ui.apiKeyInput.disabled = true;
            this.ui.apiKeyInput.placeholder = "Select a provider first";
            this.ui.helperText.textContent = "";
            this.ui.signupLink.textContent = "";
            return;
        }

        // Get the information for the selected debrid provider
        const config = this.PROVIDER_CONFIG[debridProvider];

        // Update the signup link, API key retrieval instructions, and API key input
        this.ui.signupLink.innerHTML = `Don't have an account? <a href="${config.signup}" target="_blank" rel="noopener">Sign up here</a>.`;
        this.ui.helperText.innerHTML = `Find your generated API Key <a href="${config.api}" target="_blank" rel="noopener">here</a>.`;
        this.ui.apiKeyInput.placeholder = `Enter your ${config.name} API Key`;

        this.ui.apiKeyInput.disabled = false;
        this.ui.apiKeyInput.maxLength = config.length;
        this.validateForm();
    }

    validateForm() {
        const debridProvider = this.ui.providerSelect.value;
        if (!debridProvider) {
            this.ui.submitBtn.disabled = true;
            return;
        }
        const config = this.PROVIDER_CONFIG[debridProvider];
        const isKeyValid = this.ui.apiKeyInput.value.trim().length >= config.length;
        const isLoginValid = this.ui.emailInput.value.trim() && this.ui.passwordInput.value;
        this.ui.submitBtn.disabled = !(isKeyValid && isLoginValid);
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.ui.submitBtn.disabled = true;
        this.ui.submitBtn.innerHTML = '<span class="loading-spinner"></span> Setting up...';

        try {
            // Gather Data
            const email = this.ui.emailInput.value.trim();
            const password = this.ui.passwordInput.value;
            const debridProvider = this.ui.providerSelect.value;
            const debridApiKey = this.ui.apiKeyInput.value.trim();
            const debridioKey = this.ui.debridioInput.value.trim();

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

            const config = await AIOStreamsAPI.createConfig(debridProvider, debridApiKey, debridioKey, selectedHostName, tmdbReadToken);
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
