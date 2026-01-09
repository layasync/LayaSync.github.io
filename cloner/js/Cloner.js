/**
 * Cloner.js
 * 
 * Logic for cloning Stremio accounts.
 */
class Cloner {
    constructor() {
        this.ui = {
            form: document.getElementById('clonerForm'),
            inputs: {
                sourceEmail: document.getElementById('sourceEmail'),
                sourcePass: document.getElementById('sourcePassword'),
                destEmail: document.getElementById('destEmail'),
                destPass: document.getElementById('destPassword'),
            },
            btn: document.getElementById('cloneBtn')
        };
    }

    // Initialize event listeners
    init() {
        this.ui.form.addEventListener('submit', (e) => this.handleClone(e));
    }

    // Handles the clone process
    async handleClone(e) {
        e.preventDefault();

        const srcEmail = this.ui.inputs.sourceEmail.value.trim();
        const srcPass = this.ui.inputs.sourcePass.value;
        const dstEmail = this.ui.inputs.destEmail.value.trim();
        const dstPass = this.ui.inputs.destPass.value;

        if (srcEmail === dstEmail) {
            Modal.error("Source and Destination emails cannot be the same.");
            return;
        }

        // Start Process
        this.setUIEnabled(false);
        try {
            // Login to Source account
            await StremioAPI.login(srcEmail, srcPass);

            // Fetch Source Account Addons
            const srcAddons = await StremioAPI.getAddons();

            // Confirmation
            const confirmed = await Modal.confirm(
                "Found <b>" + srcAddons.length + " addons</b> on the source account: <b>" + srcEmail + "</b>.<br><br>The addons on the <b>" + dstEmail + "</b> account will be overwritten.<br><br>Are you sure you want to continue?",
                "Confirm Cloning"
            );

            if (!confirmed) {
                this.setUIEnabled(true);
                return;
            }

            // Connect to Destination account (registering a new account if needed)
            const isNewAccount = await StremioAPI.ensureAccount(dstEmail, dstPass);

            // Save Source Account Addons to Destination
            await StremioAPI.setAddons(srcAddons);

            // Show Success
            let modalMessage = "";
            let detailsHtml = "";

            if (isNewAccount) {
                modalMessage = `Created a new account and cloned <b>${srcAddons.length} addons</b> to it.`;
                detailsHtml = `
                <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem; margin-top:1rem; text-align:left;">
                    <div style="margin-bottom:0.5rem; font-size:0.85rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Destination Credentials</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <span>Email: <b style="color:#fff;">${dstEmail}</b></span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Password: <b style="color:#fff;">${dstPass}</b></span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; margin-top:0.5rem; font-style:italic;">Make sure to save these!</div>
                </div>`;
            } else {
                modalMessage = `Successfully cloned <b>${srcAddons.length} addons</b> to <b>${dstEmail}</b>.`;
            }

            await Modal.alert(
                `${modalMessage} ${detailsHtml} <br><br> Login to Stremio with the destination account to see your addons!`,
                "Cloning Complete! 🎉"
            );

        } catch (err) {
            // Show error modal to the user
            Modal.error(err.message);

            // If it's not a known user-error (wrong password, etc), send it to HoneyBadger
            if (!StremioAPI.isUserError(err.message)) {
                window.handleError(err);
            }
        } finally {
            this.setUIEnabled(true);
        }
    }

    // Freezes the UI while the process is running
    setUIEnabled(enabled) {
        this.ui.btn.disabled = !enabled;

        if (enabled) {
            this.ui.btn.innerHTML = 'Start Cloning Process';
            this.ui.inputs.sourceEmail.disabled = false;
            this.ui.inputs.sourcePass.disabled = false;
            this.ui.inputs.destEmail.disabled = false;
            this.ui.inputs.destPass.disabled = false;
        } else {
            this.ui.btn.innerHTML = '<span class="loading-spinner"></span> Cloning...';
            this.ui.inputs.sourceEmail.disabled = true;
            this.ui.inputs.sourcePass.disabled = true;
            this.ui.inputs.destEmail.disabled = true;
            this.ui.inputs.destPass.disabled = true;
        }
    }
}

// Initialize
const app = new Cloner();
app.init();
