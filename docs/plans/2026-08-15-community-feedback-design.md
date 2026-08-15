# Community and feedback entry design

## Goal

Add two discoverable actions to the desktop application's top `帮助 / Help` menu:

- `加入社群 / Join QQ Group` opens a small in-app window with a QQ group QR code and a system-browser join action.
- `提建议 / Suggest an Idea` opens the repository's GitHub new-issue page in the system browser.

## Architecture

The URLs are fixed constants shared by the menu, Electron main process, and community renderer. The main process generates the QR image from the fixed QQ group URL with the already-packaged `qrcode` dependency and passes only the resulting PNG data URL to a sandboxed local page. The page has no Node integration and uses the existing navigation policy, so external navigation is intercepted and delegated to `shell.openExternal`.

The community window is a single-instance child of the main window. Repeated menu clicks focus the existing window instead of creating duplicates. Closing the main application closes the child naturally.

## Interface

The community page uses the desktop shell's restrained dark visual language. It contains a title, a short explanation, a prominent QR card, a primary `一键加群` link, and a secondary GitHub feedback link. The top Help menu also exposes the feedback action directly for users who do not need the community page.

## Error handling and tests

If QR generation or window loading fails, the error is recorded in the bounded desktop log rather than exposing process details to the renderer. Tests cover the fixed destination URLs, menu actions, QR rendering contract, external-link classification, single-window behavior through the packaged smoke flow, and visible page content. Final verification includes the desktop test suite, a screenshot review, and packaged-runtime validation.
