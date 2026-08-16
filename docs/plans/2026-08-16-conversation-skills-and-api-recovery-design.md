# Conversation Skills and API recovery

## Scope

Desktop 2.0 adds a Skills library beside the conversation command button and strengthens transient model-provider recovery without modifying DeepSeek Harness source code.

The Skills surface is desktop-only runtime enhancement code mounted by the Electron shell after each Harness navigation. The API recovery policy uses the official `@deepseek-ai/dsh-llm-retry` boundary already supplied by `@deepseek-ai/dsh-base`; it does not replay arbitrary browser requests or commands.

## Skills entry and menu

The shell locates the current `[data-composer-card="true"]` and its semantic `button[aria-label="命令"]`, then mounts a 28-pixel Skills button immediately after it. The button copies the current command-button class so native theme, hover and disabled geometry stay aligned, while desktop CSS supplies its icon, active state, focus treatment and `技能库` tooltip.

The menu is a fixed-position, theme-aware listbox above the button. It is at most 320 pixels tall, supports wheel and scrollbar navigation, contains a sticky search field, and renders each skill name plus one truncated description and source label. Non-shadowed installed skills are read through the existing renderer-safe extension inventory IPC, deduplicated by name and sorted with recent selections first.

Click, Enter or Space toggles the menu. Arrow keys move the active option, Enter selects it, Escape closes it and restores focus. Outside pointer input, focus leaving the composer/menu, composer replacement and session navigation close it. Selecting a skill inserts `使用 {name} 技能：` at the textarea selection through the native value setter plus an `input` event, then focuses the composer and closes the menu. A read-only composer reports that a workspace must be selected instead of mutating DOM state.

## Recovery policy

Harness already reconnects its browser WebSocket streams with exponential backoff and retries transient LLM failures twice. Desktop 2.0 keeps those official mechanisms and supplies a stronger bounded normal policy for the direct DeepSeek route: four retries for empty response, rate limit, server, timeout, transport and prematurely closed stream failures, with 750 ms initial delay, 15 second maximum delay and 15 percent jitter.

Existing `llm-deepseek` or `llm-pi-ai` settings keep any user-authored `retryPolicy`. During profile preparation, Desktop adds the bounded policy only to configured provider profiles where the field is absent. Authentication, quota, invalid request, cancellation and other permanent failures are never retried. SSH, plugin installation, deletion and other side-effecting actions remain outside this policy.

## Failure handling and validation

Skill discovery failures become an in-menu error with a retry action. Empty search results and an empty installed catalog have distinct messages. The injected controller is idempotent, observes composer replacement, and disposes its observers and global listeners when the window closes.

Tests cover skill sorting/filtering/insertion helpers, idempotent mount markers, accessible roles and keyboard rules, retry-policy settings merges, profile patch output and preservation of explicit provider policies. Electron E2E verifies button placement, menu open/close, search, keyboard selection and screenshot geometry at the real Harness composer.
