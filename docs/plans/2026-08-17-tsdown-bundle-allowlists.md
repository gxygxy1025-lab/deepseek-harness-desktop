# Tsdown bundle allowlists

## Problem

Tsdown reports four dependency-bundling hints during a full workspace build.
The affected host, client, and standalone mobile artifacts intentionally inline
some packages, but the configuration does not state which packages are
allowed. A dependency update could therefore pull a new package into a bundle
without review, increasing installer size or duplicating runtime state.

The CommonJS recommendation is separate. Client artifacts must remain CommonJS
because the DSH browser loader executes each plugin inside a `module.exports`
factory. Changing that format requires a loader protocol migration and is not
part of this change.

## Design

Every build face receives a `deps.onlyBundle` policy:

- host and client faces default to an empty list, so bundling a package from
  `node_modules` is a build error unless the package config opts in;
- remote-web-ui client allows `clsx` and `qrcode.react`;
- remote-web-ui mobile allows React, React DOM, scheduler, zod, and the API wire
  package required by its standalone page;
- SSH host allows `cosmokit` and `schemastery`;
- SSH client allows `@xterm/xterm` and `@xterm/addon-fit`.

The policy is validation-only: `alwaysBundle` and `neverBundle` continue to
decide what is bundled. A before/after SHA-256 comparison of every generated
runtime JavaScript file must therefore show no changes.

## Verification

Preset tests assert default-deny behavior and all explicit face-specific
allowlists. A full workspace build must contain no `deps.onlyBundle` hint and
must reproduce every baseline runtime JavaScript hash. Root verification and
generated-file checks then cover the complete repository.
