/**
 * CinePatch
 * 
 * Logic for the CinePatch tool.
 * Allows users to selectively clean up Cinemeta artifacts.
 */
class CinePatch {
    constructor() {
        // State
        this.state = {
            addons: [], // Current addon collection
        };

        // DOM Elements
        this.ui = {
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),

            patchSearch: document.getElementById('patchSearch'),
            patchCatalogs: document.getElementById('patchCatalogs'),
            patchMeta: document.getElementById('patchMeta'),

            applyBtn: document.getElementById('applyBtn'),
        };
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        this.ui.applyBtn.addEventListener('click', (e) => this.handleApply(e));
    }

    /**
     * Handle Apply Patches
     * Login -> Fetch -> Reset -> Patch -> Sync
     */
    async handleApply(e) {
        if (e) e.preventDefault();

        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value.trim();

        // Input validation
        if (!email || !password) {
            Modal.error("Please enter your Stremio email and password.");
            return;
        }

        // UI Loading State
        this.setLoading(true);

        try {
            // Login
            await StremioAPI.login(email, password);
            if (!StremioAPI.isAuthenticated()) {
                throw new Error('Login failed: No session created.');
            }

            // Fetch Addons
            const addons = await StremioAPI.getAddons();
            this.state.addons = addons;

            // Prepare Fresh Manifest
            let freshManifest = await fetch('https://v3-cinemeta.strem.io/manifest.json').then(r => r.json());

            // Apply Patches to the fresh manifest
            // We modify the fresh manifest directly before saving it to state
            const appliedPatches = [];

            if (this.ui.patchSearch.checked) {
                freshManifest = this.applySearchPatch(freshManifest);
                appliedPatches.push("🔍 Removed Search Results");
            }

            if (this.ui.patchCatalogs.checked) {
                // Dependency Explanation: Stremio uses the "Popular" (top) catalogs for search results.
                // If the user wants to REMOVE Home Catalogs (patchCatalogs) but KEEP Search (!patchSearch),
                // we cannot simply delete the catalogs.
                // Instead, we must keep them but hide them from the home screen (by making search required).
                const preserveSearch = !this.ui.patchSearch.checked;
                freshManifest = this.applyCatalogsPatch(freshManifest, preserveSearch);
                appliedPatches.push("📚 Removed Home Catalogs");
            }

            if (this.ui.patchMeta.checked) {
                freshManifest = this.applyMetaPatch(freshManifest);
                appliedPatches.push("ℹ️ Removed Metadata");
            }

            // Update State
            // Find existing Cinemeta index
            let cinemetaIndex = this.state.addons.findIndex(a => a.manifest.name === 'Cinemeta' || a.manifest.id === 'cinemeta');

            if (cinemetaIndex === -1) {
                // New Installation
                this.state.addons.push({
                    transportUrl: "https://v3-cinemeta.strem.io/manifest.json",
                    transportName: "http",
                    manifest: freshManifest, // Patched manifest
                    flags: { protected: true }
                });
            } else {
                // Update Existing
                this.state.addons[cinemetaIndex].manifest = freshManifest; // Patched manifest
            }

            // Push updates
            await StremioAPI.setAddons(this.state.addons);

            // Success
            if (appliedPatches.length > 0) {
                const listHtml = `<ul style="margin-top:10px; margin-bottom:10px; text-align:left;">${appliedPatches.map(p => `<li>${p}</li>`).join('')}</ul>`;
                Modal.success(`The following patches have been applied:<br>${listHtml}`, "Patches Applied! 🎉");
            } else {
                Modal.success("Cinemeta has been restored to its default state.", "Reset Complete! ♻️");
            }

        } catch (error) {
            ErrorHandler.handle(error, { method: "CinePatch.handleApply" }, "Patching Failed");
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Toggle Loading State
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.ui.applyBtn.disabled = true;
            this.ui.applyBtn.innerHTML = '<span class="loading-spinner"></span> Working...';
            this.ui.emailInput.disabled = true;
            this.ui.passwordInput.disabled = true;
        } else {
            this.ui.applyBtn.disabled = false;
            this.ui.applyBtn.textContent = 'Apply Patches';
            this.ui.emailInput.disabled = false;
            this.ui.passwordInput.disabled = false;
        }
    }

    // =========================================================================
    // Patch Logic
    // Pure functions that take a manifest and return a patched version
    // =========================================================================

    applySearchPatch(manifest) {
        if (!manifest) return manifest;

        // Filter catalogs
        const originalCatalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : [];
        const updatedCatalogs = originalCatalogs.filter((c) => !(c && c.id === 'cinemeta.search' && (c.type === 'movie' || c.type === 'series')));

        // Strip search extras from 'top' catalogs
        updatedCatalogs.forEach(cat => {
            if (cat.id === 'top' && (cat.type === 'movie' || cat.type === 'series')) {
                if (Array.isArray(cat.extra)) {
                    cat.extra = cat.extra.filter(e => e.name !== 'search');
                }
            }
        });

        manifest.catalogs = updatedCatalogs;
        return manifest;
    }

    applyCatalogsPatch(manifest, preserveSearch = false) {
        if (!manifest) return manifest;

        const currentCatalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : [];

        if (preserveSearch) {
            // Special Case: "Remove Home Catalogs" is ON, but "Remove Search" is OFF.
            // We must keep the 'top' (Popular) catalogs because Stremio uses them for search fallback.
            // However, to satisfy "Remove Home Catalogs", we hide them from the home screen
            // by making the 'search' extra required (isRequired: true).

            const updatedCatalogs = currentCatalogs.map(cat => {
                // Check if it's a 'top' catalog (Popular)
                if (cat.id === 'top' && (cat.type === 'movie' || cat.type === 'series')) {
                    // Return a modified copy
                    const modifiedCat = { ...cat };
                    if (Array.isArray(modifiedCat.extra)) {
                        modifiedCat.extra = modifiedCat.extra.map(e => {
                            if (e.name === 'search') {
                                return { ...e, isRequired: true };
                            }
                            return e;
                        });
                    }
                    return modifiedCat;
                }
                return cat;
            }).filter(c => {
                // Keep cinemeta.search
                if (c.id === 'cinemeta.search') return true;

                // Keep the modified 'top' catalogs
                if (c.id === 'top' && (c.type === 'movie' || c.type === 'series')) return true;

                // Remove 'year' (New) and 'imdbRating' (Featured)
                return false;
            });

            manifest.catalogs = updatedCatalogs;
        } else {
            // Original behavior: Remove everything except cinemeta.search
            // This runs if "Remove Search" is ALSO checked.
            const updatedCatalogs = currentCatalogs.filter(c => {
                if (c.id === 'cinemeta.search') return true;
                return false;
            });
            manifest.catalogs = updatedCatalogs;
        }

        return manifest;
    }

    applyMetaPatch(manifest) {
        if (!manifest) return manifest;

        if (Array.isArray(manifest.resources)) {
            manifest.resources = manifest.resources.filter(r => {
                const name = typeof r === 'string' ? r : r.name;
                return name !== 'meta';
            });
        }
        return manifest;
    }
}

// Initialize the app
const app = new CinePatch();
app.init();
