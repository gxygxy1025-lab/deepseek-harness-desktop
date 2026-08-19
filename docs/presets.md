# Desktop Presets

Desktop Preset v1 is a reviewable, portable description of an allowed DeepSeek Harness Desktop environment. Extension Dock can export the current community plugin lock, allowlisted Desktop settings, user DSH skills, and task templates, or preview and import a `.dshpreset` file. Export reports settings omitted because they are local-only, outside the allowlist, or potentially sensitive.

## Container

| Entry | Contract |
| --- | --- |
| `dsh-preset.json` | Format version, display metadata, exact source versions, required capabilities, and required Secret names |
| `packages.lock.json` | Registry package names, exact semantic versions, and SHA-512 integrity |
| `settings.json` | Allowlisted portable fields only; import merges them into real `settings.yaml` without replacing unrelated local values |
| `skills/` | Bounded text/data files; each skill contains `SKILL.md` and no executable script |
| `task-templates.json` | Bounded array without Secret-bearing fields, local paths, or Git URLs |
| `README.md` | Human review notes |
| `integrity.json` | SHA-256 for every other archive entry |

`integrity.json` is the integrity root and therefore does not hash itself. Its exact file list must match every other archive entry.

## Import sequence

The main process performs parse, schema validation, bounded archive inspection, integrity verification, registry bundle/integrity/compatibility inspection, capability planning, and a trust summary before confirmation. Missing or incompatible package candidates can be skipped; they cannot be silently applied. The renderer receives no selected path. After explicit confirmation Desktop resolves the selected exact registry candidates again, binds their SHA-512 integrity and bundle identity to the reviewed lock, prefetches all packages, stages configuration, stops Runtime once, applies one offline package batch and staged configuration, prepares the Desktop profile, starts Runtime, waits for health, and commits.

Failure restores the original profile manifest and lockfile, Desktop settings, task templates, every selected skill conflict, and the previous Runtime. Progress reports preparation, prefetch, stop, apply, start, commit, rollback, and restore phases.

## Trust and conflicts

SHA-256 verification proves only that the archive matches its own integrity manifest. It does not identify or authorize the publisher. Runtime capabilities describe available operations; they are not security identity. Review the Manifest and source before importing.

`requiredSecrets` contains environment-variable-style names only. Presets never contain Secret values, hidden credential files, private keys, executable code, Git dependencies, arbitrary URLs, local paths, NTFS alternate data streams, or version ranges. Configure required Secret values through their owning integration after import.

Web Profile migration uses the same package transaction. Its review lists exact compatible packages plus a count of attributable `profiles/web/cordis.patch.yml` fragments. Desktop copies only fragments tied to selected package names or IDs declared by those packages, never sends the fragment values to the renderer, skips fragments with credential-like keys, and maintains a replaceable section in the Desktop profile patch. Package and patch changes roll back together.

When an exact package version or skill name conflicts with Desktop state, the only choices are skip, use the Preset exact item, or cancel the import. Missing, incompatible, managed, and non-exact Web Profile plugins are displayed but cannot be silently migrated.

The machine-readable schema is [dshpreset-v1.schema.json](schemas/dshpreset-v1.schema.json). The transaction rationale is [ADR 0006](adr/0006-atomic-extension-batches-and-presets.md).
