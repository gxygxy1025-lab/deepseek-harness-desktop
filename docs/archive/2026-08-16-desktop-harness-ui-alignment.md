# Desktop 2.0 Harness UI alignment

## Goal

Desktop-owned surfaces must feel like part of DeepSeek Harness instead of a separate dark operations product. The implementation keeps the official application page untouched and aligns the SSH panel, extension dock, community window, update dialog, window chrome, and launch transition around one visual and interaction contract.

## Reference evidence

The running Harness page is the source of truth. Its main traits are a near-white canvas, light gray navigation surfaces, hairline separators, compact 13-14 px controls, restrained blue emphasis, rounded rectangles without decorative gradients, and generous empty space. The baseline captures are `output/playwright/harness-main-before.png` and `output/playwright/ssh-before.png`; the desktop-owned baseline captures are under `apps/dsh-desktop/output/playwright/`.

## Direction considered

1. Native Harness: use the official visual hierarchy and tokens for every persistent utility surface. This is the selected direction because it produces the smallest context switch and remains compatible with Harness light and dark themes.
2. Dark Harness extension: keep the blue-black desktop palette but reduce decoration. This preserves more existing art direction but still looks like a second product beside the official light shell.
3. Glass desktop shell: make every surface translucent. This fits the earlier macOS-inspired concept but conflicts with the actual Harness application and reduces text contrast.

## Visual contract

- Persistent product pages use system sans-serif typography, 13-14 px body text, 16-20 px page titles, and normal Chinese text casing. Large serif display type, all-caps metadata, cyan glow, diagonal backgrounds, and decorative gradients are removed.
- The base palette is `#ffffff` for content, `#f7f8fa` for secondary surfaces, `#f1f2f4` for hover and selected rows, `#e5e7eb` for separators, `#17191c` for primary text, `#656b75` for secondary text, and `#4d78e8` for the single business accent. Embedded plugin UI uses the official `--dsw-*` aliases instead of fixed colors.
- Controls use 8 px radii, 32-36 px heights, one-pixel borders, and visible blue focus rings. Primary buttons are reserved for the next recommended action; secondary actions remain neutral.
- Content is organized as a linear page: compact header, tabs or section navigation, then rows and quiet groups. Cards are used only when a boundary communicates ownership or risk, not for every metric.
- Empty, loading, error, disabled, and success states retain the same geometry to avoid layout jumps. Destructive remote operations remain confirmation-gated and visually separate from ordinary navigation.

## Surface decisions

### SSH

The panel stays inside the Harness center column and continues using official alias tokens. The six sections remain available, but the title bar, tabs, toolbar, tables, and forms follow the same density as the Harness sidebar and file panel. Live monitoring becomes a compact overview strip plus row-based process and service sections rather than a dashboard of six raised cards. Polling and remote-operation behavior do not change.

### Extension dock

The dock becomes a light utility page with a compact title row, native-looking tabs, a centered content column, and restrained bordered groups. Community ownership, plugin compatibility, and disabled-by-default status remain explicit without amber/cyan decorative framing.

### Community window

The window becomes a small Harness-style dialog page. The QR code remains the visual focus, with one primary join action and one quiet feedback row.

### Updates

The injected update surface becomes a standard Harness dialog with a neutral mask, white panel, compact title, plain version chips, blue progress, and one primary install action. Download and install semantics remain unchanged.

### Launch transition

The blue-black particle whale remains because it is a short-lived branded transition already approved for Desktop 2.0. The typography and status area are reduced to Harness scale, decorative technical labels are removed, and the progress state uses a simple line instead of a glass dashboard card.

## Responsive and accessibility contract

- At widths below 850 px, multi-column headers and action rows collapse without horizontal scrolling.
- Every interactive control has a visible `:focus-visible` state and at least a 32 px target; primary navigation targets remain 36 px or larger.
- Status changes use existing live regions. Color is never the only error, success, compatibility, or remote-service signal.
- `prefers-reduced-motion` disables decorative transitions and particle motion where supported.

## Verification

- Capture the official page and each desktop-owned surface at 1440 x 900, plus the community window at its normal 580 x 740 viewport.
- Compare spacing, typography, border weight, and action prominence rather than requiring pixel identity between unrelated layouts.
- Run desktop and SSH unit tests, type checks, builds, documentation checks, `git diff --check`, and keyboard smoke tests for tabs, dialogs, close actions, and destructive confirmations.

## Detail-pass measurements

The official settings dialog was measured from the running Harness renderer rather than approximated from screenshots. Its reference geometry is an 800 px square white surface with a 24 px outer radius and a three-layer shadow (`0 0 1px 20% black`, `0 0 4px 2% black`, `0 12px 32px 8% black`). The selected navigation row is 164 x 40 px with a 12 px radius and `#ebeff2` fill. Quiet actions are 28 px high with a 14 px radius, selector controls are 36 px high with an 18 px radius, and large option tiles use a 16 px radius. The font stack starts with the Apple system font and falls through Segoe UI and the standard Chinese system sans families.

The extension dock follows that measured settings composition as a two-column, 24 px-radius utility surface instead of a full-bleed web page. Update and host-edit masks use the same restrained background blur, secondary controls use 28 px pill geometry, close controls use a 28 px circular hit area, and localized Chinese surfaces avoid decorative English duplication. These measurements supersede the broader first-pass radius and control-height values above where a component has an official counterpart.
