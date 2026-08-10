# Changelog

## 1.0.2

A hotkey has to let go of its own keys. Both bugs below are the same mistake at opposite ends of a
correction: ZyntaxAI synthesises Ctrl+C to read your selection and Ctrl+V to put the result back,
and it did both while the modifiers of the hotkey you had just pressed were still held down. The
application on the other end sees Ctrl+Alt+C, or Ctrl+Shift+V — which are not copy and paste.

### Fixed

- **"Selected text" did nothing on Windows and macOS unless you copied the text first.** Neither
  platform has an X11-style primary selection, so a selection can only be read by synthesising a
  copy — and that copy never reached the application. What you got instead was a correction of
  whatever happened to be on your clipboard. The modifiers are now released before the copy, and the
  hotkey fires when you let it go rather than the moment you press it. Linux was never affected: it
  reads the primary selection directly and never takes this path.
- **The correction was not applied if you were still holding the hotkey when it arrived.** This one
  hit every platform, and a fast model made it near-certain — a local Ollama answers in about
  250 ms, long before anyone lifts a finger. The correction completed, the notification appeared,
  and the document was left exactly as it was. The modifiers are now released before the paste too.
- A selection that cannot be read is reported as "nothing was selected" instead of quietly
  correcting your clipboard instead. Detection no longer depends on the clipboard *changing*, so
  correcting a selection identical to something you copied earlier works.
- The clipboard is left exactly as it was after reading a selection, including when the read fails.
- The clipboard is held for 250 ms rather than 60 ms after a paste, so applications that ask for its
  contents late — Electron apps and browsers — no longer race the restore and paste the wrong thing.

## 1.0.0

ZyntaxAI is a complete rewrite of [Grammar Fixer](https://github.com/TheHolyOneZ/GrammarFixer)
1.5.2. Nothing was ported: the C#/WPF application was replaced by a Rust and TypeScript one on
Tauri 2, and every feature was re-derived from what it was *for* rather than from how it was built.

### Feature parity with Grammar Fixer 1.5.2

Every feature of the archived application is present. Some arrive in a different shape, noted below.

| Grammar Fixer 1.5.2 | ZyntaxAI |
|---|---|
| Global customizable hotkey | Yes. Default changed to `Ctrl+Alt+G` — `Ctrl+Alt+T` is the standard "open terminal" binding on most Linux desktops |
| AI grammar correction | Yes |
| Fast / Normal / Detailed speeds | Yes. The token budget is now a floor rather than a cap (see below) |
| Input source: selection or clipboard | Yes. Selection is read directly where the platform allows, with no synthetic copy |
| Output: Replace / Copy / Append / Prepend / Popup | Yes. "Show in popup" is now the **default** interaction, not one mode of five |
| 5 built-in personas | Yes — Standard, Friendly, Professional, Concise, Creative |
| Custom personas: add / edit / remove | Yes |
| Automatic language detection | Yes |
| Target language + translate toggle | Yes |
| Custom languages: add / edit / remove | Yes |
| API key entry, encrypted at rest | Yes — OS keychain, with an encrypted-file fallback. The key is never sent to the UI |
| API key visibility toggle | Yes |
| "Get API key" link | Yes, per provider |
| Model selection + docs link | Yes. Model lists are fetched live rather than hardcoded |
| Compact ⇄ advanced view toggle | Replaced by the two-surface split: the tray and overlay *are* the compact surface |
| Window transparency slider | Yes, and it now applies to the overlay too |
| Dark theme | Yes, plus a light theme and a "match my system" option |
| Window size/position persistence | Yes |
| System tray, minimize to tray | Yes |
| Start with OS, start minimized | Yes — Windows registry, XDG autostart, and macOS LaunchAgent |
| `--minimized` flag | Yes |
| Desktop notifications | Yes. Failures are always shown, whatever the setting |
| Sound on fix | Yes, using your desktop's own notification sound |
| Auto-copy fixed text | Yes |
| Fix history, stats, clear history | Yes |
| Token usage + cost estimation | Yes — today / 7d / 30d / all time, priced **per model** rather than at one blended rate |
| Debug window | Replaced by a Logs panel inside settings |
| Rolling log files | Yes |
| Actionable 401 / 429 / 500 errors | Yes, as typed errors that each carry a remedy |

### Added

- **Cross-platform.** Windows, Linux (X11 and Wayland) and macOS, from one codebase.
- **Three providers.** Google Gemini, any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq,
  LM Studio, vLLM) and local Ollama — which needs no API key and works offline.
- **A diff before you commit.** The overlay shows a word-level diff of what changed, so you can see
  the correction before it touches your document. Deletions are one click away.
- **Capability detection.** The app probes what the session actually permits and says so, naming
  what to install when something is unavailable rather than failing silently.
- **Cancellation.** Pressing the hotkey during a correction abandons the first request instead of
  queueing another.
- **`zyntax fix`.** A second launch drives the running instance, so Wayland compositors without a
  shortcuts portal can bind a key natively.
- **A master switch.** One toggle in the app and in the tray menu that stops the hotkey doing
  anything at all. Checked before the selection is even read, so with it off no text leaves your
  screen and nothing reaches a provider. The hotkey stays registered on purpose — it answers
  "ZyntaxAI is off" rather than going dead, which is indistinguishable from a broken app.
- **A custom titlebar.** The window is frameless with its own controls, drag region and resize
  edges, which is also what makes real window transparency possible.
- **Light theme** and a "match my system" option.

### Fixed

Defects carried over from the archived application, fixed structurally rather than by care:

- **Corrections were silently truncated.** The speed presets capped output at 512/1024/2048 tokens,
  which cut off any correction longer than the budget — roughly 350 words in Fast mode. The preset
  is now a floor, the budget scales with the input, and a model that still hits its ceiling returns
  an explicit error instead of half a sentence.
- **The selected language could be dropped from the request** (the bug fixed in 1.5.2). Prompt
  assembly is now a pure function covered by snapshot tests, so a regression shows up as a diff in
  review.
- **Cost was under-reported.** Input and output tokens were priced at one blended rate; they are now
  priced separately and per model, and an unpriced model is marked rather than counted as free.
- **The clipboard was destroyed** when used as scratch space to move text. It is now restored.
- **Leading and trailing whitespace was lost**, so a pasted correction could join onto the preceding
  word. The selection's own surrounding whitespace is now preserved.
- **Usage history lived in the settings file**, so the whole file was rewritten on every correction
  and period totals scanned everything ever recorded. History is now SQLite with indexed aggregates.
- **A hotkey taken by another application failed silently.** Registration failures are now reported
  in the Hotkeys panel, naming the conflict.
- **Text between the delimiters could be read as instructions.** The prompt now states explicitly
  that the selection is data, never a command to follow.
- **Notifications crashed a worker thread on Linux.** `tauri-plugin-notification` ends its `show()`
  with `tauri::async_runtime::spawn(async { notification.show() })`, and on Linux that inner call is
  `notify-rust` → `zbus::block_on`, which builds its own Tokio runtime. Nested inside ours that
  panics with "Cannot start a runtime from within a runtime". Because the plugin schedules the work
  onto the runtime itself, no calling thread avoids it — `spawn_blocking` fails too, since Tokio's
  blocking pool still carries runtime context. Linux now calls `notify-rust` directly from a plain
  OS thread; Windows and macOS keep the plugin, where no zbus is involved.
- **Every external link silently did nothing.** The capability granted
  `opener:allow-open-url`, which enables the command but deliberately carries *no URL scope*, so
  every call was refused by the scope check. `opener:allow-default-urls` — a separate permission —
  is what actually permits `http`/`https`. Both are now granted.
- **The opacity slider was frozen and only darkened the window.** Its value was bound to the saved
  setting, which changed only on release, so the thumb could not move and the readout sat at 100%.
  Separately, CSS opacity over an opaque window blends toward the window's own background rather
  than revealing what is behind it. The window is now frameless and transparent, so the setting
  genuinely makes the desktop show through, and the slider tracks a local value while dragging.
- **Both an OS titlebar and the app's own were drawn.** `tauri-plugin-window-state` defaults to
  `StateFlags::all()`, which persists `DECORATIONS`; a state file written while the window was
  decorated kept restoring `decorated: true` and silently overrode `tauri.conf.json`. The plugin now
  persists geometry only.
- **A bad Gemini API key gave useless advice.** Gemini reports an invalid key as HTTP **400**, not
  401, so it mapped to "rejected as invalid — report it with the log" instead of "check your key".
  Found by testing against the live API; mocks had encoded the assumed 401.
- **An unknown model produced broken English** — *"the model 'the selected model' is not
  available"*. Gemini's 404 body names the model unquoted (`models/<name> is not found`), which the
  extractor could not parse, so it fell back to a placeholder rendered inside quotes. Both the
  parser and the fallback wording are fixed.
- **macOS could never replace text.** The Accessibility check returned a hardcoded `false`, so
  in-place replacement stayed disabled even after the user granted permission, with no way to
  recover short of editing the settings file. It now asks the system via `AXIsProcessTrusted`.
- **Style personas barely changed the output.** The task line read "correct spelling, grammar,
  punctuation and capitalisation" for every persona, anchoring the model to minimal edits so that
  Creative came back indistinguishable from Standard. The task now names the style section and
  states that rewriting is expected where the style calls for it.

### Licensing

ZyntaxAI is released under the **GNU General Public License v3.0 or later**, replacing the MIT
licence the archived project used. Anyone distributing it, modified or not, must pass on the same
freedoms and provide source under the same terms.

### Security and privacy

- API keys live in the OS keychain (Windows Credential Manager, Secret Service, macOS Keychain).
  Where no keychain exists, an AES-256-GCM encrypted file is used and the UI says so plainly.
- The key is never sent to the frontend; the UI only learns whether one exists.
- Corrected text is never written to disk. History stores counts, token totals and timings only.
- No telemetry, and no network access beyond the provider you configure.
