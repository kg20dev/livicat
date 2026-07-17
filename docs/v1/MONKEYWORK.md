# Monkeywork Engine — Implementation Guide

> **Status:** Prototyping (isolated from existing features)
> **Spec:** [SPEC.md](./SPEC.md)
> **Tests:** 102 Rust + 312 frontend = 414 total

---

## Overview

The Monkeywork engine translates `.livicat` theme packages into HTML+CSS. It runs as a Rust library inside Tauri, exposed to the frontend via IPC commands.

```
project.livi → parse → validate → layout → render_tree → CSS renderer → HTML+CSS
```

**Current phase:** Prototyping the engine in isolation. No integration with the existing theme system.

---

## Architecture

### Rust Modules (`src-tauri/src/monkeywork/`)

```
monkeywork/
├── mod.rs              Module root
├── scene_graph.rs      Scene Graph types (SceneGraph, ComponentNode, PropValue)
├── components.rs       ComponentRegistry with 12 component types + defaults
├── tokens.rs           ThemeContext — typed token resolution (colors, spacing, fonts)
├── validation.rs       Structural + component validation (slots-aware)
├── layout.rs           Block layout engine → RenderNode tree
├── render_tree.rs      Render Tree IR (RenderNode, TextRun, RenderBackground)
├── renderer/
│   └── css.rs          CSS renderer — RenderNode → HTML + CSS strings
├── integration_test.rs Full pipeline + Phantom POC tests
```

### Pipeline Flow

```
                    project.livi (JSON)
                          │
                          ▼
               ┌─── scene_graph.rs ───┐
               │  Parse JSON into     │
               │  SceneGraph struct   │
               └──────────┬──────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    tokens.rs      components.rs    validation.rs
    ThemeContext    ComponentRegistry  Structural +
    from variables  with defaults     component checks
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                    layout.rs
                    Block layout:
                    x, y, width, height
                    padding, background
                    text extraction
                          │
                          ▼
                  render_tree.rs
                  RenderNode tree
                  (positioned, styled)
                          │
                          ▼
                  renderer/css.rs
                  ├── render_node_css()  → CSS rules
                  ├── render_node_html() → nested <div>s
                  ├── wrap_html()        → full HTML doc
                  └── collect_fonts()    → dynamic font loading
                          │
                          ▼
                    (html, css)
```

---

## `.livicat` Package Format

```
phantom.livicat/
├── manifest.json          Package metadata
├── project.livi           Scene Graph (source of truth)
└── assets/
    └── skins/             SVG skin assets
        ├── phantom-flag.svg
        ├── phantom-message.svg
        └── phantom-tail.svg
```

### `project.livi` Structure

```json
{
  "version": 1,
  "theme": {
    "id": "phantom",
    "name": "Phantom",
    "author": "Livicat"
  },
  "variables": {
    "p5-red": "#e3242b",
    "p5-black": "#0d0d0d",
    "avatar-size": 28,
    "spacing-sm": 8
  },
  "chat": {
    "direction": "bottom-up",
    "spacing": 8,
    "maxMessages": 10
  },
  "scene": {
    "type": "ChatRoot",
    "props": {
      "background": { "type": "solid", "color": "#0d0d0d" }
    },
    "children": [
      {
        "type": "MessageList",
        "children": [
          {
            "type": "Message",
            "children": [
              { "type": "Avatar", "props": { "size": 28 } },
              {
                "type": "AuthorBubble",
                "props": { "skin": "assets/skins/phantom-flag.svg", "padding": [12, 14, 12, 10] },
                "children": [
                  { "type": "Author", "props": { "font": "Bebas Neue", "color": "usernameColor", "weight": 400, "spacing": 1.5 } }
                ]
              },
              {
                "type": "MessageBubble",
                "props": { "skin": "assets/skins/phantom-message.svg", "padding": [14, 20, 14, 20] },
                "children": [
                  { "type": "Content", "props": { "font": "Oswald", "color": "phantom-ink", "lineHeight": 1.35 } }
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

### Variable Types

| Value | Type | Example |
|-------|------|---------|
| `"#e3242b"` | `VariableValue::Color` | Color token |
| `28` | `VariableValue::Number` | Spacing/size token |
| `"Bebas Neue"` | `VariableValue::String` | Font token |

### Component Props

| Prop | Type | Used By | Description |
|------|------|---------|-------------|
| `size` | Number | Avatar | Diameter in px |
| `skin` | String | AuthorBubble, MessageBubble | Path to SVG skin |
| `asset` | String | Decoration | Path to decoration asset |
| `padding` | Array[4] | Bubbles | [top, right, bottom, left] |
| `font` | String | Author, Content | Font family name |
| `color` | String | Author, Content | Color token name |
| `weight` | Number | Author, Content | Font weight |
| `lineHeight` | Number | Content | Line height multiplier |
| `spacing` | Number | Author | Letter spacing in px |
| `fontSize` | Number | Author, Content | Font size in px |

---

## CSS Output Format

### Class Naming

Components map to `lc-{kebab-case}` classes:

| Component | CSS Class |
|-----------|-----------|
| ChatRoot | `.lc-chat-root` |
| MessageList | `.lc-message-list` |
| Message | `.lc-message` |
| Avatar | `.lc-avatar` |
| Decoration | `.lc-decoration` |
| AuthorBubble | `.lc-author-bubble` |
| Author | `.lc-author` |
| MessageBubble | `.lc-message-bubble` |
| Content | `.lc-content` |
| Timestamp | `.lc-timestamp` |

### CSS Properties by Component

All nodes get:
```css
position: absolute;
left: {x}px;
top: {y}px;
width: {width}px;
height: {height}px;
```

**Bubbles** (AuthorBubble, MessageBubble) additionally get:
```css
padding: {top}px {right}px {bottom}px {left}px;
overflow: hidden;
background: url({skin});          /* SVG skin */
background-size: 100% 100%;
background-repeat: no-repeat;
```

**Text nodes** (Author, Content) get:
```css
font-family: '{font}', sans-serif;
font-size: {size}px;
font-weight: {weight};
color: var({token}, {fallback});  /* CSS variable with fallback */
line-height: {lineHeight};
letter-spacing: {spacing}px;      /* Author only */
white-space: nowrap;              /* Author only */
word-break: break-word;           /* Content only */
overflow-wrap: anywhere;          /* Content only */
```

### Token Resolution

Color tokens that don't look like CSS colors are wrapped in CSS variables:
```
Input:  "usernameColor"
Output: var(--usernameColor, #0d0d0d)
```

The `default_for_token()` function provides fallbacks:
- Author → `#0d0d0d` (dark on light flag)
- Content → `#ffffff` (white on dark ribbon)

### Dynamic Font Loading

Fonts declared in component props are collected and loaded via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Tauri IPC Commands

Exposed via `src-tauri/src/lib.rs`:

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `validate_scene` | JSON string | `ValidationResult` | Parse + validate a Scene Graph |
| `render_scene` | JSON string | `RenderResult` | Full pipeline: parse → validate → layout → render |
| `render_css` | JSON string | `{ css: string }` | CSS-only output (no HTML) |
| `get_component_registry` | none | `RegistryResult` | List all registered components |

### TypeScript Wrapper

`src/lib/monkeywork/TemplateEngine.ts` wraps IPC calls:
```typescript
validateScene(json: string): Promise<ValidationResult>
renderScene(json: string): Promise<RenderResult>
getComponentRegistry(): Promise<RegistryResult>
```

---

## Component Registry

12 registered components with defaults:

| Component | Slots | Allowed Children | Defaults |
|-----------|-------|------------------|----------|
| ChatRoot | MessageList | MessageList | — |
| MessageList | Message | Message | — |
| Message | Avatar, AuthorBubble, MessageBubble, Decoration, Timestamp | All | — |
| Avatar | — | — | size: 32, shape: "circle" |
| AuthorBubble | Author | Author | padding: [6, 16, 6, 16] |
| MessageBubble | Content | Content | padding: [18, 24, 18, 24] |
| Author | — | — | — |
| Content | — | — | — |
| Decoration | — | — | — |
| Timestamp | — | — | — |
| SuperChat | — | — | — |
| Badge | — | — | — |

---

## MonkeyWorkspace Preview

`src/components/layout/MonkeyWorkspace.tsx` provides a split-panel UI:

- **Left:** Package selector + Scene JSON editor
- **Right:** Live preview (iframe) + Component registry

### Preview Pipeline

1. User clicks package → loads `project.livi`
2. `validateScene(json)` → checks structure
3. `renderScene(json)` → gets HTML+CSS from Rust engine
4. `buildPreviewHtml(html, variables, packagePath)`:
   - Converts SVG skin paths to inline data URIs (for `srcdoc` iframe)
   - Resolves CSS variable references
   - Injects mock data (usernames, messages, avatars)
5. Sets `srcdoc` on iframe → renders

### Mock Data

5 demo messages with DiceBear avatars:
```typescript
{ username: 'StreamKing', message: 'Hey everyone!', avatarSeed: 70 }
{ username: 'NeonNights', message: 'Love the stream!', avatarSeed: 58 }
{ username: 'GamerPro_99', message: 'How do I save this theme?', avatarSeed: 5 }
{ username: 'PixelPanda', message: 'Can we get more animations?', avatarSeed: 33 }
{ username: 'ShadowFox', message: 'Super Chat — Awesome content!', avatarSeed: 89 }
```

---

## Known Limitations

### 1. Vertical-Only Layout

All Message children stack vertically (block layout):
```
[Avatar]
[Decoration]
[AuthorBubble]
[MessageBubble]
[Timestamp]
```

The real Phantom uses horizontal layout:
```
[Avatar] [Tail] [Flag + Ribbon]
```

**Required:** Flex-row support in the layout engine.

### 2. No Animation Support

The `behavior.enterAnimation` field is parsed but not rendered. The real Phantom uses CSS `@keyframes` for slide-in animations.

### 3. No Role-Based Styling

The real Phantom has per-role overrides (owner, moderator, member, super-chat). The engine outputs `var(--usernameColor, fallback)` but doesn't generate role-specific CSS rules.

### 4. Static Preview Only

The engine produces a static HTML snapshot. Live chat data injection (replacing `{{placeholders}}` with real messages) is not implemented.

---

## Future Direction: Install Pipeline

**Not yet implemented.** The planned architecture:

```
Install time:
  .livicat → engine → ~/.livicat/themes/{id}/
                         ├── theme.css
                         ├── template.html
                         ├── config.json
                         └── assets/

Runtime:
  theme.css + template.html → renderer → live chat overlay
```

This separates the engine (build-time) from the renderer (runtime), enabling:
- One-time processing at install
- Pre-built CSS for instant preview
- Reusable output for live rendering
- Theme switching without re-parsing

---

## Running Tests

```bash
# Rust tests (102)
cd src-tauri && cargo test

# Frontend tests (312)
npx vitest run

# Dump Phantom engine output (for inspection)
cd src-tauri && cargo test dump_phantom_output -- --ignored --nocapture

# TypeScript check
npx tsc --noEmit
```

---

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `scene_graph.rs` | 526 | Scene Graph types + deserialization |
| `components.rs` | 368 | Component registry + defaults |
| `tokens.rs` | 185 | ThemeContext token resolution |
| `validation.rs` | 287 | Structural + component validation |
| `layout.rs` | 317 | Block layout engine |
| `render_tree.rs` | 130 | Render Tree IR types |
| `renderer/css.rs` | 306 | CSS renderer |
| `integration_test.rs` | 142 | Pipeline + Phantom POC tests |
| `TemplateEngine.ts` | — | TypeScript IPC wrapper |
| `MonkeyWorkspace.tsx` | 397 | Preview UI |
