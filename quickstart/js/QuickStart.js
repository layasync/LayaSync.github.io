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
        this.customFormatterDefinition = null; // Will hold user-uploaded custom formatter
        this.formatterLoadedFromCache = false; // Track if formatter was loaded from localStorage
        this.formatterFilename = null; // Store the filename of the loaded formatter

        // UI References
        this.ui = {
            // Main View
            viewMain: document.getElementById("view-main"),
            infoBtn: document.getElementById("infoBtn"),
            form: document.getElementById("setupForm"),

            // Mode Switching
            tabButtons: document.querySelectorAll('.tab-btn'),
            modeAccount: document.getElementById("mode-account"),
            modeManifest: document.getElementById("mode-manifest"),

            // Account Mode Inputs
            emailInput: document.getElementById("email"),
            passwordInput: document.getElementById("password"),
            generateBtn: document.getElementById("generateCredsBtn"),
            // Manifest Mode Inputs
            aiostreamsPasswordInput: document.getElementById("aiostreamsPassword"),
            compatibilityModeSelect: document.getElementById("compatibilityMode"),

            providerGroup: document.getElementById("providerGroup"),
            apiKeysContainer: document.getElementById("apiKeysContainer"),
            signupLink: document.getElementById("signupLink"),

            debridioInput: document.getElementById("debridioKey"),
            submitBtn: document.getElementById("submitBtn"),
            viewAdvancedBtn: document.getElementById("viewAdvancedBtn"),

            // Advanced Settings View
            viewAdvanced: document.getElementById("view-advanced"),
            backToMainBtn: document.getElementById("backToMainBtn"),

            sizePresets: document.querySelectorAll('.preset-btn'),
            exclude4kCheckbox: document.getElementById("exclude4k"),
            excludeDolbyCheckbox: document.getElementById("excludeDolby"),
            prioritizeQualityCheckbox: document.getElementById("prioritizeQuality"),

            aiostreamsHostSelect: document.getElementById("aiostreamsHost"),
            customHostSection: document.getElementById("customHostSection"),
            customHostURL: document.getElementById("customHostURL"),
            formatSelect: document.getElementById("formatSelect"),
            formatPreviewImage: document.getElementById("formatPreviewImage"),
            customFormatterSection: document.getElementById("customFormatterSection"),
            customFormatterFile: document.getElementById("customFormatterFile"),
            cleanDuckStreamsCheckbox: document.getElementById("cleanDuckStreams"),

            saveAdvancedSettingsBtn: document.getElementById("saveAdvancedSettings"),
            saveAIOStreamsCheckbox: document.getElementById("saveAIOStreamsCheckbox"),
            saveFormatterCheckbox: document.getElementById("saveFormatterCheckbox"),
            formatterLoadedIndicator: document.getElementById("formatterLoadedIndicator"),
            formatterLoadedName: document.getElementById("formatterLoadedName"),
        };
    }

    // Initialize the app
    async init() {
        this.switchMode(this.mode); // Initialize UI state based on default mode
        this.handleDebridProviderChange(); // Initialize the checkboxes to their default state
        window.UIClipboard && UIClipboard.setup(); // Initialize Clipboard
        this.populateAIOStreamsHostsSelect();
        await this.loadFormatters(); // Load formatters from config
        await this.checkForUpdates(); // Check for new updates

        // Main view listeners

        // Info Button
        this.ui.infoBtn?.addEventListener("click", (e) => {
            e.preventDefault();
            this.showInfoModal();
        });

        // Mode change (Stremio Account vs Manifest Only)
        this.ui.tabButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Generate Credentials
        this.ui.generateBtn?.addEventListener("click", () => this.handleGenerateCreds());

        // Debrid Providers
        this.ui.providerGroup?.addEventListener("change", (e) => {
            if (e.target.type === "checkbox") {
                this.handleDebridProviderChange();
            }
        });

        // Submit
        this.ui.submitBtn?.addEventListener("click", (e) => this.handleSubmit(e));

        // Platform Change
        this.ui.compatibilityModeSelect?.addEventListener("change", (e) => this.handleCompatibilityModeChange(e.target.value));

        // Advanced settings button
        this.ui.viewAdvancedBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('advanced');
        });

        // ---

        // Advanced view listeners

        this.ui.backToMainBtn?.addEventListener('click', () => this.switchView('main'));

        // Max size
        this.ui.sizePresets?.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSizePreset(e.target));
        });

        // Formatter selection
        this.ui.formatSelect?.addEventListener("change", (e) => {
            this.handleFormatterSelection(e.target.value);
            this.saveFormatter(); // Auto-save formatter selection if checkbox is enabled
        });
        this.ui.customFormatterFile?.addEventListener("change", (e) => this.handleCustomFormatterFileUpload(e));

        // Host selection
        this.ui.aiostreamsHostSelect?.addEventListener("change", (e) => {
            this.handleHostSelection(e.target.value);
            this.saveAIOStreamsHost(); // Auto-save host selection if checkbox is enabled
        });
        this.ui.customHostURL?.addEventListener("blur", () => this.saveAIOStreamsHost());

        this.ui.saveAdvancedSettingsBtn?.addEventListener('click', () => this.switchView('main'));

        // Individual Save Checkboxes
        this.ui.saveAIOStreamsCheckbox?.addEventListener('change', (e) => this.handleAIOStreamsSaveCheckboxChange(e));
        this.ui.saveFormatterCheckbox?.addEventListener('change', (e) => this.handleFormatterSaveCheckboxChange(e));

        // Load saved settings if they exist
        await this.loadSettings();
    }

    /**
     * Save AIOStreams URL to localStorage
     * Only saves if the "Save" checkbox for AIOStreams is checked
     */
    saveAIOStreamsHost() {
        if (!this.ui.saveAIOStreamsCheckbox?.checked) {
            return;
        }

        try {
            const selectedHost = this.ui.aiostreamsHostSelect?.value;

            if (selectedHost === 'custom') {
                const customUrl = this.ui.customHostURL?.value?.trim();
                if (customUrl) {
                    localStorage.setItem('quickstart_aiostreams_url', customUrl);
                    Logger.debug('QuickStart', 'AIOStreams URL saved:', { customUrl });
                }
            } else if (selectedHost && selectedHost !== 'auto') {
                localStorage.setItem('quickstart_aiostreams_url', selectedHost);
                Logger.debug('QuickStart', 'AIOStreams URL saved:', { selectedHost });
            }
        } catch (err) {
            Logger.error('QuickStart', 'Error saving AIOStreams URL:', err);
        }
    }

    /**
     * Save Formatter JSON to localStorage
     * Only saves if the "Save" checkbox for Formatter is checked
     */
    saveFormatter() {
        if (!this.ui.saveFormatterCheckbox?.checked) {
            return;
        }

        try {
            const selectedFormatterId = this.ui.formatSelect?.value;
            
            // Save the selected formatter ID
            if (selectedFormatterId) {
                localStorage.setItem('quickstart_formatter_id', selectedFormatterId);
                Logger.debug('QuickStart', 'Formatter ID saved:', { selectedFormatterId });
            }
            
            // If it's a custom formatter, also save the JSON definition and filename
            if (selectedFormatterId === 'custom' && this.customFormatterDefinition) {
                try {
                    const jsonString = JSON.stringify(this.customFormatterDefinition);
                    localStorage.setItem('quickstart_formatter_json', jsonString);
                    Logger.debug('QuickStart', 'Custom formatter JSON saved to localStorage');
                    
                    // Save the filename if available
                    if (this.formatterFilename) {
                        localStorage.setItem('quickstart_formatter_filename', this.formatterFilename);
                        Logger.debug('QuickStart', 'Formatter filename saved:', { filename: this.formatterFilename });
                    }
                } catch (err) {
                    Logger.warn('QuickStart', 'Error serializing formatter:', { error: err.message });
                }
            }
        } catch (err) {
            Logger.error('QuickStart', 'Error saving formatter:', err);
        }
    }

    /**
     * Load saved settings from localStorage and apply them to the UI
     */
    async loadSettings() {
        try {
            const savedUrl = localStorage.getItem('quickstart_aiostreams_url');
            const savedFormatter = localStorage.getItem('quickstart_formatter_json');

            // Restore AIOStreams URL
            if (savedUrl) {
                this.ui.saveAIOStreamsCheckbox.checked = true;
                
                // Check if it's a predefined host by looking for a matching option
                const predefinedHost = Array.from(this.ui.aiostreamsHostSelect.options).find(opt => opt.value === savedUrl);
                
                if (predefinedHost) {
                    // It's a predefined host from the dropdown
                    this.ui.aiostreamsHostSelect.value = savedUrl;
                    this.handleHostSelection(savedUrl);
                    // Clear custom URL field for cleanliness
                    this.ui.customHostURL.value = '';
                } else {
                    // It's a custom URL not in the predefined list
                    this.ui.aiostreamsHostSelect.value = 'custom';
                    this.handleHostSelection('custom');
                    this.ui.customHostURL.value = savedUrl;
                }
                Logger.debug('QuickStart', 'AIOStreams URL loaded from cache');
            }

            // Restore Formatter Selection
            const savedFormatterId = localStorage.getItem('quickstart_formatter_id');
            if (savedFormatterId) {
                this.ui.saveFormatterCheckbox.checked = true;
                
                // If it's a custom formatter, try to load the JSON definition
                if (savedFormatterId === 'custom') {
                    if (savedFormatter) {
                        try {
                            const formatterDef = JSON.parse(savedFormatter);
                            
                            // Validate the formatter
                            if (formatterDef && typeof formatterDef === 'object' && 
                                formatterDef.name && formatterDef.description) {
                                
                                this.customFormatterDefinition = formatterDef;
                                this.formatterLoadedFromCache = true;
                                
                                // Switch to custom formatter option
                                this.ui.formatSelect.value = 'custom';
                                this.handleFormatterSelection('custom');
                                
                                // Restore and display the filename
                                const savedFilename = localStorage.getItem('quickstart_formatter_filename');
                                if (savedFilename) {
                                    this.formatterFilename = savedFilename;
                                    this.displayFormatterFilename(savedFilename);
                                }
                                
                                Logger.debug('QuickStart', 'Custom formatter loaded from cache');
                            }
                        } catch (err) {
                            Logger.warn('QuickStart', 'Error parsing saved formatter:', { error: err.message });
                            localStorage.removeItem('quickstart_formatter_json');
                            localStorage.removeItem('quickstart_formatter_filename');
                        }
                    }
                } else if (this.formatters[savedFormatterId]) {
                    // Built-in formatter - just select it
                    this.ui.formatSelect.value = savedFormatterId;
                    this.handleFormatterSelection(savedFormatterId);
                    Logger.debug('QuickStart', 'Built-in formatter loaded from cache:', { formatterId: savedFormatterId });
                }
            }

            if (savedUrl || savedFormatter) {
                Logger.debug('QuickStart', 'Settings loaded from localStorage');
            }
        } catch (err) {
            Logger.error('QuickStart', 'Error loading settings from localStorage:', err);
        }
    }

    /**
     * Handle AIOStreams Save checkbox change
     */
    handleAIOStreamsSaveCheckboxChange(event) {
        if (event.target.checked) {
            // Save current AIOStreams host
            this.saveAIOStreamsHost();
        } else {
            // Clear saved AIOStreams URL
            try {
                localStorage.removeItem('quickstart_aiostreams_url');
                Logger.debug('QuickStart', 'AIOStreams URL cleared from localStorage');
            } catch (err) {
                Logger.error('QuickStart', 'Error clearing AIOStreams URL:', err);
            }
        }
    }

    /**
     * Handle Formatter Save checkbox change
     */
    handleFormatterSaveCheckboxChange(event) {
        if (event.target.checked) {
            // Save current formatter
            this.saveFormatter();
        } else {
            // Clear saved formatter
            try {
                localStorage.removeItem('quickstart_formatter_id');
                localStorage.removeItem('quickstart_formatter_json');
                localStorage.removeItem('quickstart_formatter_filename');
                this.hideFormatterFilename();
                Logger.debug('QuickStart', 'Formatter cleared from localStorage');
            } catch (err) {
                Logger.error('QuickStart', 'Error clearing formatter:', err);
            }
        }
    }

    /**
     * Display the formatter filename in the UI
     */
    displayFormatterFilename(filename) {
        if (this.ui.formatterLoadedName && this.ui.formatterLoadedIndicator) {
            this.ui.formatterLoadedName.textContent = filename;
            this.ui.formatterLoadedIndicator.classList.remove('hidden');
        }
    }

    /**
     * Hide the formatter filename indicator
     */
    hideFormatterFilename() {
        this.formatterFilename = null;
        if (this.ui.formatterLoadedIndicator) {
            this.ui.formatterLoadedIndicator.classList.add('hidden');
        }
    }

    // Stremio Account vs Manifest Only
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

    handleCompatibilityModeChange(compatibilityMode) {
        if (compatibilityMode === 'stremio') {
            if (this.defaultFormatterId && this.formatters[this.defaultFormatterId]) {
                this.ui.formatSelect.value = this.defaultFormatterId;
                this.handleFormatterSelection(this.defaultFormatterId);
            }
        }
        if (compatibilityMode === 'chilllink') {
            if (this.formatters['chillio']) {
                this.ui.formatSelect.value = 'chillio';
                this.handleFormatterSelection('chillio');
            }
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

        // Add Custom option
        const customOption = document.createElement("option");
        customOption.value = "custom";
        customOption.textContent = "Custom (Private)";
        this.ui.aiostreamsHostSelect.appendChild(customOption);
    }

    // Load formatters from the config directory
    async loadFormatters() {
        this.ui.formatSelect.innerHTML = '';

        try {
            // Get the formatters list
            const folders = await Network.request('config/formatters/index.json');

            // Parse and Sort
            // Expected format: "#.Name" (e.g. "1.Duck")
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

            // Load formatter.json and preview.png files
            for (const item of parsedFormatters) {
                const id = item.id;

                // Fetch definition
                try {
                    const definition = await Network.request(`config/formatters/${encodeURIComponent(item.folder)}/formatter.json`);

                    this.formatters[id] = {
                        id: id,
                        name: item.name,
                        definition: definition,
                        image: `config/formatters/${encodeURIComponent(item.folder)}/preview.png`
                    };

                    // Create option element
                    const option = document.createElement("option");
                    option.value = id;
                    option.textContent = item.name;
                    this.ui.formatSelect.appendChild(option);
                } catch (err) {
                    Logger.warn('QuickStart', `Error loading formatter ${item.folder}:`, { error: err.message });
                }
            }

            // Add Custom Formatter Option
            const customOption = document.createElement("option");
            customOption.value = "custom";
            customOption.textContent = "Custom (Upload)";
            this.ui.formatSelect.appendChild(customOption);

            // Select Default (First item)
            if (this.ui.formatSelect.options.length > 0) {
                const firstId = this.ui.formatSelect.options[0].value;
                this.defaultFormatterId = firstId;
                this.ui.formatSelect.value = firstId;
                this.handleFormatterSelection(firstId);
            }

        } catch (err) {
            Logger.error('QuickStart', "Error initializing formatters:", err);
        }
    }

    handleFormatterSelection(formatterId) {
        const formatterPreviewContainer = document.getElementById('formatPreviewContainer');

        // Handle Custom Formatter Option
        if (formatterId === 'custom') {
            // Show custom formatter upload and hide preview
            this.ui.customFormatterSection.classList.remove('hidden');
            formatterPreviewContainer.style.display = 'none';
            // Show filename indicator if it was loaded from cache
            if (this.formatterFilename) {
                this.displayFormatterFilename(this.formatterFilename);
            }
            return;
        }

        // Hide custom formatter upload and show preview for built-in formatters
        this.ui.customFormatterSection.classList.add('hidden');
        formatterPreviewContainer.style.display = 'block';

        // Hide filename indicator when switching to built-in formatters
        this.hideFormatterFilename();

        const formatter = this.formatters[formatterId];

        // If no valid formatter was found, return
        if (!formatter) return;

        // Update Preview Image
        const imagePath = formatter.image;
        this.ui.formatPreviewImage.src = imagePath;
        this.ui.formatPreviewImage.alt = `${formatter.name} Preview`;

        this.ui.formatPreviewImage.onerror = () => this.ui.formatPreviewImage.style.display = 'none';
        this.ui.formatPreviewImage.onload = () => this.ui.formatPreviewImage.style.display = 'block';
    }

    handleCustomFormatterFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            this.customFormatterDefinition = null;
            this.formatterLoadedFromCache = false;
            this.formatterFilename = null;
            this.hideFormatterFilename();
            return;
        }

        // Only accept JSON files
        if (!file.name.endsWith('.json')) {
            Modal.error("Please select a valid JSON file.");
            this.ui.customFormatterFile.value = '';
            this.customFormatterDefinition = null;
            this.formatterLoadedFromCache = false;
            this.formatterFilename = null;
            this.hideFormatterFilename();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const definition = JSON.parse(e.target.result);
                
                // Validate that it's a proper formatter definition
                if (!definition || typeof definition !== 'object') {
                    throw new Error("Formatter must be a valid object");
                }
                
                if (!definition.name || typeof definition.name !== 'string') {
                    throw new Error("Formatter must have a 'name' property (string)");
                }
                
                if (!definition.description || typeof definition.description !== 'string') {
                    throw new Error("Formatter must have a 'description' property (string)");
                }
                
                this.customFormatterDefinition = definition;
                this.formatterLoadedFromCache = false; // Mark as user-uploaded, not from cache
                this.formatterFilename = file.name; // Store the filename
                this.displayFormatterFilename(file.name); // Show the filename in the UI
                Logger.debug('QuickStart', "Custom formatter loaded successfully:", { filename: file.name });
                
                // Save the new formatter to localStorage if checkbox is enabled
                this.saveFormatter();
            } catch (err) {
                Modal.error(`Invalid formatter format: ${err.message}`);
                this.ui.customFormatterFile.value = '';
                this.customFormatterDefinition = null;
                this.formatterLoadedFromCache = false;
                this.formatterFilename = null;
                this.hideFormatterFilename();
            }
        };
        reader.onerror = () => {
            Modal.error("Error reading file. Please try again.");
            this.ui.customFormatterFile.value = '';
            this.customFormatterDefinition = null;
            this.formatterLoadedFromCache = false;
            this.formatterFilename = null;
            this.hideFormatterFilename();
        };
        reader.readAsText(file);
    }

    handleHostSelection(selectedHost) {
        // Show custom input field if "custom" is selected
        if (selectedHost === 'custom') {
            this.ui.customHostSection.classList.remove('hidden');
        } else {
            this.ui.customHostSection.classList.add('hidden');
        }
    }

    // Main vs Advanced Settings view
    switchView(viewName) {
        if (viewName === 'advanced') {
            // Save current scroll position
            this.lastScrollY = window.scrollY;

            this.ui.viewMain.classList.add('hidden');
            this.ui.viewAdvanced.classList.remove('hidden');

            // Always start settings at the top
            window.scrollTo(0, 0);
        } else {
            this.ui.viewAdvanced.classList.add('hidden');
            this.ui.viewMain.classList.remove('hidden');

            // Restore previous position or default to top
            window.scrollTo(0, this.lastScrollY || 0);
        }
    }

    handleSizePreset(targetBtn) {
        // Remove active class from all
        this.ui.sizePresets.forEach(btn => btn.classList.remove('active'));

        // Add active to clicked
        targetBtn.classList.add('active');
    }

    // Generate random email/password
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

    getSelectedDebridProviders() {
        const checkboxes = this.ui.providerGroup.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Handle debrid provider change
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

    isRecognizedDuckStreams(addon) {
        // Detect stale "Restoring Addon..." artifacts from AIOStreams
        if (addon.manifest.id === 'synth-0' || addon.manifest.name === 'Restoring Addon...') {
            return true;
        }

        if (!addon.manifest.name.startsWith("Duck Streams") || !addon.transportUrl) return false;
        const isStremio = addon.transportUrl.includes("/stremio/") && addon.transportUrl.includes("/manifest.json");
        const isChilllink = addon.transportUrl.includes("/chilllink/");
        return isStremio || isChilllink;
    }

    async cleanUpDuckStreams(keepUuid = null) {
        Logger.debug('QuickStart', "Cleaning up Duck Streams addons...");
        const currentAddons = await StremioAPI.getAddons();
        const filteredAddons = currentAddons.filter(a => {
            if (this.isRecognizedDuckStreams(a)) {
                // It is one of ours.

                // FORCE DELETE STALE ARTIFACTS
                // We never want to keep "Restoring Addon..." as it means the install/update failed to complete
                // or the server returned a temporary placeholder.
                if (a.manifest.id === 'synth-0' || a.manifest.name === 'Restoring Addon...') {
                    return false; // Always delete
                }

                // Keep ONLY if it matches keepUuid
                if (keepUuid && a.transportUrl.includes(keepUuid)) {
                    return true;
                }
                return false; // Delete
            }
            return true; // Keep unrelated
        });

        if (filteredAddons.length !== currentAddons.length) {
            await StremioAPI.setAddons(filteredAddons);
        }
    }

    // Get random TMDB read access token from tmdb-api-keys.json
    async generateRandomTmdbCredentials() {
        let readAccessToken = "";

        try {
            const TMDB_KEYS_URL = "locales.json"; // Relative to index.html
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

    async createAIOStreamsManifest(password, providersMap, debridioKey, selectedFormatterId, compatibilityMode, existingAddon, prioritizeQuality) {
        const tmdbReadToken = await this.generateRandomTmdbCredentials();
        const exclude4k = this.ui.exclude4kCheckbox.checked;
        const excludeDolby = this.ui.excludeDolbyCheckbox.checked;
        const maxSize = Array.from(this.ui.sizePresets).find(btn => btn.classList.contains('active'))?.dataset.value || "unlimited";

        let selectedHostValue = this.ui.aiostreamsHostSelect.value;
        let selectedHostName = this.ui.aiostreamsHostSelect.options[this.ui.aiostreamsHostSelect.selectedIndex].text;

        // Handle custom host selection
        if (selectedHostValue === 'custom') {
            const customUrl = this.ui.customHostURL.value.trim();
            if (!customUrl) {
                throw new Error("Please enter a valid custom AIOStreams URL");
            }
            selectedHostValue = customUrl;
            selectedHostName = "Custom";
        }

        // Get formatter definition
        let formatterDefinition;
        if (selectedFormatterId === 'custom' && this.customFormatterDefinition) {
            // Use custom definition if uploaded
            formatterDefinition = this.customFormatterDefinition;
        } else {
            // Use default or fallback formatter
            formatterDefinition = this.formatters[selectedFormatterId].definition;
        }

        // Prepare the config
        const config = await AIOStreamsAPI.populateJSON(providersMap, debridioKey, tmdbReadToken, formatterDefinition, exclude4k, excludeDolby, maxSize, prioritizeQuality);

        let manifestUrl = null;

        // If we have an existing addon to reuse, try that first
        if (existingAddon) {
            // Check if user manually selected a DIFFERENT host than the one we are reusing
            // If so, we should NOT reuse it, but instead clean it up and create new.
            // also if the user selected 'auto', we should not reuse it, as they want the most reliable host.
            if (existingAddon.host !== selectedHostValue) {
                Logger.debug('QuickStart', `User selected host (${selectedHostValue}) differs from existing addon host (${existingAddon.host}). Skipping reuse.`);
                try {
                    await this.cleanUpDuckStreams(null); // Delete the preserved addon
                } catch (e) {
                    Logger.warn('QuickStart', "Failed to cleanup stale addon:", { error: e.message });
                }
                existingAddon = null; // Disable reuse flag
            }
        }

        if (existingAddon) {
            Logger.debug('QuickStart', "Updating existing AIOStreams manifest (Host: " + existingAddon.host + ")...");
            try {
                manifestUrl = await AIOStreamsAPI.updateConfigWithSmartRetry(
                    existingAddon.host,
                    config,
                    password,
                    existingAddon.uuid,
                    existingAddon.encryptedPassword,
                    compatibilityMode
                );
            } catch (err) {
                Logger.warn('QuickStart', "Failed to update existing addon, falling back to new installation:", { error: err.message });
                // Fallback to normal flow: cleanup the stale addon and let the code proceed to create a new one
                try {
                    Logger.debug('QuickStart', "Cleaning up stale addon...");
                    await this.cleanUpDuckStreams(null);
                } catch (cleanupErr) {
                    Logger.warn('QuickStart', "Failed to cleanup stale addon:", { error: cleanupErr.message });
                }
            }
        }

        // If we didn't successfully update an existing addon, create a new one
        if (!manifestUrl) {
            if (selectedHostValue !== 'auto') {
                // Specific host selected
                Logger.debug('QuickStart', "Creating manifest for AIOStreams (Host: " + selectedHostName + ")...");
                manifestUrl = await AIOStreamsAPI.installConfigWithSmartRetry(selectedHostValue, config, password, compatibilityMode);
            } else {
                // Auto-select host
                // Try hosts in order: defined in AIOStreamsAPI
                const hosts = Object.entries(AIOStreamsAPI.HOSTS);

                const errors = [];
                for (const [name, url] of hosts) {
                    try {
                        Logger.debug('QuickStart', "Creating manifest for AIOStreams (Host: " + name + ")...");
                        // Clone config so modifications (like removing presets) don't persist to the next host
                        manifestUrl = await AIOStreamsAPI.installConfigWithSmartRetry(url, structuredClone(config), password, compatibilityMode);
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
        }

        return manifestUrl;
    }

    // Log into the user's Stremio account
    async setupStremioAccount(email, password, cleanupOldInstalls) {
        // Login to Stremio (registering a new account if needed)
        const isNewAccount = await StremioAPI.ensureAccount(email, password);
        let existingAddon = null;

        // Configure Account
        if (isNewAccount) {
            // Erase all default addons if the account is new
            const currentAddons = await StremioAPI.getAddons();
            const ALLOWED = ["Cinemeta"];
            const filteredAddons = currentAddons.filter(a => ALLOWED.includes(a.manifest.name));
            await StremioAPI.setAddons(filteredAddons);
        }

        if (!isNewAccount && cleanupOldInstalls) {
            // User requested to clean up existing "Duck Streams" addons.
            // This is a bit more complex than just deleting them all, as we need to be careful not to delete unrelated addons.
            // Also we will try to reuse an existing Duck Streams addon if possible.
            const currentAddons = await StremioAPI.getAddons();

            // Find valid existing Duck Streams addon to reuse
            const existingIndex = currentAddons.findIndex(a => this.isRecognizedDuckStreams(a));

            if (existingIndex !== -1) {
                const addon = currentAddons[existingIndex];
                // Extract UUID and Host
                // Format Stremio: https://host/stremio/uuid/encryptedPassword/manifest.json
                // Format ChillLink: https://host/chilllink/uuid/encryptedPassword

                let match = addon.transportUrl.match(/^(https?:\/\/[^\/]+)\/stremio\/([^\/]+)\/([^\/]+)\/manifest\.json$/);
                if (!match) {
                    match = addon.transportUrl.match(/^(https?:\/\/[^\/]+)\/chilllink\/([^\/]+)\/([^\/]+)$/);
                }

                if (match) {
                    existingAddon = {
                        host: match[1],
                        uuid: match[2],
                        encryptedPassword: match[3],
                        transportUrl: addon.transportUrl
                    };

                    // Clean up other Duck Streams addons, keeping our reused one
                    await this.cleanUpDuckStreams(existingAddon.uuid);
                } else {
                    // Fallback: Regex failed. Clean up all recognized Duck Streams addons.
                    await this.cleanUpDuckStreams(null);
                }
            }
        }

        return { isNewAccount, existingAddon };
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

        const compatibilityMode = this.ui.compatibilityModeSelect.value;
        const debridioKey = this.ui.debridioInput.value.trim();
        const cleanupOldInstalls = this.ui.cleanDuckStreamsCheckbox.checked;
        const prioritizeQuality = this.ui.prioritizeQualityCheckbox ? this.ui.prioritizeQualityCheckbox.checked : true;

        // Get selected formatter
        let selectedFormatterId = this.ui.formatSelect.value;

        // If custom is selected but no file was uploaded, fall back to default formatter
        if (selectedFormatterId === 'custom') {
            if (!this.customFormatterDefinition) {
                Logger.debug('QuickStart', "Custom formatter selected but none uploaded, falling back to default");
                selectedFormatterId = this.defaultFormatterId;
            }
        }

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

        return { email, password, debridioKey, providersMap, cleanupOldInstalls, selectedFormatterId, compatibilityMode, prioritizeQuality };
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.ui.submitBtn.disabled = true;
        this.ui.submitBtn.innerHTML = '<span class="loading-spinner"></span> Working...';

        try {
            // 1. Gather Data
            const formData = this.getFormData();
            if (!formData) return; // Validation failed (modal already shown)

            let isNewAccount = false;
            let existingAddon = null;

            const stremioEmail = formData.email;
            const password = formData.password;
            const providersMap = formData.providersMap;
            const debridioKey = formData.debridioKey;
            const cleanupOldInstalls = formData.cleanupOldInstalls;
            const selectedFormatterId = formData.selectedFormatterId;
            const compatibilityMode = formData.compatibilityMode;
            const prioritizeQuality = formData.prioritizeQuality;

            // 2. Setup Stremio Account (Only if mode is account)
            if (this.mode === 'account') {
                const result = await this.setupStremioAccount(stremioEmail, password, cleanupOldInstalls);
                isNewAccount = result.isNewAccount;
                existingAddon = result.existingAddon;
            } else {
                // Manifest-only mode: password is already retrieved from form data
                // No action needed here
            }

            // 3. Create AIOStreams Manifest
            const manifestUrl = await this.createAIOStreamsManifest(password, providersMap, debridioKey, selectedFormatterId, compatibilityMode, existingAddon, prioritizeQuality);

            if (this.mode === 'account') {
                // 4. Install Manifest
                // If we reused an existing addon and the URL hasn't changed, we can skip this step.
                const shouldInstall = existingAddon?.transportUrl !== manifestUrl;

                if (shouldInstall) {
                    Logger.debug('QuickStart', "Installing new addon manifest...");
                    await StremioAPI.installAddon(manifestUrl);
                } else {
                    Logger.debug('QuickStart', "Manifest URL is unchanged, skipping Stremio installation.");
                }

                // 5. Show Success
                await this.showSuccessModal(isNewAccount, stremioEmail, password);
            } else {
                // 4. Show Manifest Result
                this.showManifestResult(manifestUrl, password);
            }

        } catch (err) {
            Logger.error('QuickStart', "Error in handleSubmit:", err);
            ErrorHandler.handle(err, { method: "handleSubmit" }, "Setup Failed");
        } finally {
            this.ui.submitBtn.disabled = false;
            this.ui.submitBtn.textContent = this.mode === 'account' ? "Start Setup" : "Generate Manifest";
        }
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

    // Update Checking & Notifications
    async checkForUpdates() {
        try {
            // Fetch version info from config
            const versionData = await Network.request('version.json');
            this.versionData = versionData;
            
            // Get the current date
            const currentDate = versionData.current;
            
            // Get the last date the user saw
            const lastSeenDate = localStorage.getItem('quickstart_last_seen_update');
            
            // If no stored date or if current is newer, show notification
            if (!lastSeenDate || this.compareDates(lastSeenDate, currentDate) < 0) {
                this.displayUpdateNotification(currentDate, lastSeenDate);
                // Update the stored date so we don't show it again
                localStorage.setItem('quickstart_last_seen_update', currentDate);
            }
        } catch (err) {
            Logger.error('QuickStart', "Error checking for updates:", err);
            // Silently fail - don't break the app if update check fails
        }
    }

    // Display the update notification with changelog for all updates since last seen
    displayUpdateNotification(currentDate, lastSeenDate) {
        const banner = document.getElementById('updateNotificationBanner');
        const changesList = document.getElementById('updateChangesList');
        const dismissBtn = document.getElementById('dismissUpdateBtn');
        
        if (!banner || !changesList || !dismissBtn) return; // UI elements not found

        // Find all updates that are newer than lastSeenDate
        const relevantUpdates = this.versionData.history.filter(u => {
            // If no lastSeenDate, show all updates up to current
            if (!lastSeenDate) {
                return this.compareDates(u.date, currentDate) <= 0;
            }
            // Otherwise, show updates between lastSeenDate and currentDate
            return this.compareDates(u.date, lastSeenDate) > 0 && 
                   this.compareDates(u.date, currentDate) <= 0;
        });

        if (relevantUpdates.length === 0) return; // No updates to display
        
        // Clear and populate changes list with all updates
        changesList.innerHTML = '';
        
        // Display updates in chronological order (newest first)
        for (let i = 0; i < relevantUpdates.length; i++) {
            const update = relevantUpdates[i];
            
            // Add date header
            const dateHeader = document.createElement('li');
            dateHeader.className = 'update-date-header';
            dateHeader.textContent = this.formatDate(update.date);
            changesList.appendChild(dateHeader);
            
            // Add changes for this update
            update.changes.forEach(change => {
                const li = document.createElement('li');
                li.textContent = change;
                changesList.appendChild(li);
            });
        }

        // Show the banner
        banner.classList.remove('hidden');

        // Setup dismiss button
        dismissBtn.addEventListener('click', (e) => {
            e.preventDefault();
            banner.classList.add('hidden');
        }, { once: true });
    }

    // Format date from YYYY-MM-DD to readable format
    formatDate(dateString) {
        try {
            // Parse date string manually to avoid timezone issues
            const [year, month, day] = dateString.split('-').map(Number);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthName = monthNames[month - 1];
            return `${monthName} ${day}, ${year}`;
        } catch {
            return dateString;
        }
    }

    // Compare two date strings in YYYY-MM-DD format (returns -1, 0, or 1)
    compareDates(date1, date2) {
        return date1.localeCompare(date2);
    }
}

// Initialize the app
const app = new QuickStart();
app.init();
