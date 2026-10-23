# Fluent UI design system

Every application page is built on Microsoft's Fluent UI web styles — intake (`index.html`, `index-v2.html`), pre-check (`precheck.html`), prepare orders (`prepare-orders.html`), existing order (`existing-order.html`) and DME order (`dme-order.html`):
https://developer.microsoft.com/en-us/fluentui#/styles/web

## Files

| File | What it is |
| --- | --- |
| `fabric-core.min.css` | Official **Office UI Fabric Core 11.1.0** (Fluent UI web styles), MIT licensed — see `LICENSE-fabric-core.txt`. Provides the `ms-*` classes: `ms-fontSize-*`, `ms-fontWeight-*`, `ms-depth-*`, `ms-motion-*`, `ms-bgColor-*`, `ms-fontColor-*`, `ms-Grid`. All class-scoped; no global resets. |
| `fluent-tokens.css` | Fluent tokens as CSS custom properties (`--fluent-*`). Values are copied from the `@fluentui/theme` package (Fluent UI React v8): palette, neutrals, shared colors, semantic colors, type ramp, weights, elevation, corners, spacing and motion. |
| `fluent-components.css` | Maps the app's existing classes to Fluent UI React v8 component specs (Button, IconButton, CommandBar, TextField, Dropdown, ContextualMenu, Dialog, Checkbox, Link, Nav, Pivot). |

Load order on every application page:

```html
<link rel="stylesheet" href="fluent/fabric-core.min.css">
<link rel="stylesheet" href="fluent/fluent-tokens.css">
<link rel="stylesheet" href="styles.css">
<!-- page styles: theme-modern.css, upload-start.css, flow-v2.css, order.css, precheck.css, prepare-orders.css -->
<link rel="stylesheet" href="fluent/fluent-components.css">
```

The `<body>` carries `ms-Fabric`, which sets the Fluent font stack and text color.

## Rules for new UI

- **Color:** never hard-code hex values. Use an app token (`--primary`, `--text`, `--muted`, `--line`, `--green`, `--red`, `--amber`, their `-soft`/`-line` variants) or a `--fluent-*` token. Status tints are softened mixes of Fluent's semantic message-bar colors so they stay subtle.
- **Type ramp:** 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 42 / 68px. Body text is 14px/20px. Weights are Regular 400 and Semibold 600 only.
- **Labels** are sentence case. No all-caps micro labels.
- **Corners:** 2px (`--fluent-corner-2`) for controls, cards and dialogs. Pills and avatars stay fully rounded.
- **Elevation:** `--fluent-depth-4` (cards), `-8` (menus, callouts), `-16` (panels, toasts), `-64` (dialogs).
- **Controls:** 32px tall. Default button = white with `#8a8886` border; primary = theme primary. Disabled = `neutralLighter` background with `neutralTertiary` text. Inputs use a `#605e5c` border and a 2px theme-primary focus border.
- **Focus:** 1px `neutralSecondary` focus rectangle (`:focus-visible`).
- **Motion:** entrances use `--fluent-ease-1` with `--fluent-duration-3`; fades and exits use `--fluent-ease-2`.

## App token → Fluent token

| App token | Fluent token |
| --- | --- |
| `--primary`, `--blue` | `themePrimary` #0078d4 |
| `--blue-hover` | `themeDarkAlt` #106ebe |
| `--blue-soft` / `--blue-line` | `themeLighterAlt` #eff6fc / `themeLight` #c7e0f4 |
| `--text`, `--label`, `--ink` | `neutralPrimary` #323130 |
| `--muted` | `neutralSecondary` #605e5c |
| `--line` / `--line-strong` | `neutralQuaternaryAlt` #e1dfdd / `neutralTertiaryAlt` #c8c6c4 |
| `--bg`, `--sunken` | `neutralLighter` #f3f2f1 |
| `--green` / `--green-soft` | `successText` #107c10 / `successBackground` #dff6dd |
| `--red` / `--red-soft` | `errorText` #a4262c / `errorBackground` #fde7e9 |
| `--amber` / `--amber-soft` | `orangeYellow20` #986f0b / `warningBackground` #fff4ce (softened) |
| `--shadow` | `depth8` |

## Not yet migrated

- **Icons** still use Lucide outline icons. Fluent's own set is Fluent UI System Icons (or the MDL2 icon font).
- The design explorations (`different-direction.html` + `direction.css`, `version-3.html` + `version3.css`) intentionally keep their own style. They only load `fluent-tokens.css` so the shared portal shell renders correctly.
- `theme-modern.css` is still loaded, but its tokens now point at Fluent values (blue accent instead of purple, Segoe instead of Inter, 2px corners, Fluent depths), so it only adds component polish on top of Fluent.
