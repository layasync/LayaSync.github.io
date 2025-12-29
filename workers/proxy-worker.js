export default {
    // The main entry point for the Cloudflare Worker.
    // 'request' is the incoming HTTP request.
    // 'env' contains environment variables/bindings.
    // 'ctx' provides execution context (e.g., for waitUntil).
    async fetch(request, env, ctx) {
        // Define a list of allowed origins (domains/IPs) that can use this proxy.
        // This helps prevent unauthorized websites from abusing your proxy.
        const ALLOWED_ORIGINS = [
            "http://localhost",
            "http://127.0.0.1",
            "https://duckkota.gitlab.io"
        ];

        // Check if the incoming origin is in our allowed list.
        const origin = request.headers.get("Origin");
        const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));

        // Construct the CORS (Cross-Origin Resource Sharing) headers.
        // If the origin is allowed, we echo it back in 'Access-Control-Allow-Origin'.
        // If not, we set it to "null", effectively blocking the browser from reading the response.
        const corsHeaders = {
            "Access-Control-Allow-Origin": isAllowed ? origin : "null",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS", // Allowed HTTP methods
            "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
        };

        // Handle CORS Preflight Requests (OPTIONS method).
        // Browsers send an OPTIONS request before the actual request to check permissions.
        // We return a 200 OK with the CORS headers immediately.
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: corsHeaders,
            });
        }

        // Extract the target URL from the query parameter 'url'.
        // Example: https://worker.dev/?url=https://api.example.com/data
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get("url");

        // If no target URL is provided, return a 400 Bad Request error.
        if (!targetUrl) {
            return new Response("Missing 'url' query parameter.", {
                status: 400
            });
        }

        try {
            // Reconstruct the request to send to the actual target.
            // We copy the method (GET, POST, etc.), headers, and body from the original request.
            const targetRequest = new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
            });

            // Strip headers that could cause the target server to reject the request.
            // 'Host': Needs to be the target's host, not the worker's. Fetch handles this automatically if removed.
            // 'Origin' & 'Referer': Removing these prevents the target from blocking us based on source.
            targetRequest.headers.delete("Host");
            targetRequest.headers.delete("Origin");
            targetRequest.headers.delete("Referer");

            // Perform the actual fetch request to the target URL.
            const response = await fetch(targetRequest);

            // Create a new Response object based on the target's response.
            // We do this because the original response is immutable (read-only), so we can't add headers to it directly.
            const newResponse = new Response(response.body, response);

            // Append our CORS headers to this new response.
            // This ensures the browser allows the frontend to read the data.
            Object.keys(corsHeaders).forEach((key) => {
                newResponse.headers.set(key, corsHeaders[key]);
            });

            // Return the final response with data and CORS headers.
            return newResponse;
        } catch (e) {
            // If anything goes wrong (e.g., network error, invalid URL), return a 500 error.
            return new Response(`Proxy Error: ${e.message}`, {
                status: 500,
                headers: corsHeaders
            });
        }
    },
};
