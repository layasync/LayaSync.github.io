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

    // Fetch data from a URL, falling back to proxy if direct fetch fails.
    static async request(url, options = {}) {
        const shouldUseProxy = this.isCrossOrigin(url) && !options.forceDirect;

        if (!shouldUseProxy) {
            try {
                // Try direct fetch (for local files, same-origin, or explicitly forced)
                const resp = await fetch(url, options);
                if (resp.ok) {
                    return await resp.json();
                }
                console.warn(`Direct fetch failed for ${url}: ${resp.status}`);
            } catch (e) {
                console.warn(`Direct fetch error for ${url}, falling back to proxy...`, e);
                // Fallthrough to proxy if direct fails (e.g. valid relative path but 404, or network err)
            }
        }

        // Construct the proxy URL. PROXY_BASE is expected to end with a query param like "?url="
        const PROXY_BASE = "https://stremio-proxy.long-surf-c07a.workers.dev/?url=";
        const proxyUrl = PROXY_BASE + encodeURIComponent(url);

        try {
            // Cloudflare Worker generally supports forwarding the method and body.
            // We pass the original options object to the proxy fetch call.
            const resp = await fetch(proxyUrl, options);

            if (!resp.ok) {
                // Attempt to parse error message from JSON, fallback to status text
                const errorBody = await resp.json().catch(() => ({}));
                throw new Error(errorBody.error?.message || errorBody.message || `Proxy Error: ${resp.status} ${resp.statusText}`);
            }

            return await resp.json();
        } catch (e) {
            throw e;
        }
    }
}

window.Network = Network;
