/**
 * Secure Stremio Session Management
 */
class StremioSession {
    #sessionData = null;

    // Establish authenticated session from login
    setSession(email, authKey) {
        if (!email || !authKey) {
            throw new Error('Email and authKey required for session');
        }

        this.#sessionData = {
            email,
            authKey,
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        if (typeof Logger !== 'undefined') {
            Logger.debug('StremioSession', 'Session established for', { email });
        }
    }

    // Get current session
    getSession() {
        if (!this.#sessionData) return null;

        return {
            email: this.#sessionData.email,
            authKey: this.#sessionData.authKey,
            isExpired: Date.now() > this.#sessionData.expiresAt
        };
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.#sessionData !== null && 
               this.#sessionData.authKey !== undefined &&
               Date.now() < this.#sessionData.expiresAt;
    }

    // Invalidate session (logout)
    clearSession() {
        const hadSession = this.#sessionData !== null;
        this.#sessionData = null;
        
        if (hadSession) {
            if (typeof Logger !== 'undefined') {
                Logger.debug('StremioSession', 'Session cleared');
            }
        }
    }

    // Clean up on page unload
    cleanup() {
        this.clearSession();
    }
}

// Create and expose singleton instance
const StremioSessionInstance = new StremioSession();
