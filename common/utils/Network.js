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

        // List of proxies to try in order.
        // 1. My custom cloudflare worker proxy (preferred)
        // 2. CorsProxy.io (fallback)
        const PROXIES = [
            "https://stremio-proxy.long-surf-c07a.workers.dev/?url=",
            "https://corsproxy.io/?url="
        ];

        let lastError = null;

        for (const proxyBase of PROXIES) {
            const proxyUrl = proxyBase + encodeURIComponent(url);

            try {
                // Cloudflare worker proxy
                const resp = await fetch(proxyUrl, options);

                if (!resp.ok) {
                    // Attempt to parse error message from JSON, fallback to status text
                    const errorBody = await resp.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || errorBody.message || `Proxy Error: ${resp.status} ${resp.statusText}`;

                    // If we get a response, the proxy is working and the error is from the target.
                    throw new Error(errorMessage);
                }

                return await resp.json();
            } catch (e) {
                console.warn(`Proxy attempt failed for ${proxyBase}:`, e);
                lastError = e;
                // Continue to next proxy
            }
        }

        // If we exhausted all proxies
        window.reportError(lastError);
        throw lastError || new Error("All proxy attempts failed.");
    }
}

window.Network = Network;
