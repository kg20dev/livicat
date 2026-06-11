<p align="center">
  <img src="livicat-icon.png" alt="Livicat Icon" width="128" height="128">
</p>

# Livicat — YouTube Live Chat Styling Editor for OBS

A desktop app for customizing YouTube Live Chat appearance for OBS overlays.

![Release](https://img.shields.io/github/v/release/kg20dev/livicat)
![License](https://img.shields.io/badge/license-MIT-green)
![Size](https://img.shields.io/badge/binary%20size-~10%20MB-brightgreen)
![macOS](https://img.shields.io/badge/macOS-supported-brightgreen?logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-supported-brightgreen?logo=windows&logoColor=white)

<p align="center">
  <img src="readme.livicat.gif" alt="Livicat Demo" width="720">
</p>

---

## 📚 Choose Your Documentation

### 🎯 For Streamers & OBS Users
**[→ docs/STREAMER.md](docs/STREAMER.md)** - Complete guide from installation to OBS setup

**Includes:**
- Step-by-step installation
- Quick start guide (5 minutes)
- Two OBS setup methods
- Customization options
- Troubleshooting
- Video tutorials

---

### 🛠️ For Developers & Contributors
**[→ docs/README_DEVELOPER.md](docs/README_DEVELOPER.md)** - Technical documentation

**Includes:**
- Architecture overview
- Development setup
- API reference
- Testing guide
- Build & release process
- Contributing guidelines

---

## ✨ Key Features

- 🎨 **7 Preset Themes** — Default, Minimal, Compact, Large, Stream, Neon, Light, Retro
- ✨ **6 Message Animations** — Blink, Glowing, Fade, Slide, Bounce, Default
- 🪟 **Two OBS Methods** — CSS Export (Browser Source) or Live Preview (Window Capture)
- ⚡ **Real-Time Preview** — Native popup window with always-on-top support
- 📊 **Privacy-First Analytics** — Aptabase with user consent
- 🔒 **Error Reporting** — Sentry for crash tracking
- 🚀 **Lightweight** — 8MB Tauri app (vs 115MB Electron)

---

## 🎥 Demo Videos

**Fast Live Chat Styling:**

<a href="https://www.youtube.com/watch?v=8rsJAPWoyW4" target="_blank">
  <img src="https://img.youtube.com/vi/8rsJAPWoyW4/0.jpg" alt="Fast Live Chat Styling" width="480" style="border-radius: 8px;">
</a>

**OBS Integration Tutorial:**

<a href="https://www.youtube.com/watch?v=pmZq-mYhObc" target="_blank">
  <img src="https://img.youtube.com/vi/pmZq-mYhObc/0.jpg" alt="OBS Integration Tutorial" width="480" style="border-radius: 8px;">
</a>

---

## 📥 Quick Download

🎉 **[Latest Release](https://github.com/kg20dev/livicat/releases)**

- **macOS (Apple Silicon):** `.dmg` installer
- **Windows:** `.exe` installer

---

## 🚀 Quick Start (Streamers)

**2 Minutes to Custom Chat in OBS:**

### Step 1: Download & Install

**macOS (Apple Silicon):**
- Download `.dmg` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
- Open and drag Livicat to Applications

**Windows:**
- Download `.exe` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
- Run installer and open from Start menu

### Step 2: Open Livicat

Launch the app from your Applications folder or Start menu.

### Step 3: Customize Your Chat

1. **Enter stream URL** - Paste your YouTube stream URL
2. **Pick a preset** - Choose a theme (Stream, Neon, Minimal, etc.)
3. **Adjust colors** - Customize background, username, message colors
4. **Choose fonts** - Pick from 12 Google Fonts
5. **Add animations** - Make new messages glow, slide, or bounce
6. **Toggle elements** - Show/hide avatars, timestamps, badges

### Step 4: Add to OBS

**Method 1: Live Preview (Easiest - Window Capture)**
1. Click **"Live Chat"** button
2. Popup opens with your custom chat + always-on-top
3. In OBS: Add **Window Capture** → Select "Livicat — Live Chat Preview"
4. Size and position as needed

**Method 2: CSS Export (Browser Source)**
1. Click **"Export CSS"** (or `Ctrl+Shift+E`)
2. CSS file downloads
3. In OBS: Add **Browser Source**
4. URL: `https://www.youtube.com/live_chat?v=YOUR_VIDEO_ID`
5. Paste downloaded CSS into **"Custom CSS"** field

**[→ Full Setup Guide with Screenshots](docs/STREAMER.md)**

---

## 🛠️ Quick Start (Developers)

### Prerequisites

- **Node.js** 18+ and npm
- **Rust toolchain** (stable) - install via [rustup](https://rustup.rs/)
- **Platform deps** - see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Installation

```bash
# Clone the repository
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install

# Install Rust toolchain (if not already installed)
rustup default stable
```

### Development

```bash
# Run Vite dev server (web mode only)
npm run dev

# Run Tauri desktop app (dev mode with hot-reload)
npm run tauri:dev

# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test
```

### Building

```bash
# Build for production
npm run tauri:build

# Binaries output to:
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
```

### Project Structure

```
livicat/
├── src/                    # React frontend (Vite + TypeScript + TailwindCSS)
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── src-tauri/             # Rust backend (Tauri 2)
│   ├── src/               # Rust source code
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── docs/                  # Documentation
│   ├── STREAMER.md        # Streamer guide
│   └── README_DEVELOPER.md # Developer guide
└── README.md              # This file
```

**[→ Full Developer Guide](docs/README_DEVELOPER.md)**

---

## 🏆 Project Stats

- **Size:** ~10MB (Tauri) vs ~115MB (Electron) — 91% smaller
- **Tests:** 182+ tests (frontend + Rust)
- **Languages:** TypeScript, Rust, React
- **Platforms:** macOS, Windows
- **License:** MIT

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

- [🐛 Report a Bug](https://github.com/kg20dev/livicat/issues/new?template=bug_report.yml)
- [✨ Feature Request](https://github.com/kg20dev/livicat/issues/new)
- [📖 Browse Issues](https://github.com/kg20dev/livicat/issues)

**[→ Developer Documentation](README_DEVELOPER.md#contributing)**

---

## 👥 Team

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

## 📄 License

[MIT](LICENSE)

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)
