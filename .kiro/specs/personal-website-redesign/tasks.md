# Implementation Plan: Personal Website Redesign

## Overview

Complete rebuild of hxn.sh from legacy static HTML/CSS/JS to a modern Astro-based personal website with terminal/hacker-inspired aesthetic. Implementation proceeds incrementally: project setup → content data → layout and theme → section components → interactive islands → animations → responsive/accessibility → testing and verification.

## Tasks

- [ ] 1. Remove legacy site and initialize Astro project
  - [x] 1.1 Remove legacy files (index.html, css/, js/, assets/) and initialize a new Astro 4.x project at the repository root with TypeScript support
    - Remove existing `index.html`, `css/`, `js/`, `assets/` directories
    - Run `npm create astro@latest` (or equivalent) to scaffold the project
    - Configure `astro.config.mjs` for static output mode
    - Set up `tsconfig.json` with strict mode
    - Install dev dependencies: `vitest`, `fast-check` for testing
    - _Requirements: 1.1, 1.2, 1.4, 14.1, 14.2, 14.3_

  - [x] 1.2 Create project directory structure matching the design
    - Create `src/components/`, `src/layouts/`, `src/scripts/`, `src/styles/`, `src/data/`, `src/pages/`
    - Create `public/fonts/` directory
    - _Requirements: 1.1_

- [ ] 2. Set up content data and fonts
  - [x] 2.1 Create `src/data/profile.json` with all content data
    - Include name, role, company, tagline, social links (GitHub, LinkedIn, Discord)
    - Include all experience entries with dates and descriptions
    - Include all skill categories (frontend, backend, database, cloud, mobile, tools)
    - Include all certification groups (AWS, CompTIA, ISC2, Udacity)
    - Include all education entries with GPA
    - Ensure dates use "YYYY-MM" format, endDate is null for current role
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 10.1, 10.2, 10.3_

  - [x] 2.2 Add self-hosted JetBrains Mono font files to `public/fonts/`
    - Add `JetBrainsMono-Regular.woff2` and `JetBrainsMono-Bold.woff2`
    - _Requirements: 2.1_

- [ ] 3. Implement base layout and global styles
  - [x] 3.1 Create `src/layouts/BaseLayout.astro`
    - HTML5 document structure with lang attribute
    - Meta tags (viewport, description, Open Graph, favicon)
    - Import global CSS files (global.css, theme.css, crt.css)
    - Font-face declarations for JetBrains Mono with system monospace fallback
    - `<slot />` for page content
    - Reduced-motion detection script
    - _Requirements: 1.4, 2.1, 12.1_

  - [x] 3.2 Create `src/styles/global.css` with base reset and typography
    - CSS reset/normalize
    - Set JetBrains Mono as primary font family
    - Base dark background color scheme
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Create `src/styles/theme.css` with terminal color palette and component styles
    - Define CSS custom properties for terminal colors (green, amber, cyan on dark)
    - Terminal-window styling with borders and title bars
    - High-contrast text colors meeting 4.5:1 ratio
    - _Requirements: 2.2, 2.3, 12.4_

  - [x] 3.4 Create `src/styles/crt.css` with scanline and CRT overlay effects
    - Scanline effect via repeating-linear-gradient pseudo-element
    - Subtle screen flicker via CSS keyframe animation
    - Vignette darkening at edges
    - Respect prefers-reduced-motion by disabling animations
    - _Requirements: 2.4, 11.4, 12.6_

- [x] 4. Checkpoint - Verify base project builds
  - Ensure `astro build` succeeds with the layout and styles in place, ask the user if questions arise.

- [ ] 5. Build static section components
  - [x] 5.1 Create `src/components/HeroSection.astro`
    - Display name "Muhammad Ali Hasan"
    - Display role "Solutions Architect @ Hunt Energy Network"
    - Display tagline from profile data
    - Include social links (GitHub, LinkedIn, Discord) opening in new tabs
    - Include ASCII art element
    - Target element for typing animation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 2.5, 10.4_

  - [x] 5.2 Create `src/components/ExperienceSection.astro`
    - Render experience entries from profile.json
    - Sort and display in reverse chronological order
    - Show title, company, date range, and description for each role
    - Terminal-window styling for each entry
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.3 Create `src/components/SkillsSection.astro`
    - Render skills grouped by category
    - Display all categories: frontend, backend, database, cloud, mobile, tools
    - Visual grouping with category labels
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.4 Create `src/components/CertificationsSection.astro`
    - Render certifications grouped by provider
    - Visually distinguish AWS, CompTIA, ISC2, and Udacity groups
    - Display all certifications listed in requirements
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.5 Create `src/components/EducationSection.astro`
    - Render education entries in reverse chronological order
    - Display degree, institution, and GPA
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.6 Create `src/components/ContactSection.astro`
    - Display LinkedIn, GitHub, and Discord links
    - All links open in new tabs (target="_blank" with rel="noopener noreferrer")
    - Accessible link labels
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 5.7 Create `src/components/CrtOverlay.astro`
    - Pure CSS component applying scanline overlay
    - No client-side JS needed
    - _Requirements: 2.4_

  - [x] 5.8 Create `src/pages/index.astro` wiring all sections together
    - Import BaseLayout and all section components
    - Arrange sections with proper IDs for anchor navigation (#hero, #experience, #skills, #certifications, #education, #contact)
    - Hero section first in viewport
    - Include CrtOverlay
    - _Requirements: 4.5, 10.5_

- [x] 6. Checkpoint - Verify static site builds and renders all content
  - Ensure `astro build` succeeds and all content sections are present in the output HTML, ask the user if questions arise.

- [ ] 7. Implement interactive client-side scripts
  - [x] 7.1 Implement `src/scripts/typing-animation.ts`
    - Character-by-character typing with configurable delay
    - Blinking cursor during and after typing
    - Trigger on page load for hero headline
    - _Requirements: 3.1_

  - [-] 7.2 Implement `src/scripts/matrix-rain.ts`
    - Canvas-based falling green characters using requestAnimationFrame
    - Configurable fontSize, speed, density, color, fadeOpacity
    - Pause when tab is hidden (Page Visibility API)
    - Disable when prefers-reduced-motion is active
    - Handle resize events with debounced reinitialization
    - _Requirements: 3.2, 11.4, 12.6_

  - [~] 7.3 Create `src/components/MatrixRain.astro` island component
    - Full-viewport canvas element positioned behind content
    - Hydrate with `client:load` for immediate visual effect
    - Import and initialize matrix-rain.ts
    - _Requirements: 3.2_

  - [~] 7.4 Implement `src/scripts/terminal-nav.ts`
    - Parse user input from terminal prompt
    - Match commands case-insensitively with alias support
    - Execute smooth scroll to target section
    - Display help message for unrecognized commands
    - Maintain and display command history
    - Handle empty input as no-op
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [~] 7.5 Create `src/components/TerminalNav.astro` island component
    - Fixed-position terminal window with command prompt input (`visitor@hxn.sh:~$`)
    - Command history display area
    - Clickable nav links as fallback
    - Hydrate with `client:load`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [~] 7.6 Implement `src/scripts/glitch-effect.ts`
    - Apply CSS clip-path slicing on hover/focus of target elements
    - Random RGB channel offset using CSS transforms
    - Duration-limited to avoid seizure risk
    - Respect prefers-reduced-motion
    - _Requirements: 3.3, 11.4, 12.6_

  - [~] 7.7 Implement `src/scripts/scroll-reveal.ts`
    - IntersectionObserver to detect sections entering viewport
    - Terminal-style character-by-character reveal animation
    - Mark sections as "revealed" to prevent re-animation
    - Respect prefers-reduced-motion (show content immediately)
    - _Requirements: 3.4, 3.5, 11.4, 12.6_

- [~] 8. Checkpoint - Verify interactive features work
  - Ensure all animations and terminal navigation function correctly in the built output, ask the user if questions arise.

- [ ] 9. Responsive design and accessibility
  - [~] 9.1 Add responsive CSS for mobile (320px-767px), tablet (768px-1023px), and desktop (1024px+)
    - Adapt layout, typography, and spacing at each breakpoint
    - Ensure content is readable and usable at 320px minimum width
    - Support viewports up to 2560px
    - _Requirements: 11.1, 11.2_

  - [~] 9.2 Implement touch-friendly mobile navigation alternative
    - Provide hamburger menu or simplified nav for mobile devices
    - Ensure terminal nav input is usable on touch devices or provide alternative
    - _Requirements: 11.3_

  - [~] 9.3 Implement accessibility features
    - Add meaningful alt text to all non-decorative images and ASCII art
    - Ensure keyboard-only navigation without focus traps
    - Add appropriate ARIA labels to interactive components
    - Verify color contrast ratio of 4.5:1 for all body text
    - _Requirements: 12.3, 12.4, 12.5_

- [~] 10. Checkpoint - Verify responsive and accessible
  - Ensure the site renders correctly at all breakpoints and passes basic accessibility checks, ask the user if questions arise.

- [ ] 11. Property-based tests
  - [~] 11.1 Write property test for reverse chronological ordering
    - **Property 1: Dated entries are rendered in reverse chronological order**
    - Use fast-check to generate arbitrary lists of dated entries and verify the sort function always produces descending order
    - **Validates: Requirements 5.6, 8.4**

  - [~] 11.2 Write property test for skill category grouping
    - **Property 2: Skills are grouped by category**
    - Use fast-check to generate arbitrary skill categories and verify no item appears outside its designated category in rendered output
    - **Validates: Requirements 6.7**

  - [~] 11.3 Write property test for valid command resolution
    - **Property 3: Valid commands resolve to correct target section**
    - Use fast-check to select arbitrary registered commands/aliases and verify they resolve to the correct target section
    - **Validates: Requirements 9.2**

  - [~] 11.4 Write property test for unrecognized command handling
    - **Property 4: Unrecognized commands produce help response**
    - Use fast-check to generate arbitrary strings that don't match any registered command and verify help response is returned
    - **Validates: Requirements 9.3**

  - [~] 11.5 Write property test for alt text presence
    - **Property 5: Non-decorative images have alt text**
    - Validate build output HTML to ensure all `<img>` elements without `role="presentation"` or `aria-hidden="true"` have non-empty alt attributes
    - **Validates: Requirements 12.3**

  - [~] 11.6 Write property test for color contrast compliance
    - **Property 6: Text color contrast meets WCAG AA**
    - Verify that all defined theme color pairings (foreground/background) meet the 4.5:1 contrast ratio
    - **Validates: Requirements 12.4**

- [ ] 12. Build verification and final checks
  - [~] 12.1 Verify `astro build` produces valid static output
    - Confirm output in `dist/` contains minified CSS and JS
    - Confirm valid HTML5 output
    - Confirm no legacy files remain
    - _Requirements: 1.2, 1.4, 12.1, 14.2_

  - [~] 12.2 Run Lighthouse performance check
    - Verify desktop performance score >= 90
    - _Requirements: 12.2_

- [~] 13. Final checkpoint - All tests pass and site is ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- The site uses TypeScript for all client-side scripts as specified in the design
- Self-hosted fonts avoid external CDN dependencies
- All animations respect `prefers-reduced-motion` for accessibility
