#!/usr/bin/env zsh

# Ensure we are in the script's directory
cd "${0:h:A}"

# Function to find an available port
find_available_port() {
    python3 -c '
import socket
port = 3000
while True:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", port))
            print(port)
            break
    except OSError:
        port += 1
'
}

# Configuration
PORT=$(find_available_port)
URL="http://localhost:$PORT"

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
python3 -m http.server "$PORT"