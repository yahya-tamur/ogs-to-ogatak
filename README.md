# OGS → Ogatak

A Chrome extension that grabs the SGF of the game or review you're viewing on [online-go.com](https://online-go.com) and opens it in [Ogatak](https://github.com/rooklift/ogatak).

## Install (Linux, Chrome/Chromium/Brave)

1. Register the native-messaging host:
   ```bash
   ./install.sh [path-to-ogatak]   # default: /opt/ogatak/ogatak
   ```
2. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and pick the `extension/` folder.

## Usage

On an OGS game or review page, click the toolbar button or press **Alt+Shift+O**. The SGF is saved to `~/Downloads/ogs-sgf/` and opened in Ogatak.
