---
name: Vibrant Wellness
colors:
  surface: '#f9fbeb'
  surface-dim: '#d9dbcc'
  surface-bright: '#f9fbeb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f5e5'
  surface-container: '#edefe0'
  surface-container-high: '#e8e9da'
  surface-container-highest: '#e2e4d5'
  on-surface: '#1a1d14'
  on-surface-variant: '#424938'
  inverse-surface: '#2f3227'
  inverse-on-surface: '#f0f2e3'
  outline: '#737a66'
  outline-variant: '#c2c9b3'
  surface-tint: '#426900'
  primary: '#426900'
  on-primary: '#ffffff'
  primary-container: '#8dc63f'
  on-primary-container: '#304f00'
  inverse-primary: '#9dd84f'
  secondary: '#006397'
  on-secondary: '#ffffff'
  secondary-container: '#79c2fe'
  on-secondary-container: '#004f7a'
  tertiary: '#835400'
  on-tertiary: '#ffffff'
  tertiary-container: '#f5a521'
  on-tertiary-container: '#643f00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b8f568'
  primary-fixed-dim: '#9dd84f'
  on-primary-fixed: '#112000'
  on-primary-fixed-variant: '#304f00'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#ffb957'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#f9fbeb'
  on-background: '#1a1d14'
  surface-variant: '#e2e4d5'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max-width: 1200px
---

## Brand & Style
The design system is built for a healthcare environment that prioritizes energy, accessibility, and optimism. The brand personality is warm and supportive, yet infused with a modern vitality that encourages proactive health management.

The design style is **Modern Corporate with a Tactile Twist**. It leverages a clean, systematic foundation while using soft shadows and vibrant accents to prevent the UI from feeling sterile. It aims to evoke a sense of professional reliability combined with the approachability of a lifestyle app.

## Colors
The color palette centers around a vibrant **Lime Green**, symbolizing growth and vitality. To maintain WCAG AA accessibility, `primary-600` (#6B9B2B) is utilized for interactive text and icons against light backgrounds, ensuring a contrast ratio of at least 4.5:1. 

The `primary-container` provides a soft, warm background for grouped content, while the `secondary` blue offers a calming counterpoint for informational elements. The neutral tones are slightly warmed with olive undertones to maintain the "MediBuddy" brand's supportive feel, avoiding the coldness of pure grays.

## Typography
This design system uses a pairing of **Manrope** for headlines and **Work Sans** for body and UI labels. Manrope provides a modern, balanced look that feels both professional and contemporary. Work Sans was chosen for its exceptional legibility in healthcare contexts, where clarity of information is paramount.

Headlines utilize tighter letter spacing and heavier weights to create a strong visual anchor. Body text maintains a generous line height (1.5x) to ensure comfortable reading of medical information or instructions.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a maximum container width to ensure readability on large monitors. We utilize an 8pt spatial system to maintain mathematical harmony across all components.

- **Desktop:** 12-column grid, 24px gutters, 64px side margins.
- **Tablet:** 8-column grid, 20px gutters, 32px side margins.
- **Mobile:** 4-column grid, 16px gutters, 16px side margins.

Content should lean towards vertical stacking on mobile devices, with interactive elements maintaining a minimum hit target of 44x44px.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Ambient Shadows**. Instead of harsh black shadows, this design system uses soft, diffused shadows tinted with the primary or neutral-dark color to keep the interface feeling "organic" and light.

- **Level 0 (Surface):** Default background.
- **Level 1 (Cards):** 1px subtle outline in `primary-100` or a very soft shadow (4px blur, 2% opacity).
- **Level 2 (Dropdowns/Modals):** More pronounced shadow (12px blur, 8% opacity) to signify interaction priority.
- **Level 3 (Overlays):** Heavy blur (24px) with a backdrop-filter (blur 4px) to create a focused, glass-like context.

## Shapes
The shape language is **Rounded**, utilizing a base radius of 8px (`0.5rem`). This softens the clinical nature of healthcare data, making the application feel more like a friendly companion. 

- **Buttons & Inputs:** 8px (0.5rem)
- **Large Cards:** 16px (1rem)
- **Selection Chips:** 24px (1.5rem) or fully pill-shaped.

## Components
- **Buttons:** Primary buttons use `primary-600` with white text. Secondary buttons use `primary-container` with `on-primary-container` text. Ensure a subtle scale-down effect (0.98) on press for tactile feedback.
- **Chips:** Used for health tags or categories. Use `primary-100` backgrounds with `primary-800` text for high legibility.
- **Input Fields:** Use a 1px `outline` border that transitions to 2px `primary-600` on focus. Backgrounds should be `surface` to stand out against container backgrounds.
- **Cards:** Content is grouped in cards with `rounded-lg` (16px) corners. Use a subtle `primary-100` border rather than a shadow for a cleaner, modern look.
- **Progress Indicators:** Use the vibrant `primary_color_hex` (#8DC63F) for positive progress (e.g., health goals) and `tertiary` for cautionary states.
- **Lists:** Use generous 16px vertical padding between items with a light `primary-100` divider to maintain a "breathable" layout.