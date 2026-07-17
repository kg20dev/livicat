# Monkeywork Theme Engine v1 — Specification

## Vision

Livicat should **not** be a CSS editor.

Instead, Livicat should become a **Chat Theme Platform**, where themes are created visually, stored as structured data, and rendered automatically by the Livicat engine.

CSS is **an implementation detail**, not the source of truth.

The canonical format is the **`.livicat` package**.

---

## Core Philosophy

A theme should describe **what** the chat looks like, **not how** it is implemented.

Instead of storing CSS like:

```css
.message {
    border-radius: 16px;
    background: red;
}
```

A Livicat theme stores semantic information:

```
Message Bubble
- Corner Radius: 16
- Background: Primary
- Shadow: Soft
```

The rendering engine decides how to translate those properties into CSS.

This separation allows Livicat to evolve its rendering engine without breaking existing themes.

---

## Theme Architecture

```
Theme (.livicat)
        │
        ▼
   Scene Graph
        │
        ▼
  Design Tokens
        │
        ▼
 Theme Renderer
        │
        ▼
 Generated CSS
        │
        ▼
YouTube Chat Overlay
```

The **Scene Graph** is the source of truth.

Generated CSS is only a runtime artifact.

---

## Engine Architecture

```
                 Theme (.livicat)
                        │
                        ▼
                 project.livi
                        │
                        ▼
                  Scene Graph
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ThemeContext    Component Registry   Assets
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                  Validation Pass
                        │
                        ▼
                  Layout Engine
                        │
                        ▼
                 Render Tree (IR)
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        CSS Renderer         Canvas Renderer
             │                     │
             ▼                     ▼
        HTML + CSS          Canvas Draw Calls
```

---

## The `.livicat` Package

```
persona5.livicat
│
├── manifest.json          # Package metadata
├── project.livi           # Scene Graph (source of truth)
├── preview.png            # Preview image
├── thumbnail.webp         # Thumbnail for marketplace
│
├── assets/
│   ├── skins/             # Bubble skins (SVG, 9-slice PNG)
│   ├── decorations/       # Overlay graphics
│   └── fonts/             # Custom fonts
│
├── animations/            # Semantic animation definitions
│   ├── comic-pop.json
│   └── disappear.json
│
└── localization/          # Locale strings
    └── en.json
```

### manifest.json

```json
{
  "id": "persona5-red",
  "name": "Persona 5",
  "version": "1.0.0",
  "author": "Migoreng",
  "engine": "2.0",
  "minimumLivicat": "1.5.0",
  "license": "Commercial",
  "tags": ["anime", "persona", "red"]
}
```

---

## Scene Graph Format (`project.livi`)

The Scene Graph is a tree of nodes. Each node is a component with properties.

### Structure

```json
{
  "version": 1,
  "theme": {
    "id": "persona5",
    "name": "Persona 5",
    "author": "Migoreng"
  },
  "variables": {
    "primary": "#D50032",
    "secondary": "#111111",
    "text": "#FFFFFF",
    "accent": "#FFD400"
  },
  "chat": {
    "direction": "bottom-up",
    "spacing": 12,
    "maxMessages": 8
  },
  "scene": {
    "type": "ChatRoot",
    "children": [
      {
        "type": "MessageList",
        "children": [
          {
            "type": "Message",
            "children": [
              {
                "type": "Avatar",
                "props": {
                  "size": 48,
                  "shape": "circle"
                }
              },
              {
                "type": "AuthorBubble",
                "props": {
                  "skin": "skins/persona-author.svg",
                  "padding": [6, 16, 6, 16]
                },
                "children": [
                  { "type": "Author" }
                ]
              },
              {
                "type": "MessageBubble",
                "props": {
                  "skin": "skins/persona-message.svg",
                  "padding": [18, 24, 18, 24],
                  "animation": "comic-pop"
                },
                "children": [
                  { "type": "Content" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Key Principles

- **No CSS, no HTML, no flexbox, no DOM** — only chat concepts
- **Tree structure** — mirrors how the UI is actually built
- **Domain-specific components** — `MessageBubble`, not `<div>`
- **Three-layer separation** — Structure / Style / Behavior

---

## Three-Layer Separation

Every node can have three sections:

```json
{
  "type": "Bubble",
  "structure": {
    "children": ["Content"]
  },
  "style": {
    "skin": "skins/persona-message.svg",
    "padding": [18, 24, 18, 24]
  },
  "behavior": {
    "enterAnimation": "comic-pop"
  }
}
```

| Layer | Purpose |
|-------|---------|
| **Structure** | What components exist and how they're arranged |
| **Style** | How they look (skins, colors, spacing) |
| **Behavior** | How they move and react (animations) |

---

## Component Model

### Component Types

| Type | Purpose |
|------|---------|
| `ChatRoot` | Root container for the entire chat |
| `MessageList` | Container for messages |
| `Message` | Single message wrapper |
| `Avatar` | User avatar |
| `AuthorBubble` | Username container |
| `MessageBubble` | Message content container |
| `Author` | Username text |
| `Content` | Message text |
| `Decoration` | Overlay graphics |
| `SuperChat` | Super Chat variant |
| `Timestamp` | Time display |
| `Badge` | Role badges |

### Component Properties

#### Avatar

```
Size        — diameter in px
Shape       — "circle" | "rounded" | "square"
Border      — stroke width
Shadow      — drop shadow
Offset      — position offset from default
Visibility  — show/hide
```

#### Bubble (AuthorBubble / MessageBubble)

```
Skin        — reference to skin asset
Padding     — [top, right, bottom, left]
Animation   — enter/exit animation ID
```

#### Author

```
Font        — reference to font asset
Weight      — font weight
Color       — text color (token reference)
Outline     — text outline
Spacing     — letter spacing
```

#### Content

```
Font        — reference to font asset
Color       — text color (token reference)
LineHeight  — line height multiplier
Wrapping    — "wrap" | "ellipsis" | "none"
Spacing     — letter spacing
```

#### Timestamp

```
Format      — time format string
Opacity     — transparency
Position    — placement relative to message
```

#### Decoration

```
Asset       — reference to decoration file
Anchor      — "top-left" | "top-right" | "bottom-left" | "bottom-right"
OffsetX     — horizontal offset
OffsetY     — vertical offset
Opacity     — transparency
BlendMode   — blend mode
```

---

## Skin System

Bubble is NOT a CSS primitive. It's a **container with skin layers**.

### Rendering Modes

| Mode | Description |
|------|-------------|
| `solid` | Flat color fill |
| `gradient` | Linear/radial gradient |
| `svg` | Vector background with content insets |
| `nine-slice` | Scalable background with slice regions |
| `mask` | Clipping mask |
| `custom` | User asset |

### Skin Examples

#### Solid

```json
{
  "type": "Bubble",
  "style": {
    "background": {
      "type": "solid",
      "color": "primary"
    },
    "radius": 20,
    "padding": 16
  }
}
```

#### SVG (Persona 5)

```json
{
  "type": "Bubble",
  "style": {
    "skin": "skins/persona-message.svg",
    "padding": [18, 24, 18, 24]
  }
}
```

Content insets define the safe area for text placement. The renderer places text inside the safe area.

#### 9-Slice (Pixel Theme)

```json
{
  "type": "Bubble",
  "style": {
    "background": {
      "type": "nine-slice",
      "asset": "skins/pixel-window.png",
      "slice": {
        "top": 8,
        "right": 8,
        "bottom": 8,
        "left": 8
      }
    }
  }
}
```

Center stretches. Corners stay beautiful.

### Content Insets

```json
{
  "contentInsets": {
    "top": 18,
    "right": 24,
    "bottom": 18,
    "left": 24
  }
}
```

Defines where text can be placed inside a skin. The renderer ensures text stays within the safe area.

### Why Not CSS Properties?

If Bubble only has `radius`, `color`, `border`, `shadow`, then:

- Persona 5 is impossible
- Comic books are impossible
- Speech bubbles are impossible
- Pokemon themes are impossible

Instead, Bubble is a **composition**:

```
Bubble
├── Skin
│   ├── SVG / 9-slice / Mask / Solid
│   ├── Content Insets
│   └── Stretch Rules
├── Content
│   └── Message
└── Decorations
    ├── Corner Slash
    ├── Glow
    └── Stickers
```

Components expose **capabilities**, not CSS properties.

---

## Token System

### ThemeContext

Tokens are resolved via a ThemeContext:

```
Theme
  ↓
ThemeContext
  ↓
Renderer
```

ThemeContext contains:

```json
{
  "colors": {
    "primary": "#D50032",
    "secondary": "#111111",
    "accent": "#FFD400"
  },
  "spacing": {
    "sm": 8,
    "md": 16,
    "lg": 24
  },
  "fonts": {
    "heading": "Persona",
    "body": "Inter"
  }
}
```

### Resolution

When a component references a token:

```json
{
  "background": "primary"
}
```

The ThemeContext resolves it:

```json
{
  "background": "#D50032"
}
```

The component doesn't know hexadecimal values.

---

## Animation System

### Semantic Animations

Animations are semantic, not CSS keyframes.

```json
{
  "id": "comic-pop",
  "type": "enter",
  "timeline": [
    {
      "property": "scale",
      "from": 0.8,
      "to": 1.1,
      "duration": 120,
      "ease": "outBack"
    },
    {
      "property": "scale",
      "to": 1.0,
      "duration": 80
    }
  ]
}
```

### Animation Categories

| Category | Purpose |
|----------|---------|
| `enter` | When component appears |
| `exit` | When component disappears |
| `idle` | Looping animation while visible |
| `highlight` | On interaction or emphasis |
| `reaction` | Response to events |

### Renderer Translation

Today → CSS `transform: scale(...)`

Tomorrow → Canvas animation

The theme doesn't know.

---

## Validation Rules

### Stage 1: Structural

Is the Scene Graph valid?

Valid:
```
ChatRoot → MessageList → Message → Content
```

Invalid:
```
Content → Avatar
```

Avatar can't be inside Content.

### Stage 2: Component

Every component validates itself.

- Bubble requires Skin
- Avatar requires Size
- etc.

### Stage 3: Renderer

Some features aren't supported by all renderers.

```
Mask → Canvas Renderer: OK
Mask → Legacy CSS Renderer: Warning
```

Warning, not error.

---

## Rendering Pipeline

### Scene Graph → Render Tree

The Scene Graph is for **editing**.

The Render Tree is for **drawing**.

```
Scene Graph (editing)
        │
        ▼
   Layout Engine
        │
        ▼
  Render Tree (IR)
        │
        ▼
   CSS Renderer / Canvas Renderer
```

### Render Tree Node

```
RenderNode
├── x: 120
├── y: 340
├── width: 420
├── height: 96
├── background: SVG(persona-message.svg)
├── padding: [18, 24, 18, 24]
└── children:
    └── TextRun("Hello world")
```

The Layout Engine computes sizes, positions, inherited styles, resolved tokens, and constraints.

Both CSS and Canvas renderers consume the same Render Tree.

---

## Component Registry

Components are extensible via a registry.

```json
{
  "name": "Bubble",
  "slots": ["Content"],
  "properties": ["radius", "padding", "background"],
  "defaults": {
    "padding": 16
  },
  "validator": "bubble-validator",
  "renderer": "bubble-renderer"
}
```

### Component Defaults

Every component ships with defaults:

```json
{
  "component": "Bubble",
  "defaults": {
    "padding": 16,
    "background": "primary",
    "shadow": false,
    "radius": 12
  }
}
```

When a theme omits a property:

```json
{ "radius": 20 }
```

The engine merges with defaults:

```json
{
  "padding": 16,
  "background": "primary",
  "shadow": false,
  "radius": 20
}
```

---

## Capability System

Not every renderer supports every feature.

| Feature | CSS Renderer | Canvas Renderer |
|---------|--------------|-----------------|
| Border | ✅ | ✅ |
| Shadow | ✅ | ✅ |
| SVG | ✅ | ✅ |
| Mesh Gradient | ❌ | ✅ |
| Particle Layer | ❌ | ✅ |

A theme can declare requirements:

```json
{
  "requires": ["svg", "mask", "nine-slice"]
}
```

The renderer checks compatibility before rendering.

---

## Rendering Modes

### CSS Renderer (v1)

Generates HTML + CSS.

```
Scene Graph → Render Tree → HTML/CSS
```

Output:
```html
<div class="lc-bubble">
  <div class="lc-content">
    Hello world
  </div>
</div>
```

The theme never sees HTML.

### Canvas Renderer (future)

Generates Canvas draw calls.

```
Scene Graph → Render Tree → Canvas API
```

### Native Renderer (future)

Generates native UI.

```
Scene Graph → Render Tree → Native Widgets
```

---

## Theme Management

### Installation Model

Themes are **registered** upon installation, not loaded/unloaded from outside Livicat.

**Old model (wrong):**
```
Install → Download → Load when needed → Unload when done
```

**New model (correct):**
```
Install → Download → Extract → Register in Livicat → Always available
```

### Installed Themes Directory

```
~/.livicat/themes/
├── persona5.livicat/          (active)
├── cute-bubble.livicat/       (inactive)
├── pixel-art.livicat/         (inactive)
└── index.json                 (registry)
```

### Theme Registry (`index.json`)

```json
{
  "installed": [
    {
      "id": "persona5",
      "name": "Persona 5",
      "version": "1.0.0",
      "path": "persona5.livicat",
      "active": true,
      "installedAt": "2026-07-13T12:00:00Z"
    },
    {
      "id": "cute-bubble",
      "name": "Cute Bubble",
      "version": "2.1.0",
      "path": "cute-bubble.livicat",
      "active": false,
      "installedAt": "2026-07-10T08:30:00Z"
    }
  ]
}
```

### Theme Lifecycle

| Step | Action | Result |
|------|--------|--------|
| Install | Download + Extract + Register | Theme always available |
| Switch | Select theme from list | Theme becomes active |
| Update | Check marketplace for new version | Update in place |
| Uninstall | Remove files + deregister | Theme removed |

No load/unload. Just install, switch, update, uninstall.

### Theme Switching

```
Livicat knows all installed themes
       ↓
User selects theme from list
       ↓
Theme becomes "active"
       ↓
No load/unload — just switch
```

---

## Theme Creation Workflows

### Streamer

```
Marketplace → Install Theme → Customize Colors → Stream
```

No coding required.

### Designer

```
Open Livicat → Visual Theme Builder → Drag Components → Save → Publish
```

No CSS required.

### Existing CSS Creators

```
Import Existing CSS → Migration Wizard → Convert to Scene Graph → Review Compatibility → Save as .livicat
```

After import, the theme becomes a native Livicat project.

---

## Marketplace

The marketplace distributes `.livicat` packages only.

```
Theme → Validate → Publish → Install → Update
```

Benefits:
- Versioning
- Dependency management
- Previews & thumbnails
- Automatic updates
- Compatibility checking

---

## Long-Term Goal

Livicat should become the **Figma for Live Chat Themes**, not another CSS editor.

- Creators design visually
- The engine stores a structured Scene Graph
- The renderer generates CSS automatically
- Streamers install themes with one click
- CSS remains an internal implementation detail
- The `.livicat` package becomes the stable, portable format that powers the entire Livicat ecosystem — editing, sharing, marketplace distribution, versioning, cloud sync, and future rendering engines.
