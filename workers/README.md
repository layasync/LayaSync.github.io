# Setting up your Cloudflare Worker Proxy

This guide will help you set up a free Cloudflare Worker to securely proxy API requests.

## 1. Create a Cloudflare Account
If you don't have one, sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up). It's free.

## 2. Create a Worker
1.  Log in to the Cloudflare Dashboard.
2.  Go to **Workers & Pages** under **Computer & AI** in the left sidebar.
3.  Click **Create Application** -> **Start with Hello World!**.
4.  Accept the default name (e.g., `misty-pine-1234`) or give it a name like `stremio-proxy`.
5.  Click **Deploy** (this deploys a "Hello World" worker initially).

## 3. Add the Proxy Code
1.  Click **Edit Code**.
2.  Delete the existing code in `worker.js`.
3.  Copy and paste the entire content of the `proxy-worker.js` file from this directory.
4.  Click **Deploy** in the top right.

## 4. Get your URL
1.  Go back to the dashboard for your worker.
2.  You will see a "Preview" URL (e.g., `https://stremio-proxy.your-name.workers.dev`).
3.  Copy this URL.

## 5. Update Config
1.  Open `common/utils/proxy-fetcher.js` in this project.
2.  Find the `PROXY_BASE` variable.
3.  Paste your Worker URL there, ensuring it ends with `?url=`.

That's it! Your application will now route requests through your own secure worker.
