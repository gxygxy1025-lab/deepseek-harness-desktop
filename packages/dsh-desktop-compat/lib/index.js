import { FRIENDLY_CANCELLED_MESSAGE, createQueueRecoveryScheduler, normalizeCancellationDecision, recoverQueuedTurns } from "./recovery.js";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Service } from "@deepseek-ai/cordis";
//#region src/skin-state.ts
const SKIN_STATE_START = "# --- dsh-skin managed (auto-generated; do not edit) ---";
const SKIN_STATE_END = "# --- end dsh-skin managed ---";
const LOADER_ID_RE = /^[A-Za-z0-9._/@-]+$/;
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
function readText(path) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}
function sectionBounds(text) {
	const start = text.indexOf(SKIN_STATE_START);
	if (start === -1) return null;
	const markerEnd = text.indexOf(SKIN_STATE_END, start);
	if (markerEnd === -1) throw new Error("desktopSkinState: managed skin section is unterminated");
	return {
		start,
		end: markerEnd + 30
	};
}
function controlledRows(text) {
	const bounds = sectionBounds(text);
	const rows = /* @__PURE__ */ new Map();
	if (bounds === null) return rows;
	const lines = text.slice(bounds.start, bounds.end).split(/\r?\n/u);
	for (let index = 0; index < lines.length; index += 1) {
		const id = /^- id:\s*([A-Za-z0-9._/@-]+)\s*$/u.exec(lines[index] ?? "")?.[1];
		if (id === void 0) continue;
		const disabled = /^\s{2}disabled:\s*(true|false)\s*$/u.exec(lines[index + 1] ?? "")?.[1];
		rows.set(id, disabled === "true");
	}
	return rows;
}
function managedIds(text) {
	const bounds = sectionBounds(text);
	if (bounds === null) return /* @__PURE__ */ new Set();
	const ids = /* @__PURE__ */ new Set();
	for (const line of text.slice(bounds.start, bounds.end).split(/\r?\n/u)) {
		const id = /^\s*- id:\s*([A-Za-z0-9._/@-]+)\s*$/u.exec(line)?.[1];
		if (id !== void 0) ids.add(id);
	}
	return ids;
}
function renderRows(rows) {
	const lines = [SKIN_STATE_START];
	for (const [id, disabled] of [...rows].sort(([left], [right]) => left.localeCompare(right))) lines.push(`- id: ${id}`, `  disabled: ${disabled ? "true" : "false"}`);
	lines.push(SKIN_STATE_END);
	return lines.join("\n");
}
function appendDisabledRows(text, ids) {
	const bounds = sectionBounds(text);
	const existing = controlledRows(text);
	const additions = [...new Set(ids)].filter((id) => !existing.has(id)).sort();
	if (additions.length === 0) return text;
	const rows = additions.flatMap((id) => [`- id: ${id}`, "  disabled: true"]).join("\n");
	if (bounds === null) return replaceSection(text, `${SKIN_STATE_START}\n${rows}\n${SKIN_STATE_END}`);
	return `${text.slice(0, bounds.end - 30).replace(/\s*$/u, "")}\n${rows}\n${text.slice(bounds.end - 30)}`;
}
function replaceSection(text, section) {
	const bounds = sectionBounds(text);
	const outside = (bounds === null ? text.trim() : `${text.slice(0, bounds.start)}${text.slice(bounds.end)}`.trim()).split(/\r?\n/u).filter((line) => !/^[ \t]*\[\]$/u.test(line)).join("\n").trim();
	return outside ? `${outside}\n\n${section}\n` : `${section}\n`;
}
function writeAtomic(path, content) {
	const parent = dirname(path);
	mkdirSync(parent, { recursive: true });
	let mode = 384;
	try {
		mode = statSync(path).mode & 511;
	} catch {}
	const temporaryDir = mkdtempSync(join(parent, `${basename(path)}.tmp-`));
	const temporary = join(temporaryDir, basename(path));
	try {
		writeFileSync(temporary, content, {
			encoding: "utf8",
			flag: "wx"
		});
		chmodSync(temporary, mode);
		renameSync(temporary, path);
	} finally {
		rmSync(temporaryDir, {
			recursive: true,
			force: true
		});
	}
	if (readFileSync(path, "utf8") !== content) throw new Error(`desktopSkinState: write verification failed: ${path}`);
}
var DesktopSkinStateStore = class {
	home;
	profile;
	constructor(home = process.env.DSH_HOME ?? join(homedir(), ".dsh"), profile = process.env.DSH_PROFILE ?? "desktop") {
		this.home = home;
		this.profile = profile;
	}
	get profileDir() {
		return join(this.home, "profiles", this.profile);
	}
	get patchPath() {
		return join(this.profileDir, "cordis.patch.yml");
	}
	wiredPackageNames() {
		try {
			const manifest = JSON.parse(readFileSync(join(this.profileDir, "package.json"), "utf8"));
			const names = /* @__PURE__ */ new Set();
			const bundles = manifest.dsh?.profile?.bundles;
			if (Array.isArray(bundles)) {
				for (const value of bundles) if (typeof value === "string") names.add(value);
			}
			if (typeof manifest.dependencies === "object" && manifest.dependencies !== null) for (const name of Object.keys(manifest.dependencies)) names.add(name);
			return names;
		} catch {
			return /* @__PURE__ */ new Set();
		}
	}
	loaderId(name, entries) {
		if (!PACKAGE_NAME_RE.test(name)) return null;
		const packagePatch = readText(join(this.profileDir, "node_modules", ...name.split("/"), "cordis.patch.yml"));
		let pending = null;
		for (const line of packagePatch.split(/\r?\n/u)) {
			const id = /^\s*-\s+id:\s*['"]?([A-Za-z0-9._/@-]+)/u.exec(line);
			if (id !== null) pending = id[1];
			const packageName = /^\s*name:\s*['"]?([^'"\s]+)/u.exec(line);
			if (pending !== null && packageName?.[1] === name) return pending;
		}
		for (const entry of entries) if (entry.options.name === name && typeof entry.options.id === "string" && LOADER_ID_RE.test(entry.options.id)) return entry.options.id;
		return null;
	}
	migrateLegacy(disabledNames, entries) {
		const entryList = [...entries];
		const migrated = /* @__PURE__ */ new Set();
		const text = readText(this.patchPath);
		const ids = [];
		for (const name of disabledNames) {
			const id = this.loaderId(name, entryList);
			if (id === null) continue;
			ids.push(id);
			migrated.add(name);
		}
		const next = appendDisabledRows(text, ids);
		if (next !== text) writeAtomic(this.patchPath, next);
		return migrated;
	}
	disabledNames(themeNames, entries) {
		const entryList = [...entries];
		const rows = controlledRows(readText(this.patchPath));
		const disabled = /* @__PURE__ */ new Set();
		for (const name of themeNames) {
			const id = this.loaderId(name, entryList);
			if (id !== null && rows.get(id) === true) disabled.add(name);
		}
		return disabled;
	}
	activateBundleTheme(name, themeNames, entries) {
		const wiredPackages = this.wiredPackageNames();
		if (!wiredPackages.has(name)) throw new Error(`desktopSkinState: ${name} is not wired through the active profile`);
		const entryList = [...entries];
		const targetId = this.loaderId(name, entryList);
		if (targetId === null) throw new Error(`desktopSkinState: no loader id for ${name}`);
		const text = readText(this.patchPath);
		const rows = controlledRows(text);
		for (const id of rows.keys()) rows.set(id, true);
		for (const id of managedIds(text)) if (!rows.has(id)) rows.set(id, true);
		for (const themeName of themeNames) {
			if (!wiredPackages.has(themeName)) continue;
			const id = this.loaderId(themeName, entryList);
			if (id !== null) rows.set(id, themeName !== name);
		}
		rows.set(targetId, false);
		writeAtomic(this.patchPath, replaceSection(text, renderRows(rows)));
	}
};
var DesktopSkinStateService = class extends Service {
	store;
	constructor(ctx) {
		super(ctx, "desktopSkinState");
		this.store = new DesktopSkinStateStore();
	}
	migrateLegacy(disabledNames, entries) {
		return this.store.migrateLegacy(disabledNames, entries);
	}
	disabledNames(themeNames, entries) {
		return this.store.disabledNames(themeNames, entries);
	}
	activateBundleTheme(name, themeNames, entries) {
		this.store.activateBundleTheme(name, themeNames, entries);
	}
};
//#endregion
//#region src/patch-registry.ts
const PATCH_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
function validateCompatPatchRegistry(entries) {
	if (!Array.isArray(entries) || entries.length === 0) throw new TypeError("compat patch registry must contain at least one entry");
	const ids = /* @__PURE__ */ new Set();
	for (const entry of entries) {
		if (entry === null || typeof entry !== "object" || !PATCH_ID.test(entry.id)) throw new TypeError("compat patch registry id is invalid");
		if (ids.has(entry.id)) throw new TypeError(`duplicate compat patch id: ${entry.id}`);
		ids.add(entry.id);
		if (!Array.isArray(entry.applicableVersions) || entry.applicableVersions.length === 0 || entry.applicableVersions.some((version) => typeof version !== "string" || !EXACT_VERSION.test(version))) throw new TypeError(`compat patch ${entry.id} must use exact applicable versions`);
		for (const field of [
			"reason",
			"upstreamReference",
			"test",
			"removeWhen"
		]) if (typeof entry[field] !== "string" || entry[field].trim().length < 8) throw new TypeError(`compat patch ${entry.id} has an invalid ${field}`);
		if (!ISO_DATE.test(entry.lastVerified)) throw new TypeError(`compat patch ${entry.id} has an invalid lastVerified date`);
	}
	return entries;
}
const DESKTOP_COMPAT_PATCHES = Object.freeze(validateCompatPatchRegistry([
	Object.freeze({
		id: "queued-turn-continuation",
		applicableVersions: Object.freeze(["0.1.0-rc.6"]),
		reason: "Resume a queued user turn after the active turn reaches a terminal status.",
		upstreamReference: "@deepseek-ai/dsh-agent 0.1.0-rc.6 agent/status public hook behavior",
		test: "packages/dsh-desktop-compat/tests/recovery.spec.ts",
		removeWhen: "The upstream agent loop natively and deterministically resumes queued turns.",
		lastVerified: "2026-08-18"
	}),
	Object.freeze({
		id: "cancellation-presentation",
		applicableVersions: Object.freeze(["0.1.0-rc.6"]),
		reason: "Translate the known object-shaped cancellation result into a stable user-facing message.",
		upstreamReference: "@deepseek-ai/dsh-tools 0.1.0-rc.6 tools/post-execute public hook behavior",
		test: "packages/dsh-desktop-compat/tests/recovery.spec.ts",
		removeWhen: "The upstream tool runtime returns a stable cancellation presentation contract.",
		lastVerified: "2026-08-18"
	}),
	Object.freeze({
		id: "desktop-skin-profile-isolation",
		applicableVersions: Object.freeze(["0.1.0-rc.6"]),
		reason: "Keep Desktop skin selection inside the isolated desktop profile patch.",
		upstreamReference: "@deepseek-ai/dsh 0.1.0-rc.6 profile and cordis patch behavior",
		test: "packages/dsh-desktop-compat/tests/skin-state.spec.ts",
		removeWhen: "The upstream skin service exposes a profile-scoped public persistence contract.",
		lastVerified: "2026-08-18"
	})
]));
//#endregion
//#region src/index.ts
const name = "desktop-compat";
const inject = ["tools"];
/** Install Desktop-only compatibility behavior through public DSH hooks. */
function apply(ctx) {
	new DesktopSkinStateService(ctx);
	const scheduleRecovery = createQueueRecoveryScheduler(queueMicrotask, (error) => {
		const detail = error instanceof Error ? error.message : String(error);
		ctx.logger?.warn?.(`dsh-desktop-compat: queued turn recovery failed: ${detail}`);
	});
	ctx.on("agent/status", ({ agent, status }) => {
		scheduleRecovery(agent, status);
	});
	ctx.on("tools/post-execute", async (exec, result, next) => {
		return normalizeCancellationDecision(exec, result, await next());
	});
}
//#endregion
export { DESKTOP_COMPAT_PATCHES, DesktopSkinStateService, DesktopSkinStateStore, FRIENDLY_CANCELLED_MESSAGE, SKIN_STATE_END, SKIN_STATE_START, apply, createQueueRecoveryScheduler, inject, name, normalizeCancellationDecision, recoverQueuedTurns, validateCompatPatchRegistry };
