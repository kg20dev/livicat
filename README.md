# Livicat — YouTube Live Chat Editor for OBS

A desktop local web app for displaying YouTube Live Chat as an OBS browser source overlay. Built with React, TypeScript, and Tailwind CSS.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **🔴 Live Chat Display** — Real-time YouTube chat messages with auto-scroll
- **🎨 Visual Customization** — Font sizes, colors, spacing, opacity, and preset themes
- **🔑 API Key Persistence** — Save your YouTube API key securely in localStorage
- **🔗 Smart URL Parsing** — Paste full YouTube URLs or just video IDs
- **📡 Stream Validation** — Detects live, ended, private, or invalid streams
- **🖥️ OBS Optimized** — Transparent background mode for browser source overlay
- **⚡ Performance** — No external animations, lightweight DOM, requestAnimationFrame scrolling
- **♿ Accessible** — ARIA live regions, keyboard navigable controls

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **YouTube Data API v3 key** — [Get one from Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Setup

```bash
# Clone the repo
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Using with OBS

1. Start the app (`npm run dev` or build with `npm run build`)
2. Enable **Transparent Background** toggle in the sidebar (OBS Mode)
3. In OBS, add a **Browser Source** pointed to `http://localhost:3000`
4. Set the browser source dimensions (e.g., 400×600)
5. Enable **"Controls are visible"** if you need the sidebar (or disable for clean overlay)

---

## Usage

### 1. Get a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **YouTube Data API v3**
4. Create an API key under **Credentials**
5. Copy the key (starts with `AIzaSy...`)

### 2. Connect to a Stream

1. Paste your API key into the **YouTube API Key** field
2. Enter a YouTube **Video ID or URL** (e.g., `https://youtube.com/watch?v=dQw4w9WgXcQ`)
3. The app validates the stream — you'll see live/ended/invalid status
4. Click **Connect to Chat** to start receiving messages

### 3. Customize Appearance

Use the **Settings Panel** to adjust:

| Setting | Options |
|---------|---------|
| Preset Themes | Default, Minimal, Compact, Large, Stream |
| Font Size | 12px – 24px |
| Message Spacing | Compact, Normal, Comfortable |
| Background Opacity | 0% – 100% |
| Username Color | Any hex color |
| Show/Hide Avatars | Toggle |
| Show/Hide Timestamps | Toggle |
| Auto-scroll | Toggle |
| Animation Speed | None, Slow, Normal |

All settings persist automatically to localStorage.

---

## Preset Themes

| Theme | Use Case |
|-------|----------|
| **Default** | Balanced for most streams |
| **Minimal** | Clean, no avatars or timestamps |
| **Compact** | High-volume chats, dense layout |
| **Large** | Readable from a distance |
| **Stream** | Optimized OBS overlay with semi-transparent background |

---

## Development

```bash
# Start dev server with hot reload
npm run dev

# TypeScript check
npm run type-check

# Lint
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

### Test Suite

```
npm test
```

Runs 125+ tests across all components, hooks, and services using Vitest + React Testing Library.

### Project Structure

```
src/
├── components/
│   ├── ChatDisplay/       # Chat message display (ChatDisplay, ChatMessage, MessageList)
│   ├── PollingPanel/      # Connection controls (API key, video ID, connect/disconnect)
│   ├── SettingsPanel/     # Visual customization controls (presets, sliders, toggles)
│   ├── SettingsPanel/     # OBS mode toggle
│   └── shared/            # Reusable UI (Button, Card)
├── hooks/
│   ├── useYouTubeChat.ts  # Main chat hook with polling lifecycle
│   ├── useApiKey.ts       # API key persistence hook
│   └── useChatSettings.ts # Visual settings hook (inside useYouTubeChat.ts)
├── services/
│   ├── YouTubeService.ts  # YouTube Data API v3 client
│   └── ChatPollingService.ts # Polling loop with exponential backoff
├── types/
│   └── youtube.ts         # TypeScript types for YouTube API
├── utils/
│   └── storage.ts         # localStorage wrappers
└── App.tsx                # Main app layout
```

---

## Architecture

```
User Input → PollingPanel → App.tsx → YouTubeService (API calls)
                                        ↓
                                  ChatPollingService (polling loop)
                                        ↓
                                  useYouTubeChat (state management)
                                        ↓
                                  ChatDisplay → MessageList → ChatMessage
```

- **YouTubeService** — Wraps the YouTube Data API v3 endpoints (videos, liveChat/messages)
- **ChatPollingService** — Polls for new messages with exponential backoff (1s → 60s), detects stream end
- **useYouTubeChat** — React hook bridging services to UI state
- **ChatDisplay** — Memoized message rendering with auto-scroll detection

---

## API Reference

The app uses the **YouTube Data API v3** endpoints:

| Endpoint | Usage |
|----------|-------|
| `/videos?part=liveStreamingDetails` | Get live chat ID and check stream status |
| `/liveChat/messages` | Fetch chat messages with pagination |
| `/videos?part=snippet` | Validate API key |

---

## OBS Integration Tips

- **Transparent Background**: Enable the toggle in the sidebar for browser source overlay
- **Scene Dimensions**: Resize the browser source to fit your layout (recommended: 350-400px wide)
- **Performance**: The app avoids CSS animations and heavy DOM operations — suitable for 2+ hour streams
- **Refresh**: Use OBS browser source's refresh button if connection drops
- **Multiple Instances**: Run separate browser sources for different layouts (e.g., chat only in one, stats in another)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Invalid API key"** | Verify your key starts with `AIzaSy`. Check Google Cloud Console quota. |
| **"Stream is not live"** | The video must be currently live streaming with chat enabled. |
| **No messages appearing** | Try disconnecting and reconnecting. Check API key has YouTube Data API enabled. |
| **Blank screen in OBS** | Enable **Transparent Background** if using as overlay. Set appropriate dimensions. |
| **API quota exceeded** | YouTube Data API has daily quota limits. Check your Google Cloud Console dashboard. |

---

## License

[MIT](LICENSE)

## Project Status

All core features implemented. Open to contributions — see [open issues](https://github.com/kg20dev/livicat/issues) for enhancement ideas.
