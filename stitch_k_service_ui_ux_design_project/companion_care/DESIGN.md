---
name: Companion Care
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3d4a39'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#6c7b68'
  outline-variant: '#bbcbb4'
  surface-tint: '#006e2d'
  primary: '#006e2d'
  on-primary: '#ffffff'
  primary-container: '#6ffc8d'
  on-primary-container: '#00732f'
  inverse-primary: '#52e176'
  secondary: '#006e13'
  on-secondary: '#ffffff'
  secondary-container: '#5ffe5f'
  on-secondary-container: '#007314'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#e0e0e0'
  on-tertiary-container: '#626363'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71fe8f'
  primary-fixed-dim: '#52e176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#73ff6e'
  secondary-fixed-dim: '#40e348'
  on-secondary-fixed: '#002202'
  on-secondary-fixed-variant: '#00530c'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Noto Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 44px
  display-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  question-lg:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
  body-xl:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  label-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  margin-page: 20px
  gutter: 16px
  touch-target-min: 48px
  button-height-lg: 56px
---

## Brand & Style

The design system is centered on the concept of "Digital Accompaniment," specifically tailored for users aged 50–70 managing chronic health conditions. The brand personality is **warm, reassuring, and clear**, moving away from sterile clinical environments toward a more empathetic, human-centric experience. It prioritizes cognitive ease and physical accessibility.

The design style is **Corporate / Modern** with a strong emphasis on **Humanist Accessibility**. It uses generous whitespace, exceptionally legible typography, and soft UI elements to reduce medical anxiety. The interface follows a "one screen, one purpose" philosophy to prevent overwhelm, ensuring that every interaction feels like a guided conversation rather than a complex technical task.

## Colors

The color palette is designed to be calming yet functional, utilizing a high-visibility primary accent to guide the eye. The **Luminous Mint** (#72FF90) serves as the main interactive anchor, providing a sense of vitality and growth with increased brightness for better visibility. The **Vibrant Green** (#60FF60) acts as a secondary supportive tone, offering a cohesive, nature-inspired feel for secondary information and structural elements.

**Color Usage Rules:**
- **Background:** Use pure White (#FFFFFF) for the global app background to maximize contrast and clarity.
- **Surface:** Component backgrounds (cards, inputs) should use the near-white Neutral (#F8F8F8) or White to create subtle visual depth.
- **Semantic Feedback:** Status colors (Success, Warning, Danger) must always be paired with icons or text labels to ensure accessibility for users with color vision deficiencies. 
- **Contrast:** All text-on-background combinations must strictly adhere to WCAG AA standards, especially when using the high-brightness primary green for interactive elements.

## Typography

Legibility is the highest priority. The system utilizes **Noto Sans** for its exceptional clarity across all display sizes.

**Key Principles:**
- **Scale:** The base body size is set to 18px, significantly larger than standard web apps, to accommodate the visual needs of an older demographic. 
- **Spacing:** Line heights are set generously (1.55x - 1.7x) to prevent "crowding" of text, which helps users with cognitive friction or declining vision.
- **Hierarchy:** Use weight (Bold/Medium) rather than just size to distinguish headings from body text. 
- **Accessibility:** The layout must remain functional when the user increases system-level font sizes up to 200%.

## Layout & Spacing

The layout follows a **Mobile-First Fluid Grid** with a strict 8px rhythmic system. To accommodate motor skill variations, touch targets are oversized and margins are generous.

**Layout Rules:**
- **Vertical Stack:** Prefer single-column vertical layouts. Avoid complex horizontal grids that require precise scanning.
- **Safe Zones:** A fixed 20px margin is maintained on the left and right of the viewport.
- **Component Spacing:** Use 16px (2 units) for spacing between related elements and 32px (4 units) between distinct sections.
- **Constraints:** On tablets or larger devices, the content area is capped at 720px and centered to maintain a readable line length.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** and **Visible Outlines** rather than complex shadows, which can appear "blurry" to some users.

- **Surface Definition:** All interactive cards and containers must use a 1px border (#E0E0E0) to define their boundaries clearly against the white background.
- **Shadows:** Use a single, soft "Ambient Shadow" for floating elements like Sticky CTAs. The shadow should be highly diffused with low opacity (e.g., 4% alpha) to suggest lift without creating visual noise.
- **Active State:** Elements being interacted with should use a subtle inner tint of the Tertiary color (#F8F8F8) rather than a heavy shadow shift.

## Shapes

The shape language is **Rounded and Friendly**. All major components like cards, panels, and input fields use a **16px (rounded-lg)** corner radius to evoke a feeling of safety and gentleness.

- **Buttons:** Primary buttons use a 16px radius. In specific contexts like "Source Badges," a full pill-shape may be used to differentiate meta-information from interactive elements.
- **Selection UI:** Large "Quiz" buttons or selection tiles should maintain the 16px radius to ensure a consistent, soft appearance across the user journey.

## Components

### Buttons
- **Primary Action:** Minimum 56px height. Full-width on mobile. Use Luminous Mint (#72FF90) with dark text to ensure high legibility. Labels must be verb-based (e.g., "Start Recording").
- **Secondary Action:** Ghost style with a Vibrant Green (#60FF60) border and 18px text.

### Cards (Journey & Quiz)
- **Structure:** 16px rounded corners, 1px Border (#E0E0E0), and off-white/white background.
- **Spacing:** 20px internal padding.
- **Quiz Interaction:** Use large, full-width buttons inside cards to ensure mis-taps are minimized.

### Form Inputs
- **Fields:** Minimum 56px height. Ensure the label is always visible (not floating/disappearing) and set at 18px minimum.
- **Focus State:** Use a 2px Luminous Mint border.

### Feedback & Status
- **Source Badges:** Small pill-shaped tags used to denote "AI-Generated" vs "Doctor Verified." 
- **Voice UI:** A dedicated recording component that uses a pulse animation (Luminous Mint) and clearly visible "Pause/Stop" controls (minimum 48px target).

### Accessibility & Interactivity
- **Touch Targets:** Every interactive element must be at least 48px in height/width.
- **Iconography:** Icons must never appear alone. They must always be accompanied by a text label of at least 16px.