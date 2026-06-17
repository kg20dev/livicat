# Livicat - Project Plan & Architecture

## MVP Scope (1-2 Weeks)

**Goal:** Quick MVP to display YouTube Live Chat with visual customization for OBS browser source

### Core Features
- ✅ Display incoming live chat messages in real-time
- ✅ Visual customization (colors, fonts, sizes, layouts)
- ✅ Dark theme optimized for OBS
- ✅ Responsive design for different OBS scene sizes

### Excluded from MVP
- ❌ User authentication (run without login)
- ❌ Moderation features (delete, timeout, ban)
- ❌ Message replay/history
- ❌ User management/permissions

## Technical Architecture

### YouTube Data Access (No OAuth)
Since we're building a local desktop app that doesn't require login:

**Option A: YouTube Live Stream ID**
- User provides video/stream ID
- App uses YouTube Data API v3 to fetch live chat
- Requires API key (user provides in settings)

**Option B: YouTube Chat URL Scrape** (Fallback)
- Parse chat from YouTube live page HTML
- No API key needed but less reliable

**Recommended:** Start with Option A (API key) for reliability

### Tech Stack
```
Frontend: React + TypeScript
Build: Vite (fast dev, optimized builds)
Desktop: Electron (or consider local web server first)
Styling: Tailwind CSS (rapid customization development)
State: React hooks (Zustand if needed later)
API: YouTube Data API v3 (live chat endpoint)
```

### Architecture Layers

```
┌─────────────────────────────────────────┐
│         OBS Browser Source              │
│    (loads localhost:3000 or file://)    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         React App Layer                  │
│  ┌────────────────────────────────────┐ │
│  │  ChatDisplay Component             │ │
│  │  - Message list                    │ │
│  │  - Virtual scrolling               │ │
│  │  - Auto-scroll toggle              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Settings Panel                    │ │
│  │  - API key input                   │ │
│  │  - Visual customization            │ │
│  │  - Stream ID input                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      YouTube API Service Layer           │
│  - Poll live chat endpoint               │
│  - Rate limiting / pagination             │
│  - Error handling                        │
│  - Message formatting                     │
└─────────────────────────────────────────┘
```

## Data Flow

```
1. User enters Stream ID + API Key
2. App starts polling YouTube Live Chat API
3. Messages fetched → formatted → stored in state
4. React renders messages with custom styling
5. OBS displays as browser source (auto-refresh)
```

## Component Structure

```
src/
├── App.tsx                    # Main app router
├── components/
│   ├── ChatDisplay/
│   │   ├── ChatDisplay.tsx    # Main chat container
│   │   ├── MessageList.tsx    # Virtualized message list
│   │   ├── ChatMessage.tsx    # Individual message
│   │   └── AutoScroll.tsx     # Scroll control
│   ├── SettingsPanel/
│   │   ├── SettingsPanel.tsx  # Settings UI
│   │   ├── ApiKeyInput.tsx    # API key field
│   │   ├── StreamIdInput.tsx  # Stream ID field
│   │   └── StyleEditor.tsx    # Visual customization
│   └── shared/
│       ├── ThemeToggle.tsx    # Dark/light mode
│       └── StatusIndicator.tsx # Connection status
├── services/
│   ├── youtubeApi.ts         # YouTube API client
│   └── chatPoller.ts          # Polling logic
├── hooks/
│   ├── useChatMessages.ts     # Chat state hook
│   └── useYouTubeChat.ts      # API polling hook
├── types/
│   └── youtube.ts             # TypeScript types
└── utils/
    ├── messageFormatter.ts   # Message formatting
    └── obsHelper.ts           # OBS optimization helpers
```

## API Integration Details

### YouTube Data API v3 - Live Chat

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/liveChat/messages`

**Required:**
- `part=snippet,authorDetails`
- `liveChatId={LIVE_CHAT_ID}` (from video data)
- `key={API_KEY}`

**Polling:**
- `pollingIntervalMillis` returned in response
- Typically 5-10 seconds
- Use `nextPageToken` for pagination

**Message Data Structure:**
```typescript
{
  id: string;
  snippet: {
    displayMessage: string;
    publishedAt: string;
  };
  authorDetails: {
    displayName: string;
    profileImageUrl: string;
  };
}
```

## Customization Features (MVP)

### Visual Options
- Background color/opacity
- Font family, size, color
- Avatar size (show/hide)
- Timestamp format (show/hide)
- Message spacing
- Username color badges
- Animation speed (fade-in)
- Max messages displayed

### Presets
- Default (light/dark)
- Minimal (no avatars, simple)
- Compact (small fonts, dense)
- Large (readable from distance)

## Development Roadmap

### Week 1: Foundation
**Day 1-2:** Project setup
- [x] Set up gitflow workflow
- [ ] Initialize React + TypeScript project
- [ ] Set up ESLint, Prettier, Tailwind
- [ ] Create basic component structure

**Day 3-4:** YouTube API integration
- [ ] YouTube API service implementation
- [ ] Chat polling logic
- [ ] Basic message display
- [ ] Error handling

**Day 5-7:** Core UI
- [ ] Chat display component
- [ ] Message formatting
- [ ] Auto-scroll behavior
- [ ] Connection status indicator

### Week 2: Customization & OBS
**Day 8-10:** Settings & customization
- [ ] Settings panel UI
- [ ] API key storage
- [ ] Visual customization controls
- [ ] Style persistence (localStorage)

**Day 11-12:** OBS optimization
- [ ] Dark theme
- [ ] Transparent background option
- [ ] Performance testing
- [ ] Different scene size testing

**Day 13-14:** Polish & testing
- [ ] Edge cases (no internet, API errors)
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

## Issues to Create

### Setup & Infrastructure
1. [ ] Initialize React + TypeScript + Vite project
2. [ ] Set up ESLint and Prettier configuration
3. [ ] Configure Tailwind CSS
4. [ ] Create basic component structure

### YouTube Integration
5. [ ] Implement YouTube API service client
6. [ ] Create chat polling mechanism
7. [ ] Build message formatter
8. [ ] Add error handling for API failures

### Core UI Components
9. [ ] Build ChatDisplay container component
10. [ ] Create MessageList with virtual scrolling
11. [ ] Implement ChatMessage component
12. [ ] Add auto-scroll behavior
13. [ ] Build connection status indicator

### Settings & Customization
14. [ ] Create SettingsPanel component
15. [ ] Build API key input with storage
16. [ ] Implement Stream ID input
17. [ ] Add visual customization controls
18. [ ] Implement style persistence

### OBS Optimization
19. [ ] Create OBS-optimized dark theme
20. [ ] Add transparent background option
21. [ ] Test different OBS scene sizes
22. [ ] Performance optimization for long-running sessions

### Testing & Polish
23. [ ] Add error boundaries
24. [ ] Implement loading states
25. [ ] Test with real YouTube streams
26. [ ] Create user documentation

## Success Criteria (MVP)

- [ ] Can display live chat messages from YouTube stream
- [ ] Runs locally without user authentication
- [ ] Visual customization works (colors, fonts, sizes)
- [ ] Can be loaded as OBS browser source
- [ ] Performance acceptable for 2+ hour streams
- [ ] Basic error handling (network, API errors)

## Post-MVP Considerations

**Phase 2 (if MVP successful):**
- OAuth login for authenticated features
- Chat moderation tools
- Message history/replay
- Multiple stream support
- Cloud settings sync
- Plugin system

## Questions for You

1. **API Key approach:** Should users bring their own YouTube API key, or do you want to provide one?
2. **Electron vs pure web:** Do you need Electron for desktop features, or is a local web server sufficient?
3. **Multiple streams:** Should MVP support multiple chats simultaneously, or focus on single stream?
4. **Storage:** Should settings be stored in localStorage or require a config file?
