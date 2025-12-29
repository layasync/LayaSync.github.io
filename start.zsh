#!/usr/bin/env zsh

# Ensure we are in the script's directory
cd "${0:h:A}"

# Configuration
PORT=3000
URL="http://localhost:$PORT"

# Function to handle cleanup on exit
cleanup() {
    echo "\n✨ Goodbye!"
    exit 0
}
trap cleanup SIGINT

# Main execution
if ! command -v python3 &> /dev/null
then
    echo "❌ Error: Python 3 is not installed."
    exit 1
fi

echo "🚀 Starting Stremio Tools..."
echo "👉 Opening $URL"

# Open the browser in the background after 1 second
(sleep 1 && open "$URL") &

# Start the simple HTTP server
# This works because it serves all files in the current directory (e.g., index.html)
python3 -m http.server "$PORT"