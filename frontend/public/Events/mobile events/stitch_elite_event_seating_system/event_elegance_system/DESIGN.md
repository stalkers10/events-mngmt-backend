---
name: Event Elegance System
colors:
  surface: '#fff8f7'
  surface-dim: '#edd4d4'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f0'
  surface-container: '#ffe9e8'
  surface-container-high: '#fbe2e2'
  surface-container-highest: '#f5dddd'
  on-surface: '#251819'
  on-surface-variant: '#584141'
  inverse-surface: '#3b2d2d'
  inverse-on-surface: '#ffedec'
  outline: '#8c7071'
  outline-variant: '#e0bfbf'
  surface-tint: '#af2b3e'
  primary: '#570013'
  on-primary: '#ffffff'
  primary-container: '#800020'
  on-primary-container: '#ff828a'
  inverse-primary: '#ffb3b5'
  secondary: '#6c5b56'
  on-secondary: '#ffffff'
  secondary-container: '#f5ddd7'
  on-secondary-container: '#72605c'
  tertiary: '#002c36'
  on-tertiary: '#ffffff'
  tertiary-container: '#004451'
  on-tertiary-container: '#7cb0c0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b5'
  on-primary-fixed: '#40000b'
  on-primary-fixed-variant: '#8e0f28'
  secondary-fixed: '#f5ddd7'
  secondary-fixed-dim: '#d8c2bc'
  on-secondary-fixed: '#251915'
  on-secondary-fixed-variant: '#53433f'
  tertiary-fixed: '#b6ebfb'
  tertiary-fixed-dim: '#9acfde'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#114d5b'
  background: '#fff8f7'
  on-background: '#251819'
  surface-variant: '#f5dddd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin-mobile: 16px
  container-margin-desktop: auto
  max-width-desktop: 1200px
---

## Brand & Style
The design system is crafted for high-end event management, focusing on weddings, galas, and corporate functions. The brand personality is **sophisticated, refined, and organized**, prioritizing clarity and a sense of "occasion." 

The design style is **Modern Corporate with a Soft Minimalist touch**. It avoids the sterility of typical SaaS products by using a warm, tonal color palette and subtle depth. The UI should evoke a feeling of premium hospitality, where every interaction feels deliberate and polished. Negative space is used generously to prevent the interface from feeling cluttered, ensuring that the content—the events themselves—remains the focal point.

## Colors
The palette is built on a foundation of warmth and authority.
- **Primary (Burgundy):** Used for critical actions, active navigation states, and key headers. It conveys tradition and premium quality.
- **Secondary (Soft Pink):** Acts as a structural highlight color for cards and subtle backgrounds, providing a soft contrast to the primary burgundy.
- **Background (Peach Tint):** A global background color that softens the overall UI compared to a harsh white.
- **Neutral (White):** Reserved for high-level surface containers (cards, modals) to ensure maximum legibility for event details.
- **Text:** Deep espresso tones are used instead of pure black to maintain the warmth of the palette while ensuring high accessibility.

## Typography
This design system utilizes **Inter** for its exceptional legibility and modern, neutral character. 
- **Headlines:** Use tighter letter spacing and heavier weights to create an editorial feel. 
- **Labels:** Small caps are used for metadata (e.g., dates, ticket categories) to differentiate informational snippets from body text.
- **Scale:** On mobile, display sizes are slightly reduced to ensure headings do not break awkwardly across lines, maintaining the clean aesthetic.

## Layout & Spacing
The layout follows a **8px grid system** for consistent spatial relationships. 
- **Mobile:** A single-column fluid layout with 16px side margins. Elements like cards should span the full width minus margins.
- **Desktop:** The content is centered within a 1200px max-width container. Navigation transitions to a top-bar or fixed sidebar.
- **Gutters:** Standard gutter between cards or list items is 16px to maintain a breathable, airy feel.

## Elevation & Depth
Depth is created using a combination of **Tonal Layers** and **Ambient Shadows**.
- **Level 0 (Background):** The soft peach (#FFF1EE) base.
- **Level 1 (Surface):** White cards (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(128, 0, 32, 0.04)). The shadow has a slight burgundy tint to integrate it with the brand colors.
- **Level 2 (Interaction):** Hover states or active modals increase the shadow spread and slightly darken the tint (rgba(128, 0, 32, 0.08)).
- **Outlines:** Subtle 1px borders in #FCE4DE are used for non-elevated interactive elements like input fields.

## Shapes
A **Rounded (0.5rem / 8px - 12px)** logic is applied to create a friendly yet professional appearance.
- **Standard UI (Buttons, Inputs):** 8px radius.
- **Large UI (Cards, Modals):** 12px-16px radius (`rounded-lg` or `rounded-xl`).
- **Chips:** Full-pill shape for status indicators to distinguish them from actionable buttons.

## Components
- **Buttons:** Primary buttons are solid Burgundy (#800020) with white text. Secondary buttons use a Soft Pink (#FCE4DE) background with Burgundy text.
- **Status Chips:** 
    - *Full/Checked-in:* Solid Burgundy with white text.
    - *Available:* Transparent background with a 1px Soft Pink outline and Burgundy text.
- **Input Fields:** White background with a Soft Pink border. On focus, the border thickens to 2px and changes to Burgundy. Labels sit above the field in `label-caps` style.
- **Cards:** White surfaces with 12px rounded corners and soft ambient shadows. The event title uses `headline-sm`, and the date/time uses `label-caps` in the secondary text color.
- **Lists:** Clean dividers using #FCE4DE at 0.5px height. High-touch items should include a chevron-right icon in the primary color to indicate interactivity.