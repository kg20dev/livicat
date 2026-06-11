<p align="center">
  <img src="livicat-icon.png" alt="Livicat Icon" width="128" height="128">
</p>

# Livicat — YouTube Live Chat Styling Editor

A desktop Tauri app for customizing YouTube Live Chat appearance for OBS browser source overlays.

![Release](https://img.shields.io/github/v/release/kg20dev/livicat)
![License](https://img.shields.io/badge/license-MIT-green)
![Size](https://img.shields.io/badge/binary%20size-~10%20MB-brightgreen)
![macOS](https://img.shields.io/badge/macOS-supported-brightgreen?logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-supported-brightgreen?logo=windows&logoColor=white)

<p align="center">
  <img src="readme.livicat.gif" alt="Livicat Demo" width="720">
</p>

---

## Latest Release

🎉 **[View on GitHub Releases](https://github.com/kg20dev/livicat/releases)**

### Recent Highlights

- 🚀 **Tauri Desktop App** — 93% smaller than Electron (8 MB vs 115 MB)
- 📊 **Aptabase Analytics** — Privacy-first usage tracking with user consent
- 🎨 **Full CSS Customization** — 7 presets, 6 animations, 12 Google fonts
- 🪟 **Cross-Platform** — macOS (Apple Silicon) and Windows builds
- ⚡ **Real-Time Preview** — Native popup window with always-on-top support
- 📤 **OBS-Ready Export** — Download CSS for browser source overlays

### Download

Visit [GitHub Releases](https://github.com/kg20dev/livicat/releases) for the latest version and platform-specific installers.

---

## What It Does

Livicat is a **CSS styling tool** for YouTube Live Chat. It lets you:

- 🎨 **Customize chat appearance** — Colors, fonts, spacing, opacity, animations
- 🖥️ **Preview in real-time** — Tauri popup with always-on-top window
- 📤 **Export CSS for OBS** — Download ready-to-use CSS for browser source
- ✨ **Add message animations** — 6 styles (blink, glowing, fade, slide, bounce, default)
- 🎯 **Choose from presets** — 7 themes (Default, Minimal, Compact, Large, Stream, Neon, Light, Retro)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Rust toolchain** (stable) — install via [rustup](https://rustup.rs/) (required for Tauri)
- **Platform deps** — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Option 1: Download Pre-built Apps

**macOS (Apple Silicon):**
- Download the latest `.dmg` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
- Open and drag Livicat to Applications

### Option 2: Build from Source

```bash
# Clone the repo
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install

# Start Vite dev server only (web mode, no native window)
npm run dev

# Or run Tauri desktop app (dev mode with hot-reload)
npm run tauri:dev

# Build for production
npm run tauri:build
```

---

## How It Works

### Web Mode (`npm run dev`)

1. Open `http://localhost:3000`
2. **Testing Mode**: Preview your custom CSS with demo chat messages
3. **Live/Past Video**: Paste a YouTube URL to see video info and preview
4. **Export CSS**: Click "Export CSS" to download OBS-ready stylesheet

### Tauri Desktop Mode (`npm run tauri:dev`)

1. The Livicat editor window opens
2. Enter a YouTube video URL and click "Fetch"
3. Click **"Live Chat"** to open a popup window with YouTube's live chat + your CSS injected
4. The popup stays **always-on-top** for OBS convenience
5. Use OBS **Window Capture** to capture the popup

---

## Usage

### 1. Customize Appearance

Use the **Styling Panel** (right sidebar) to adjust:

| Setting | Options |
|---------|---------|
| Preset Themes | Default, Minimal, Compact, Large, Stream, Neon, Light, Retro |
| Message Animation | Default, Blink, Glowing, Fade, Slide, Bounce |
| Animation Speed | None, Slow, Normal |
| Colors | Background, username, message, accent, scrollbar |
| Typography | 12 Google Fonts, sizes 12-24px |
| Spacing | Compact, Normal, Comfortable |
| Opacity | Message and container opacity 0-100% |
| Toggles | Avatars, timestamps, header, scroll button |

All settings auto-save to your browser.

### 2. Preview Your Chat

**Testing Mode** (no URL needed):
- See demo messages with your custom CSS
- Perfect for quick styling iterations

**Live/Past Video Mode**:
- Paste any YouTube URL
- App fetches video title, author, thumbnail
- Preview with demo messages + your CSS

**Tauri Popup**:
- Opens YouTube's actual live chat in a popup
- Your CSS is injected automatically
- Always-on-top for OBS window capture

### 3. Export for OBS

1. Customize your chat appearance
2. Click **"Export CSS"** in sidebar (or press `Ctrl+Shift+E`)
3. CSS file downloads automatically

**In OBS:**
- Add **Browser Source** → URL: `https://www.youtube.com/live_chat?v=VIDEO_ID`
- Paste downloaded CSS into **"Custom CSS"** field
- Set dimensions (recommend: 400×600)

---

## Development

```bash
npm run dev            # Vite dev server (http://localhost:3000)
npm run tauri:dev      # Tauri desktop app (dev mode with hot-reload)
npm run tauri:build    # Build production Tauri app
npm test               # Run 157+ tests
npm run type-check     # TypeScript check
npm run lint           # ESLint
npm run format         # Prettier
```

## Release

See [RELEASE.md](RELEASE.md) for build, release workflow, and platform downloads.

## Project Structure

```
livicat/
├── src/                    # React frontend (Vite + TypeScript + TailwindCSS)
└── src-tauri/              # Rust backend (Tauri 2, IPC commands, app config)
```

## How It Works

- **Frontend**: React app generates CSS from user settings, sends it via Tauri IPC to the Rust backend
- **Backend**: Rust creates an OS-native webview window (WKWebView on Mac, WebView2 on Windows) loading YouTube live chat, injects the CSS
- **No YouTube API key needed**: Uses YouTube's public oEmbed for metadata and native `youtube.com/live_chat` iframe for chat

---

## Features

### ✅ Implemented

- ✅ Tauri desktop app with always-on-top popup (~8 MB binary)
- ✅ 7 preset themes + full customization
- ✅ 6 message animation styles
- ✅ CSS export for OBS browser source
- ✅ Google Fonts integration (12 fonts)
- ✅ Real-time preview (demo + native popup)
- ✅ Video metadata fetch (oEmbed API)
- ✅ Settings persistence (localStorage)
- ✅ Keyboard shortcut (`Ctrl+Shift+E` to export)
- ✅ Cross-platform support (macOS, Windows)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Tauri build fails** | Ensure Rust toolchain is installed: `rustup default stable` |
| **Popup missing** | Check Tauri runtime is active (look for "Live Chat" button in app) |
| **CSS not applying in OBS** | Clear OBS browser cache, refresh source |
| **Export not working** | Check browser downloads, ensure popups allowed |
| **Video not found** | Verify YouTube URL is public and not deleted |

---

## Contributing

Found a bug or have a feature idea? We'd love to hear from you.

- **🐛 Report a Bug** — [Open a bug report](https://github.com/kg20dev/livicat/issues/new?template=bug_report.yml) with your OS, app version, and steps to reproduce
- **✨ Feature Request** — [Open an issue](https://github.com/kg20dev/livicat/issues/new) and describe what you'd like to see
- **📖 Browse Issues** — Check [existing issues](https://github.com/kg20dev/livicat/issues) before posting

---

## Thanks to the Community

Livicat is made better by the streamers, developers, and testers who use it, report bugs, suggest features, and contribute code. Thank you! 🙌

### Project Members

<a href="https://github.com/migorengx">
  <img src="https://github.com/migorengx.png" width="60" height="60" alt="migorengx" style="border-radius: 50%; margin: 4px;" title="migorengx — Creator & Maintainer">
</a>
<a href="https://github.com/sutoberiii">
  <img src="https://github.com/sutoberiii.png" width="60" height="60" alt="sutoberiii" style="border-radius: 50%; margin: 4px;" title="sutoberiii — Collaborator">
</a>
<a href="https://github.com/Necromanchi">
  <img src="https://github.com/Necromanchi.png" width="60" height="60" alt="Necromanchi" style="border-radius: 50%; margin: 4px;" title="Necromanchi — Collaborator">
</a>

---

## License

[MIT](LICENSE)

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)
