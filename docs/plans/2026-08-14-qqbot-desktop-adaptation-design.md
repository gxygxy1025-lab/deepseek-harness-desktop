# QQ Bot desktop adaptation design

## Goal

Ship `@tencent-connect/dsh-qqbot@0.2.0` as a protected desktop bundle and make its first-run QR binding usable without a visible terminal. The integration applies only to the isolated `desktop` profile and must not expose AppSecret to renderer code, logs, or `cordis.patch.yml`.

## Runtime composition

- Add the official QQ Bot bundle to the desktop package and managed profile packages.
- Keep the bundle's `im-qqbot` row disabled while no desktop credential exists. This prevents the upstream plugin from entering its terminal-only QR setup during normal desktop startup.
- Maintain a small marker-delimited QQ Bot section in the desktop profile patch. It contains only `disabled: true|false`; credentials never enter YAML.
- Load encrypted credentials before constructing the DSH runtime controller and inject `QQBOT_APPID` and `QQBOT_SECRET` into the child environment through an environment provider.

## Credential storage

- Encrypt the complete credential JSON with Electron `safeStorage` and persist only the encrypted base64 payload under the app user-data directory.
- Refuse to persist if OS encryption is unavailable.
- Return only binding state and a masked AppID to renderer code.
- On unbind, stop an active QR flow, remove the encrypted file, disable the profile row, clear the in-memory runtime environment, and restart DSH.

## QR flow

- Use the official connector's callback API with console rendering disabled.
- Convert each QR URL to an in-memory PNG data URL in the Electron main process.
- Forward QR refresh, success, cancellation, and failure events over a narrow IPC surface.
- On success, encrypt credentials, enable the profile row, update the runtime environment, restart DSH, and report the resulting state.

## UI

- Add a protected QQ Bot binding card above the generic Cordis bundle list in Extension Dock.
- Show unbound, waiting-for-scan, restarting, bound, and error states.
- While scanning, render the QR image and expose cancel. When bound, show only the masked AppID and an explicit unbind action.

## Verification

- Unit-test credential encryption boundaries, managed profile patch preservation, QR event lifecycle, cancellation, and unbind.
- Test IPC registration and renderer-safe payloads.
- Extend profile composition and package verification to cover the official bundle.
- Run the actual DSH host with QQ Bot disabled, then build and verify the unpacked application and the 0.1.6 NSIS installer.
