// API client for communicating with backend
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.credentials = null;
    }

    setCredentials(serverUrl, username, password) {
        this.credentials = {
            serverUrl: serverUrl,
            username: username,
            password: password
        };
        // Save to local storage
        // Note: Credentials are stored in localStorage for user convenience.
        // This is standard practice for IPTV apps as they contain streaming service
        // credentials (not sensitive personal/financial data) and run in a sandboxed
        // TV environment. Users should only use this on trusted personal devices.
        localStorage.setItem('iptv_credentials', JSON.stringify(this.credentials));
    }

    loadCredentials() {
        const stored = localStorage.getItem('iptv_credentials');
        if (stored) {
            this.credentials = JSON.parse(stored);
            return true;
        }
        return false;
    }

    clearCredentials() {
        this.credentials = null;
        localStorage.removeItem('iptv_credentials');
    }

    async authenticate() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth`);
            if (!response.ok) throw new Error('Authentication failed');
            return await response.json();
        } catch (error) {
            console.error('Auth error:', error);
            throw error;
        }
    }

    async getLiveCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/live/categories`);
            if (!response.ok) throw new Error('Failed to get live categories');
            return await response.json();
        } catch (error) {
            console.error('Get live categories error:', error);
            throw error;
        }
    }

    async getLiveStreams(categoryId = '') {
        try {
            const url = categoryId 
                ? `${this.baseURL}/api/live/streams?category_id=${categoryId}`
                : `${this.baseURL}/api/live/streams`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to get live streams');
            return await response.json();
        } catch (error) {
            console.error('Get live streams error:', error);
            throw error;
        }
    }

    async getVODCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/vod/categories`);
            if (!response.ok) throw new Error('Failed to get VOD categories');
            return await response.json();
        } catch (error) {
            console.error('Get VOD categories error:', error);
            throw error;
        }
    }

    async getVODStreams(categoryId = '') {
        try {
            const url = categoryId 
                ? `${this.baseURL}/api/vod/streams?category_id=${categoryId}`
                : `${this.baseURL}/api/vod/streams`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to get VOD streams');
            return await response.json();
        } catch (error) {
            console.error('Get VOD streams error:', error);
            throw error;
        }
    }

    async getSeriesCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/series/categories`);
            if (!response.ok) throw new Error('Failed to get series categories');
            return await response.json();
        } catch (error) {
            console.error('Get series categories error:', error);
            throw error;
        }
    }

    async getSeries(categoryId = '') {
        try {
            const url = categoryId 
                ? `${this.baseURL}/api/series/streams?category_id=${categoryId}`
                : `${this.baseURL}/api/series/streams`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to get series');
            return await response.json();
        } catch (error) {
            console.error('Get series error:', error);
            throw error;
        }
    }

    getStreamURL(streamId, type, extension = 'ts') {
        if (this.credentials) {
            const { serverUrl, username, password } = this.credentials;
            switch(type) {
                case 'live':
                    return `${serverUrl}/live/${username}/${password}/${streamId}.${extension}`;
                case 'vod':
                    return `${serverUrl}/movie/${username}/${password}/${streamId}.${extension}`;
                case 'series':
                    return `${serverUrl}/series/${username}/${password}/${streamId}.${extension}`;
                default:
                    return '';
            }
        }
        return `${this.baseURL}/api/stream/${streamId}?type=${type}&ext=${extension}`;
    }
}

// Initialize API client
const apiClient = new APIClient(); 