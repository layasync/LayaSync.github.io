/**
 * Network Class
 * Helper to fetch data via a Cloudflare worker proxy to bypass CORS.
 */
class Network {
    // Check if a URL is cross-origin relative to the current window.
    static isCrossOrigin(url) {
        try {
            // If it's a relative path, it's not cross-origin
            if (!url.startsWith('http')) {
                return false;
            }

            // Compare with current origin
            const targetOrigin = new URL(url).origin;
            return targetOrigin !== window.location.origin;
        } catch (e) {
            return false;
        }
    }

    // Helper to fetch with timeout
    static async fetchWithTimeout(fetchUrl, fetchOptions, timeout = 30000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(fetchUrl, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeout}ms`);
            }
            throw error;
        }
    }

    // Fetch data from a URL, falling back to proxy if direct fetch fails.
    static async request(url, options = {}) {
        // Smart Default: Retry GET requests once by default if not specified
        if (options.retries === undefined) {
            const method = options.method || 'GET';
            if (method.toUpperCase() === 'GET') {
                options.retries = 1;
            }
        }

        const shouldUseProxy = this.isCrossOrigin(url) && !options.forceDirect;

        if (!shouldUseProxy) {
            try {
                // Try direct fetch (for local files, same-origin, or explicitly forced)
                const resp = await this.fetchWithTimeout(url, options, options.timeout);
                if (resp.ok) {
                    try {
                        return await resp.json();
                    } catch (err) {
                        const text = await resp.text().catch(() => "Unable to read response text");
                        throw new Error(`Failed to parse direct response as JSON. Status: ${resp.status}. Body preview: ${text.substring(0, 100)}...`);
                    }
                }
                console.warn(`Direct fetch failed for ${url}: ${resp.status}`);
            } catch (e) {
                console.warn(`Direct fetch error for ${url}, falling back to proxy...`, e);
                // Fallthrough to proxy if direct fails (e.g. valid relative path but 404, or network err)
            }
        }

        // List of proxies to try in order.
        // 1. My custom cloudflare worker proxy (preferred)
        // 2. CorsProxy.io (fallback)
        const PROXIES = [
            "https://stremio-proxy.long-surf-c07a.workers.dev/?url=",
            "https://corsproxy.io/?url=",
            "https://api.allorigins.win/raw?url="
        ];

        let lastError = null;

        for (const proxyBase of PROXIES) {
            const proxyUrl = proxyBase + encodeURIComponent(url);

            try {
                // Cloudflare worker proxy
                const resp = await this.fetchWithTimeout(proxyUrl, options, options.timeout);

                if (!resp.ok) {
                    // Attempt to parse error message from JSON, fallback to status text
                    const errorBody = await resp.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || errorBody.message || `Proxy Error: ${resp.status} ${resp.statusText}`;

                    // If we get a response, is it from the proxy?
                    // 4xx errors are almost always from the proxy -> STOP ROTATION
                    // 5xx errors could be the proxy failing (e.g. 502 Bad Gateway) -> CONTINUE ROTATION (Try next proxy)
                    const apiError = new Error(errorMessage);
                    if (resp.status >= 400 && resp.status < 500) {
                        apiError.stopRotation = true;
                    }
                    throw apiError;
                }

                try {
                    return await resp.json();
                } catch (err) {
                    const text = await resp.text().catch(() => "Unable to read response text");
                    throw new Error(`Failed to parse proxy response as JSON. Status: ${resp.status}. Body preview: ${text.substring(0, 100)}...`);
                }
            } catch (e) {
                // If it's a functional error from the API (stopRotation), rethrow immediately
                if (e.stopRotation) {
                    throw e;
                }

                console.warn(`Proxy attempt failed for ${proxyBase}:`, e);
                lastError = e;
            }
        }

        // Retry logic
        if (options.retries && options.retries > 0) {
            console.warn(`Request failed, retrying... (${options.retries} attempts left)`);
            return await this.request(url, { ...options, retries: options.retries - 1 });
        }

        // If we exhausted all proxies
        throw lastError;
    }
}

window.Network = Network;
