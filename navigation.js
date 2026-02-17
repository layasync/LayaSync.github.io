// Navigation system for Tizen TV remote control
class Navigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.initKeyHandler();
    }

    initKeyHandler() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
        const keyCode = e.keyCode;

        switch(keyCode) {
            case 37: // Left arrow
                this.moveFocus('left');
                e.preventDefault();
                break;
            case 38: // Up arrow
                this.moveFocus('up');
                e.preventDefault();
                break;
            case 39: // Right arrow
                this.moveFocus('right');
                e.preventDefault();
                break;
            case 40: // Down arrow
                this.moveFocus('down');
                e.preventDefault();
                break;
            case 13: // Enter/OK button
                this.selectCurrent();
                e.preventDefault();
                break;
            case 10009: // Back button (Tizen)
            case 461: // Back button (some TVs)
                this.handleBack();
                e.preventDefault();
                break;
            case 427: // Channel Up (Zap Up)
                this.handleChannelUp();
                e.preventDefault();
                break;
            case 428: // Channel Down (Zap Down)
                this.handleChannelDown();
                e.preventDefault();
                break;
            case 403: // Red button
                this.handleColorButton('red');
                e.preventDefault();
                break;
            case 404: // Green button
                this.handleColorButton('green');
                e.preventDefault();
                break;
            case 405: // Yellow button
                this.handleColorButton('yellow');
                e.preventDefault();
                break;
            case 406: // Blue button
                this.handleColorButton('blue');
                e.preventDefault();
                break;
            case 415: // Play button
                this.handlePlayPause();
                e.preventDefault();
                break;
            case 19: // Pause button
                this.handlePlayPause();
                e.preventDefault();
                break;
            case 413: // Stop button
                this.handleStop();
                e.preventDefault();
                break;
        }
    }

    updateFocusableElements() {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            this.focusableElements = Array.from(activeScreen.querySelectorAll('.focusable:not([disabled])'));

            // If there are focusable elements and none is focused, focus the first one
            if (this.focusableElements.length > 0 && !this.focusableElements.some(el => el.classList.contains('focused'))) {
                this.currentFocusIndex = 0;
                this.setFocus(0);
            } else {
                // Find currently focused element
                const focusedIndex = this.focusableElements.findIndex(el => el.classList.contains('focused'));
                if (focusedIndex !== -1) {
                    this.currentFocusIndex = focusedIndex;
                }
            }
        }
    }

    setFocus(index) {
        // Remove focus from all elements
        this.focusableElements.forEach(el => el.classList.remove('focused'));

        // Add focus to the selected element
        if (index >= 0 && index < this.focusableElements.length) {
            this.currentFocusIndex = index;
            this.focusableElements[index].classList.add('focused');

            // Scroll into view if needed
            this.focusableElements[index].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }

    moveFocus(direction) {
        if (this.focusableElements.length === 0) return;

        const currentElement = this.focusableElements[this.currentFocusIndex];
        const currentRect = currentElement.getBoundingClientRect();
        let bestIndex = this.currentFocusIndex;
        let bestDistance = Infinity;

        this.focusableElements.forEach((element, index) => {
            if (index === this.currentFocusIndex) return;

            const rect = element.getBoundingClientRect();
            let isInDirection = false;
            let distance = 0;

            switch(direction) {
                case 'up':
                    isInDirection = rect.top < currentRect.top;
                    distance = currentRect.top - rect.bottom;
                    break;
                case 'down':
                    isInDirection = rect.bottom > currentRect.bottom;
                    distance = rect.top - currentRect.bottom;
                    break;
                case 'left':
                    isInDirection = rect.left < currentRect.left;
                    distance = currentRect.left - rect.right;
                    break;
                case 'right':
                    isInDirection = rect.right > currentRect.right;
                    distance = rect.left - currentRect.right;
                    break;
            }

            if (isInDirection && distance >= 0 && distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        });

        if (bestIndex !== this.currentFocusIndex) {
            this.setFocus(bestIndex);
        }
    }

    selectCurrent() {
        if (this.focusableElements.length > 0) {
            const currentElement = this.focusableElements[this.currentFocusIndex];

            // Trigger click event
            if (currentElement.onclick) {
                currentElement.onclick();
            } else {
                currentElement.click();
            }
        }
    }

    handleBack() {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const screenId = activeScreen.id;

            switch(screenId) {
                case 'loginScreen':
                    // Exit app
                    if (typeof tizen !== 'undefined') {
                        tizen.application.getCurrentApplication().exit();
                    }
                    break;
                case 'mainMenuScreen':
                    // Exit app or go to login
                    showLogin();
                    break;
                case 'playerScreen':
                    closePlayer();
                    break;
                default:
                    showMainMenu();
                    break;
            }
        }
    }

    handleChannelUp() {
        // Zap to previous channel
        if (window.currentPlayerMode === 'live') {
            previousChannel();
        }
    }

    handleChannelDown() {
        // Zap to next channel
        if (window.currentPlayerMode === 'live') {
            nextChannel();
        }
    }

    handleColorButton(color) {
        // Handle colored button presses
        switch(color) {
            case 'red':
                // Toggle subtitles
                toggleSubtitles();
                break;
            case 'green':
                // Toggle audio
                toggleAudio();
                break;
            case 'yellow':
                // Info/EPG
                break;
            case 'blue':
                // Favorites
                break;
        }
    }

    handlePlayPause() {
        togglePlayPause();
    }

    handleStop() {
        closePlayer();
    }
}

// Initialize navigation
const navigation = new Navigation(); 