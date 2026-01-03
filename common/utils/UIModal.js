/**
 * Modal Class
 * A lightweight, promise-based replacement for native alert/confirm/prompt.
 * Styleable via CSS.
 */
class Modal {
    static _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'simple-modal-overlay';
        overlay.innerHTML = `
            <div class="simple-modal">
                <h3 id="simpleModalTitle" class="simple-modal-title"></h3>
                <div id="simpleModalContent" class="simple-modal-content"></div>
                <div id="simpleModalInputContainer" class="simple-modal-input-container hidden">
                    <input type="text" id="simpleModalInput" class="simple-modal-input">
                </div>
                <div class="simple-modal-actions">
                    <button id="simpleModalCancel" class="simple-modal-btn secondary hidden">Cancel</button>
                    <button id="simpleModalConfirm" class="simple-modal-btn primary">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    static _cleanup(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                // Re-check existence in case it was removed during the timeout
                // This can happen if the modal is closed while the timeout is pending
                // There is nothing wrong with trying to remove the child, but it will send an
                // unnecessary error to HoneyBadger
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 200);
        }
    }

    static alert(message, title = "Alert") {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();

            overlay.querySelector('#simpleModalTitle').textContent = title;
            overlay.querySelector('#simpleModalContent').innerHTML = `<p>${message}</p>`; // Allow HTML in alert

            const btnConfirm = overlay.querySelector('#simpleModalConfirm');

            // Focus primary button
            btnConfirm.focus();

            btnConfirm.onclick = () => {
                this._cleanup(overlay);
                resolve();
            };

            // Enter key support
            overlay.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    btnConfirm.click();
                }
            };
        });
    }

    static confirm(message, title = "Confirm") {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();

            overlay.querySelector('#simpleModalTitle').textContent = title;
            overlay.querySelector('#simpleModalContent').innerHTML = `<p>${message}</p>`;

            const btnConfirm = overlay.querySelector('#simpleModalConfirm');
            const btnCancel = overlay.querySelector('#simpleModalCancel');

            btnCancel.classList.remove('hidden');
            btnConfirm.textContent = 'Yes';

            btnCancel.onclick = () => {
                this._cleanup(overlay);
                resolve(false);
            };

            btnConfirm.onclick = () => {
                this._cleanup(overlay);
                resolve(true);
            };

            // Focus confirm for convenience.
            btnConfirm.focus();
        });
    }

    static prompt(message, defaultValue = "", title = "Prompt") {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();

            overlay.querySelector('#simpleModalTitle').textContent = title;
            overlay.querySelector('#simpleModalContent').innerHTML = `<p>${message}</p>`;

            const inputContainer = overlay.querySelector('#simpleModalInputContainer');
            const input = overlay.querySelector('#simpleModalInput');
            const btnConfirm = overlay.querySelector('#simpleModalConfirm');
            const btnCancel = overlay.querySelector('#simpleModalCancel');

            inputContainer.classList.remove('hidden');
            btnCancel.classList.remove('hidden');
            input.value = defaultValue;

            btnCancel.onclick = () => {
                this._cleanup(overlay);
                resolve(null);
            };

            const submit = () => {
                const val = input.value;
                this._cleanup(overlay);
                resolve(val);
            };

            btnConfirm.onclick = submit;

            // Input handlers
            input.focus();
            input.select();
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    submit();
                }
                if (e.key === 'Escape') {
                    btnCancel.click();
                }
            };
        });
    }

    static error(message) {
        return this.alert(message, "Error");
    }
}

window.Modal = Modal;
