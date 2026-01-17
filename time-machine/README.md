# Stremio Time Machine 🕰️

**Time Machine** is a powerful snapshot manager for your Stremio account. It allows you to instantly backup your current addon configuration, explore your history, and restore your account to any previous state with a single click.

## ✨ Features

- **📸 Instant Snapshots**: Capture your entire Stremio addon list in seconds.
- **🔄 Smart Restore**: Revert your account to any previous state.
- **🧠 Deep Integration**: Automatically handles complex addons like **AIOStreams** and **AIOMetadata**.
- **📝 Contextual Notes**: Add notes to your snapshots to remember why you saved a specific configuration (e.g., "Best Anime Setup", "Lightweight Build").
- **🔒 Secure & Local**: Your snapshot data is stored locally in your browser, and your credentials are used only to communicate directly with the Stremio API.

## 🚀 Getting Started

[👉 Open Time Machine](https://duckkota.gitlab.io/stremio-tools/time-machine/)

1.  **Login**: Use your Stremio email and password to authenticate.
2.  **Create a Snapshot**: Click the **Create Snapshot Now** button on the dashboard. Time Machine will fetch your current addons and save them.
3.  **Manage Snapshots**:
    -   **Add Note**: Click the ➕ icon on a snapshot to add a description.
    -   **Restore**: Click **Restore This Version** to overwrite your current account with the selected snapshot.
    -   **Delete**: Remove old snapshots you no longer need.

## 🛠️ How It Works

Time Machine acts as a bridge between your local history and the Stremio API.

1.  **Storage**: Snapshots are saved in your browser's storage.
2.  **Authentication**: It authenticates with the official Stremio backend to fetch and set addons.
3.  **Deep Strategies**: Specialized strategies (e.g., for AIOStreams) handle the complexity of addons that have expiring sessions or unique configuration keys, ensuring that a restored snapshot actually works.

---

*Note: This tool is currently in Beta.*
