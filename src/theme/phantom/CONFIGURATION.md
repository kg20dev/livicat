# Phantom Theme — Configuration Reference

## Visual Reference Mapping

### 🎭 Name Flag (Username Chip)
**Controls:** Flag Shape section

| Setting | Visual Effect | CSS Target |
|---------|--------------|------------|
| `flag-tilt` | Plate rotation (-30° → 0°) | `#author-name { transform: rotate(...) }` |
| `text-rotate` | Text rotation inside plate | `.flag-text { transform: rotate(...) }` |
| `flag-min-height` | Minimum plate height | `#author-name { min-height: ...px }` |

**Per-role colors:**
- `usernameColor` (core) → username text color
- `*FlagChipBg` (derived) → flag fill color
- `*FlagOutline` (derived) → flag outline color

**Layers:**
- `#author-name` — transparent container
- `#author-name::before` — outer outline (clip-path polygon)
- `.flag-text` — inner fill (background, contains username)

### 🎪 Message Ribbon
**Controls:** Message Box section

| Setting | Visual Effect | CSS Target |
|---------|--------------|------------|
| `msg-outline-gap` | Gap between white outline & black fill | `#message::before { inset: calc(var(...) * -1) }` |
| `msg-pad-top` | Padding above text | `.message-text { padding-top: ...px }` |
| `msg-pad-bottom` | Padding below text | `.message-text { padding-bottom: ...px }` |
| `msg-pad-left` | Padding left of text | `.message-text { padding-left: ...px }` |

**Layers:**
- `#message` — transparent container
- `#message::before` — outer white outline (clip-path polygon, extends outward by gap)
- `.message-text` — inner black fill (flex container, text styling)

**Core settings:**
- `avatarSize` — avatar dimensions
- `chat-max-width` — max message width
- `messageFontSize` — text size
- `chat-message-spacing` — gap between messages

### ⚡ Thunder Tail (Avatar Connector)
**Controls:** Thunder Tail section

| Setting | Visual Effect | CSS Target |
|---------|--------------|------------|
| `tail-offset-x` | Horizontal position from avatar | `#content::before { left: ... }` |
| `tail-offset-y` | Vertical position from center | `#content::before { top: ... }` |
| `tail-scale` | Size scaling | `#content::before { transform: scale(...) }` |

**Layers:**
- `#content::before` — white outer zigzag (z-index: 1)
- `#content::after` — black inner zigzag (z-index: 2)

### 🎬 Animation
**Controls:** Motion section

| Setting | Visual Effect | CSS Target |
|---------|--------------|------------|
| `slide-distance` | Distance messages slide in from left | `@keyframes theme-phantom-in` (translateX) |

**Core settings:**
- `animationSpeed` — animation duration multiplier

### 🎨 Texture (Grain)
**Controls:** Texture section

| Setting | Visual Effect | CSS Target |
|---------|--------------|------------|
| `grain-intensity` | Noise opacity (0-100%) | `yt-live-chat-text-message-renderer::after { opacity: ...% }` |

**Layer:**
- `::after` on message row — diagonal line pattern with `mix-blend-mode: overlay`

---

## Configuration Schema Documentation

### Settings Flow

```
User Input (Tauri commands)
    ↓
buildCSSVariables(settings, scheme)
    ↓
1. Extract setting values
2. Emit CSS variables (--var-name)
3. Apply strokeMap (derive *FlagChipBg from usernameColor)
4. Apply postDerivations (derive *FlagOutline from *FlagChipBg)
    ↓
CSS Variables Injected
    ↓
.theme-phantom CSS uses variables
```

### CSS Variable Generation

For each setting in `scheme.ts`:

```typescript
{
  key: 'flag-tilt',           // setting key
  cssVar: 'flag-tilt',         // CSS variable name (default: same as key)
  default: -22,                 // default value
  // Emits: --flag-tilt: -22deg
}
```

**Special derivations:**
- `strokeMap`: Derives `*FlagChipBg` from role `*username-color` (contrast inversion)
- `postDerivations`: Derives `*FlagOutline` from `*FlagChipBg` (black/white based on lightness)
- `animation-duration`: Derived from `animationSpeed` core setting

### CSS Variable → Style Mapping

#### Name Flag
```css
/* Container - transparent, holds layout */
#author-name {
  color: var(--usernameColor);
  transform: rotate(var(--flag-tilt));
  min-height: var(--flag-min-height);
}

/* Outer outline */
#author-name::before {
  background: var(--flagOutline); /* per-role or default */
  clip-path: polygon(...); /* fixed shape */
}

/* Inner fill */
#author-name .flag-text {
  background: var(--flagChipBg); /* per-role or default */
  transform: rotate(var(--text-rotate));
}
```

#### Message Ribbon
```css
/* Container - transparent */
#message {
  /* No background, no clip-path */
}

/* Outer outline - extends outward by gap */
#message::before {
  inset: calc(var(--msg-outline-gap) * -1);
  background: var(--p5-white);
  clip-path: polygon(...); /* fixed shape */
}

/* Inner fill - text container */
.message-text {
  background: var(--p5-black);
  color: var(--phantom-ink);
  padding: var(--msg-pad-top) 20px var(--msg-pad-bottom) var(--msg-pad-left);
}
```

#### Thunder Tail
```css
/* White outer shape */
#content::before {
  left: calc(var(--tail-offset-x) * var(--tail-scale));
  top: calc(50% + var(--tail-offset-y));
  transform: translateY(-50%) scale(var(--tail-scale));
  background: var(--p5-white);
  clip-path: polygon(...); /* fixed shape */
}

/* Black inner shape */
#content::after {
  /* Inherits positioning from ::before + 2px offset */
  background: var(--p5-black);
  clip-path: polygon(...); /* fixed shape */
}
```

### Per-Role Color System

**Core username colors** (from `usernameColor` or per-role `*-username-color`):
- `usernameColor` (default)
- `owner-username-color` → `var(--p5-red)`
- `mod-username-color` → `var(--p5-red)`
- `member-username-color` → default
- `superchat-username-color` → default
- `membership-username-color` → default

**Derived flag backgrounds** (via `strokeMap`):
- `usernameColor` → `flagChipBg`
- `owner-username-color` → `ownerFlagChipBg`
- `mod-username-color` → `modFlagChipBg`
- etc.

**Derived outlines** (via `postDerivations`):
- `flagChipBg` → `flagOutline`
- `ownerFlagChipBg` → `ownerFlagOutline`
- etc.

**Override selectors:**
```css
/* Owner example */
[data-role='owner'] #author-name {
  color: var(--owner-username-color);
}
[data-role='owner'] #author-name::before {
  background: var(--ownerFlagOutline);
}
[data-role='owner'] #author-name .flag-text {
  background: var(--ownerFlagChipBg);
}
```

### Clip-Path Shapes (Fixed)

All clip-path polygons are percentage-based and scale with element dimensions:

- **Name Flag:** `polygon(50% 80%, 100% 50%, 100% 50%, 91% 2%, 1% 60%, 10.6% 100%)`
- **Message Outline:** `polygon(8% 89.8%, 96.5% 95%, 99% 5%, 7.5% 10.4%)`
- **Thunder Tail Outer:** Complex 12-point polygon
- **Thunder Tail Inner:** Complex 10-point polygon

### Core Settings Used by Phantom

| Core Key | Phantom Usage | CSS Variable |
|-----------|---------------|--------------|
| `avatarSize` | Avatar dimensions | `--avatarSize` |
| `chat-max-width` | Message max width | `--chat-max-width` |
| `messageFontSize` | Text size | `--messageFontSize` |
| `chat-message-spacing` | Gap between messages | `--chat-message-spacing` |
| `animationSpeed` | Duration multiplier | `--animation-duration` |
| `chat-font-family` | Font family | `--chat-font-family` |
| `chat-message-font-weight` | Font weight | `--chat-message-font-weight` |
| `chat-username-font-weight` | Username font weight | `--chat-username-font-weight` |
| `chat-letter-spacing` | Letter spacing | `--chat-letter-spacing` |
| `chat-avatar-vertical-offset` | Avatar vertical offset | `--chat-avatar-vertical-offset` |

### Palette Variables

```css
:root {
  --p5-red: #e3242b;     /* Authority accent (owner/mod) */
  --p5-black: #0d0d0d;   /* Primary dark fill */
  --p5-white: #ffffff;   /* Primary outline/text */
}
```

Used in:
- `--p5-red` → Owner/mod username colors
- `--p5-black` → Message fill, default outline
- `--p5-white` → Message outline, default text

---

## Quick Reference: Setting → Visual

| Want to adjust... | Use this setting | Section |
|------------------|-----------------|---------|
| Make flag more tilted | `flag-tilt` | Flag Shape |
| Rotate text independently | `text-rotate` | Flag Shape |
| Increase flag height | `flag-min-height` | Flag Shape |
| Widen message outline gap | `msg-outline-gap` | Message Box |
| Increase text padding (top) | `msg-pad-top` | Message Box |
| Increase text padding (bottom) | `msg-pad-bottom` | Message Box |
| Increase text padding (left) | `msg-pad-left` | Message Box |
| Move tail left/right | `tail-offset-x` | Thunder Tail |
| Move tail up/down | `tail-offset-y` | Thunder Tail |
| Scale tail size | `tail-scale` | Thunder Tail |
| Make slide-in more dramatic | `slide-distance` | Motion |
| Add grain texture | `grain-intensity` | Texture |

---

## Architecture Notes

### Two-Layer System

All visual elements use a two-layer approach for the "outline + fill" P5 look:

1. **Inner Layer** - fill color with clip-path (or no clip-path)
2. **Outer Layer** - outline color with clip-path, extends outward via `inset: -Npx`

**Why two layers?**
- Allows configurable gap between outline and fill
- Clip-path on outline layer doesn't clip content
- Inner fill can use `display: flex` for content centering

### z-index Stack

```
#message::before (outline)          z-index: -1
.message-text (fill)                z-index: 1
#content::before (tail outer)      z-index: 1
#content::after (tail inner)       z-index: 2
grain overlay (::after)              z-index: 999
```

### CSS Scoping

- **ThemePreview**: Wrapped in `.theme-phantom` class, selectors use `.theme-phantom` prefix
- **Headless/OBS**: No wrapper, `.theme-phantom` prefix stripped by `buildYoutubeCss()`
- Both paths use identical CSS variables and styling

### Element Types

All elements use `<div>` for consistency (not `<span>`):

```html
<div id="author-photo"><img src="..." /></div>
<div id="author-name"><span class="flag-text">...</span></div>
<div id="message-container">
  <div id="message"><span class="message-text">...</span></div>
</div>
```

Reset.css ensures `display: block` overrides any browser defaults.
