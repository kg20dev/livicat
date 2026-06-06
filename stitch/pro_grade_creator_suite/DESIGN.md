---
name: Pro-Grade Creator Suite
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#cdc3d6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#968d9f'
  outline-variant: '#4b4453'
  surface-tint: '#d6baff'
  primary: '#d6baff'
  on-primary: '#430089'
  primary-container: '#ab73ff'
  on-primary-container: '#3a0078'
  inverse-primary: '#763bca'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#474747'
  on-secondary-container: '#b6b5b4'
  tertiary: '#c8c6c6'
  on-tertiary: '#303030'
  tertiary-container: '#919090'
  on-tertiary-container: '#292a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ecdcff'
  primary-fixed-dim: '#d6baff'
  on-primary-fixed: '#280056'
  on-primary-fixed-variant: '#5e1ab1'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  panel-padding: 12px
  stack-gap: 8px
---

## Brand & Style

This design system is engineered for high-performance creative workflows, drawing inspiration from industry-standard production tools like OBS and DaVinci Resolve. The brand personality is **technical, focused, and powerful**, prioritizing content immersion and low cognitive load during intense creative sessions.

The design style is a hybrid of **Modern Corporate** and **Subtle Glassmorphism**. It utilizes a deep "Obsidian" foundation—utilizing dark charcoal and slate grays to recede into the background, allowing the creator's content to take center stage. High-contrast accents in vibrant purple provide immediate visual cues for active states and primary actions, evoking the energy of the streaming and video production landscape. The interface feels like a precision instrument: heavy-duty, reliable, and sophisticated.

## Colors

The palette is anchored in a multi-layered dark gray spectrum to establish depth without sacrificing the "True Dark" aesthetic.

- **Primary (#A970FF):** A vibrant "Electric Purple" used sparingly for high-intent actions, progress indicators, and active selection states.
- **Surface Tiers:** 
  - Base (#121212) for the primary application background.
  - Surface-Low (#1E1E1E) for sidebar and panel backgrounds.
  - Surface-High (#2D2D2D) for hovered states or secondary UI elements.
- **Functional Colors:** Success (Green), Warning (Amber), and Error (Red) should be desaturated to maintain the professional aesthetic while remaining legible against the dark backdrop.

## Typography

This design system utilizes **Inter** for all UI elements to ensure maximum legibility and a systematic, "pro-tool" feel. 

- **Hierarchy:** Use bold weights and negative letter spacing for headlines to create a condensed, high-end editorial feel.
- **Labels:** Small labels use medium weights and slight tracking (letter-spacing) for clarity in dense settings panels.
- **Mono Integration:** For technical metadata, coordinates, or timecodes, JetBrains Mono is suggested as a secondary font to emphasize the "production tool" nature of the application.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a heavy emphasis on sidebar-and-panel architecture typical of desktop creative suites.

- **Grid:** A 12-column layout for main dashboard views, but panel-based layouts utilize a "Fixed-Fluid-Fixed" model where sidebars are fixed (240px-320px) and the central canvas or viewport is fluid.
- **Rhythm:** An 8px base grid is used for general layout, with 4px increments for micro-spacing within components (e.g., icon-to-text spacing).
- **Density:** The UI is designed for "Compact" density to maximize the tools available on screen without cluttering.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glassmorphism**, rather than traditional heavy shadows.

- **Layering:** Elements closer to the user (like modals or dropdowns) use a lighter gray hex (#2D2D2D) and a subtle 1px stroke (#FFFFFF15).
- **Glassmorphism:** Floating panels and sidebars use a backdrop blur (20px-30px) with a semi-transparent background (#1E1E1E80). This creates a sense of "layered glass" that feels modern and premium.
- **Strokes:** Use "inner-glow" style strokes (1px top-weighted borders) to define edges in the dark environment, simulating physical light hitting a chamfered edge.

## Shapes

The shape language is **Rounded**, striking a balance between the precision of a professional tool and the approachable nature of modern software.

- **Standard Elements:** Buttons, input fields, and small cards use a **0.5rem (8px)** radius.
- **Containers:** Large panels and main application window wrappers use **1rem (16px)** for a more "containerized" and modern appearance.
- **Interactive States:** Hovering over list items or menu options should show a rounded background highlight consistent with the component's radius.

## Components

- **Buttons:** Primary buttons use the #A970FF background with white text. Secondary buttons are "Ghost" style with a 1px border (#3F3F3F) and no background until hover.
- **Inputs:** Dark fields (#121212) with a subtle 1px border. Focus states use a 2px #A970FF glow.
- **Chips:** Small, pill-shaped tags used for status (e.g., "LIVE", "RECORDING"). High-saturation backgrounds for active states.
- **Cards/Panels:** Utilize the glassmorphic style for "floating" utility panels. Headers within cards should be clearly demarcated with a 1px bottom border.
- **Scrollbars:** Custom, slim scrollbars that only appear on hover, utilizing #3F3F3F to remain unobtrusive.
- **Timeline/Gauges:** Use Primary Purple for progress and level indicators (VU meters, upload bars), ensuring they pop against the dark background.