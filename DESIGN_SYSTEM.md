# Patient Intake Design System

## Foundations

- Font family: Segoe UI, SegoeUI, Helvetica Neue, Arial, sans-serif.
- Primary color: `#0078D4`.
- Primary text: `#323130`.
- Secondary text: `#605E5C`.
- Border: `#E1DFDD`.
- White: `#FFFFFF` — page section and surface background.
- Spacing increments: multiples of 2px, from 2px upward. Use the `--space-*` tokens in `styles.css` where practical.

## CSS Tokens

| Token | Value |
| --- | --- |
| `--primary` | `#0078D4` |
| `--white` | `#FFFFFF` |
| `--text` | `#323130` |
| `--muted` | `#605E5C` |
| `--line` | `#E1DFDD` |
| `--space-1` through `--space-14` | `2px` through `48px`, on the 2px scale |

Use these shared foundations throughout the application. Keep semantic status colors and supporting surface colors distinct from the primary text and action colors.
## App Shell

Every page sits inside the Signetic Manager Portal shell:

- **Exploration bar** (`.explore-bar`): prototype-only 36px white tab bar (`--explore-h`) above the ribbon for switching design directions — "Generic Flow" (`index.html` and its linked pages) and "Different direction" (`different-direction.html`). It is included in `--shell-top`.
- **Ribbon** (`.shell-ribbon`): fixed black bar, 42px — app launcher, SIGNETIC wordmark, "Manager Portal", environment label (SANDBOX), and global actions (search, create, filter, settings, help, account).
- **Left navigation** (`.shell-nav`): fixed, 180px wide, collapsible to a 44px icon rail with the menu button (collapsed by default at 900px and below). The current page is marked `.active` with `aria-current="page"`.
- **Command bar** (`.shell-commands`): 36px bar under the ribbon with back, refresh, and page actions.
- **Body** (`.app-body`): all page content goes here. It keeps the page background (`--bg`) with 16px padding on all sides (`--body-pad`) and is offset by `--shell-top` and `--shell-left`; any fixed or sticky element inside the body must add these variables to its `top`/`left` offsets.
- **Page section** (`.topbar` + `.workspace`): the page header and its content sit inside the body padding on a white background (`--white`) and fill the remaining screen height.
- **Page footer** (`.page-footer`): 64px (`--footer-h`) white bar fixed to the bottom of the page section, with a top border. Actions are right-aligned: secondary (`.footer-btn`, e.g. Cancel) first, then the primary action (`.footer-btn.primary`, e.g. Extract) on the far right. Give the scrolling content `padding-bottom: var(--footer-h)` so nothing hides behind it.
