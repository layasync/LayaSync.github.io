export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin");

        // Define allowed origins
        const ALLOWED_ORIGINS = [
            "http://localhost", // Matches localhost on any port (startsWith check below)
            "http://127.0.0.1",
            "https://duckkota.gitlab.io" // GitLab Pages sites
        ];

        // Check if origin is allowed
        const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));

        // If not allowed, restrict access (or just don't send CORS headers, which blocks the browser)
        // We'll set the header to the specific origin if allowed, ensuring we don't use '*'
        // Echo back whatever headers the browser is requesting (e.g. apikey, Authorization)
        // so custom headers like Supabase's 'apikey' aren't blocked by the preflight check.
        const requestedHeaders = request.headers.get("Access-Control-Request-Headers");
        const corsHeaders = {
            "Access-Control-Allow-Origin": isAllowed ? origin : "null",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": requestedHeaders || "Content-Type, Authorization",
        };

        // Handle OPTIONS (Preflight)
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: corsHeaders,
            });
        }

        const url = new URL(request.url);
        const targetUrl = url.searchParams.get("url");

        if (!targetUrl) {
            return new Response("Missing 'url' query parameter.", { status: 400 });
        }

        try {
            // Reconstruct the request to the target
            const targetRequest = new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
            });

            // Strip headers that might cause issues
            targetRequest.headers.delete("Host");
            targetRequest.headers.delete("Origin");
            targetRequest.headers.delete("Referer");

            const response = await fetch(targetRequest);

            // Recreate response to modify headers
            const newResponse = new Response(response.body, response);

            // Add CORS headers to the response
            Object.keys(corsHeaders).forEach((key) => {
                newResponse.headers.set(key, corsHeaders[key]);
            });

            return newResponse;
        } catch (e) {
            return new Response(`Proxy Error: ${e.message}`, { status: 500, headers: corsHeaders });
        }
    },
};
