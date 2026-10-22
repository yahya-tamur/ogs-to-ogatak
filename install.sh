#!/usr/bin/env bash
# Registers the native-messaging host with Chrome/Chromium for the current user.
# Usage: ./install.sh [path-to-ogatak]   (default: /opt/ogatak/ogatak)
set -euo pipefail

HOST_NAME="com.ogs_to_ogatak"
EXT_ID="fkanbjpenddkcoholhgkabjigaahhfmn"   # fixed by "key" in extension/manifest.json
OGATAK="${1:-/opt/ogatak/ogatak}"
DIR="$(cd "$(dirname "$0")" && pwd)"

[ -x "$OGATAK" ] || { echo "Ogatak not found/executable at $OGATAK" >&2; exit 1; }

# Install the host script to a path without spaces, with the Ogatak path baked in.
INSTALL_DIR="$HOME/.local/share/ogs-to-ogatak"
mkdir -p "$INSTALL_DIR"
HOST_PATH="$INSTALL_DIR/ogs_to_ogatak.py"
sed "s|^OGATAK = .*|OGATAK = \"$OGATAK\"|" "$DIR/host/ogs_to_ogatak.py" > "$HOST_PATH"
chmod +x "$HOST_PATH"

MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Open OGS SGFs in Ogatak",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF
)

for d in \
  "$HOME/.config/google-chrome" \
  "$HOME/.config/google-chrome-beta" \
  "$HOME/.config/chromium" \
  "$HOME/.config/BraveSoftware/Brave-Browser" \
  "$HOME/snap/chromium/common/chromium"; do
  if [ -d "$d" ]; then
    mkdir -p "$d/NativeMessagingHosts"
    echo "$MANIFEST" > "$d/NativeMessagingHosts/$HOST_NAME.json"
    echo "Registered host in $d"
  fi
done

echo "Host installed at $HOST_PATH (Ogatak: $OGATAK)"
echo "Now load $DIR/extension via chrome://extensions → Developer mode → Load unpacked."
