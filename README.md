<div align="center">

<img src="base.png" alt="" width="104" height="104">

# ZyntaxAI

**Correct, rewrite and translate text anywhere on your desktop — with one hotkey.**

Select text in any application, press the hotkey, and see exactly what changed before it touches
your document. Point it at a hosted model or one running entirely on your own machine.

[**Download**](https://zsync.eu/zyntaxai/) · [Features](#features) ·
[Platform support](#platform-support) · [Privacy](#privacy) ·
[Build from source](#building-from-source)

<img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square" alt="Version 1.0.0">
<img src="https://img.shields.io/badge/licence-GPL--3.0--or--later-6b7280?style=flat-square" alt="Licence GPL-3.0-or-later">
<img src="https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS-6b7280?style=flat-square" alt="Windows, Linux and macOS">

</div>

<br>

<img src="assets/screenshots/overlay.png" alt="A correction shown over a text editor, with the changed words highlighted">

<br>

ZyntaxAI is a ground-up rewrite of [Grammar Fixer](https://github.com/TheHolyOneZ/GrammarFixer), which
was Windows-only, hardcoded to a single AI provider, and built on a backend that resisted testing or
extension. This version is Rust and TypeScript on Tauri 2. It runs on all three desktop platforms,
works with three different kinds of provider — including a fully local one — and shows you the
correction before it is applied rather than after.

---

## How it works

<table>
<tr>
<td width="33%" valign="top">

**1 · Select**

Highlight text in any application — your editor, your browser, a chat window, a form field.
Nothing is copied and your clipboard is left alone.

</td>
<td width="33%" valign="top">

**2 · Press**

<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>G</kbd>, or whatever you have bound. The correction runs where
you configured it — a cloud model, or one on your own machine.

</td>
<td width="33%" valign="top">

**3 · Review**

The overlay appears at your cursor with a word-level diff. Apply it, copy it, switch persona, retry,
or dismiss it with <kbd>Esc</kbd>. Nothing is changed until you say so.

</td>
</tr>
</table>

Prefer it invisible? Set the output mode to replace, append, prepend or copy, and the correction is
applied straight away with no overlay at all.

---

## Download

Current release: **1.0.0**, from [zsync.eu/zyntaxai](https://zsync.eu/zyntaxai/).

| Platform | File | Notes |
|---|---|---|
| **Windows** | `.msi` | Windows 10 and 11 |
| **Linux** | `.AppImage` | Runs anywhere; the only Linux build that can update itself in place |
| **Linux** | `.deb` / `.rpm` | For Debian, Ubuntu, Fedora and relatives |
| **macOS** | `.dmg` | One for Apple silicon, one for Intel |

Then open **Providers**, pick a provider and add a key — or select Ollama if you already have it
running and want to keep everything on your own machine.

---

## Features

Everything ZyntaxAI does, panel by panel.

### Hotkeys

The key combination that corrects your selected text, anywhere on your desktop.

<img src="assets/screenshots/hotkeys.png" alt="The Hotkeys panel">

- **Any combination you like**, captured by pressing it rather than typed out
- **At least one modifier is required**, so a hotkey can never fire while you are typing
- **Suggestions that are known to be free** on Windows, macOS and the common Linux desktops
- **Conflicts are reported, not swallowed** — if another application already owns the combination,
  the panel says so instead of leaving you with a key that quietly does nothing
- **Pressing it during a correction cancels that correction** rather than queueing a second one
- The default is <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>G</kbd>, deliberately not
  <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>T</kbd>, which most Linux desktops use to open a terminal

### Behavior

What happens when you press the hotkey.

<img src="assets/screenshots/behavior.png" alt="The Behavior panel">

- **Processing depth** — Fast, Normal or Detailed: how much latitude the model has to rewrite rather
  than only fix errors
- **Where the text comes from** — your selection, or the clipboard
- **What happens to the result** — show it first in the overlay, replace the selection, copy it,
  append it, or prepend it
- **Also copy the correction**, whatever else happens to it
- **Desktop notifications** for corrections applied without the overlay; failures are always shown
  whatever the setting
- **A sound on success**, using your desktop's own notification sound
- **Keep running in the tray** when the window is closed, or quit outright
- **Record corrections** — powers the fix count and the Usage panel, and can be turned off entirely.
  Only counts and token totals are stored; your text is never written to disk

### Personas

The writing style applied on top of grammar correction.

<img src="assets/screenshots/personas.png" alt="The Personas panel">

- **Five built-in personas** — Standard, Friendly, Professional, Concise and Creative, each with
  instructions you can read before you pick one
- **Your own personas**, with free-form instructions — a house style, a tone for one particular
  client, a voice for a game character
- **Create, edit and delete** your own; the built-in five cannot be broken
- **Switchable from the overlay** without leaving the correction you are looking at

### Languages

The language corrections come back in, and whether to translate.

<img src="assets/screenshots/languages.png" alt="The Languages panel">

- **Automatic detection** by default — the correction comes back in the language you wrote it in
- **Thirteen built-in languages** to target explicitly, from English and German to Japanese and
  Chinese
- **Translate into the selected language**, correcting and translating in a single pass
- **Add your own** by name and tag, for anything not in the list

### Providers & models

Which AI service corrects your text. You can switch at any time.

<img src="assets/screenshots/providers.png" alt="The Providers panel">

| Provider | Key required | Notes |
|---|---|---|
| **Google Gemini** | Yes | A free tier is available and is enough for everyday use |
| **OpenAI-compatible** | Yes | OpenAI, OpenRouter, Groq, LM Studio, vLLM — set the endpoint |
| **Ollama** | No | Runs entirely on your machine. No key, no network, and your text never leaves the computer |

- **Live model lists**, fetched from the provider rather than hardcoded, so they never go stale
- **API keys in your OS keychain** — Windows Credential Manager, Secret Service, macOS Keychain —
  with an AES-256-GCM encrypted file where no keychain exists, and the panel says which is in use
- **The key is never sent to the interface**; it only ever learns whether one exists
- **Show/hide toggle** while typing a key, and a direct link to the provider's console to get one
- **A custom endpoint** for anything speaking the OpenAI API
- **Errors that name the cause and the fix** — a rejected key, a rate limit with its retry window, a
  model that does not exist, a server that is down, a request that timed out

### Appearance

How ZyntaxAI looks on your desktop.

<img src="assets/screenshots/appearance.png" alt="The Appearance panel">

- **Dark, light, or match your system**
- **Window opacity**, applied to both this window and the correction overlay, so your desktop
  genuinely shows through rather than the window merely darkening

### Usage & costs

Token consumption and estimated spend, computed at each model's own price.

<img src="assets/screenshots/usage.png" alt="The Usage panel">

- **Today, 7 days, 30 days and all time** — corrections and tokens for each
- **Tokens per day** across the last month
- **A breakdown by model**, with its provider, fix count, tokens and cost
- **Prices you set per model**, separately for input and output tokens, in your own currency
- **Unpriced models are marked as such** rather than silently counted as free

### System

Start-up and desktop integration.

<img src="assets/screenshots/system.png" alt="The System panel">

- **Start with your computer** — Windows registry, XDG autostart or a macOS LaunchAgent, whichever
  your platform uses
- **Start hidden in the tray**, so logging in leaves you with the hotkey and nothing else
- **Signed updates**, checked once at start-up and installed only when you choose to
- **What this session can and cannot do** — display server, whether your selection can be read,
  whether text can be replaced in place, and whether the hotkey reached the system
- **Clear correction history**, which removes the fix count and every usage record

### Logs

What ZyntaxAI has been doing. Useful when something did not behave as expected.

<img src="assets/screenshots/logs.png" alt="The Logs panel">

- **A live stream** of what the application is doing, at the level you would want when something
  goes wrong
- **Follow new entries**, or scroll back without being dragged to the bottom
- **Rolling files on disk** as well, so a problem that happened yesterday is still there
- **Clear** whenever you like

### About

<img src="assets/screenshots/about.png" alt="The About panel">

- Version, licence, and where the project lives
- **Exactly where your data is** — settings, history and logs, by path
- A plain statement of what is stored and what is not

### The window itself

- **Group the sidebar however you think** — create your own groups, rename them, drag panels between
  them, collapse what you never touch, and reset the lot if you regret it
- **A status line that is always there** — the master switch, your fix count and when the last one
  ran, at the foot of the sidebar
- **Its own titlebar**, so the window is frameless on every platform and can be genuinely
  transparent
- **Size and position remembered** between runs, without dragging back the decorations you turned
  off

### The tray

<img src="assets/screenshots/tray.png" alt="The tray menu" width="360">

- **A master switch**, in the tray and in the window, that stops the hotkey doing anything at all.
  It is checked before your selection is even read, so with it off no text leaves your screen
- **Correct clipboard text** without touching a selection
- The hotkey stays registered on purpose — it answers "ZyntaxAI is off" rather than going dead,
  which is indistinguishable from a broken application

### The overlay

<img src="assets/screenshots/overlay-removed.png" alt="The overlay with deletions shown">

- **A word-level diff**: additions highlighted inline, deletions on request
- **Switch persona and retry** without starting over
- **Apply**, **Copy**, or dismiss with <kbd>Esc</kbd>
- **Tokens used and how long it took**, so cost and latency are never a mystery
- Appears at your cursor rather than in the middle of your primary monitor, sized to its content,
  and nudged so it always lands fully on screen

---

## Platform support

Every feature is available on Windows and on Linux under X11. Wayland restricts what any application
is allowed to do to another window, so a few things there depend on your compositor.

| | Windows | macOS | Linux · X11 | Linux · Wayland |
|---|---|---|---|---|
| Global hotkey | Yes | Yes | Yes | Via the desktop portal, else bind `zyntax fix` yourself |
| Read your selection | Yes | Needs Accessibility permission | Yes, directly | Where the compositor supports it |
| Replace text in place | Yes | Needs Accessibility permission | Yes | Needs `wtype` or `ydotool` |
| Install updates in place | Yes | Yes | AppImage only | AppImage only |

Where something is unavailable the app says so in **System**, names what to install, and falls back
to putting the correction on your clipboard. It never fails silently.

If your compositor has no global-shortcuts portal, bind a key to `zyntax fix` in its own
configuration and the running instance will pick it up.

macOS is built and tested by CI on every commit but has not yet been run on real hardware; treat it
as best-effort until it has.

---

## Privacy

The text you correct is sent to whichever provider you configure, over HTTPS, and to nothing else.
It is never written to disk. History records counts, token totals and timings — never content.
Choose Ollama and nothing leaves your machine at all.

There is no telemetry and no analytics. The only network access besides your provider is the update
check: a plain request for a static file on zsync.eu, carrying nothing about you or your computer,
and switchable off in **System**.

API keys are held in your operating system's keychain, never in a configuration file, and are never
handed to the user interface.

## Updates

ZyntaxAI checks for a new version when it starts and mentions it quietly in **System**. It never
interrupts you and never installs anything on its own.

Every download is verified against a public key compiled into the binary; an update that fails that
check is discarded rather than installed. Where the app cannot safely replace itself — a `.deb` or
`.rpm` install, which the package manager owns — it offers the download page instead of trying.

---

## Building from source

Requires [Rust](https://rustup.rs) 1.85+, [Node](https://nodejs.org) 20+, [pnpm](https://pnpm.io) 10+
and the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your platform. On
Debian or Ubuntu:

```sh
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

```sh
git clone https://github.com/TheHolyOneZ/ZyntaxAI.git
cd ZyntaxAI
pnpm install

pnpm tauri dev      # run it
pnpm tauri build    # installers land in target/release/bundle
```

Build through `pnpm tauri`, not `cargo` directly: a plain `cargo build --release` leaves out Tauri's
`custom-protocol` feature, so the binary looks for the dev server instead of its embedded frontend
and opens a window that never paints.

<details>
<summary><b>AppImage bundling fails on Arch and other rolling distributions</b></summary>

<br>

`linuxdeploy` bundles a 2024-era `binutils`, whose `strip` cannot parse the `.relr.dyn` sections
that current Arch system libraries contain. It fails with `unknown type [0x13] section '.relr.dyn'`.

Skip the stripping step:

```sh
NO_STRIP=1 pnpm tauri build
```

The AppImage is larger as a result. `.deb` and `.rpm` are unaffected, and CI builds on Ubuntu do not
hit this.

</details>

<details>
<summary><b>Cutting a release</b></summary>

<br>

There is no release server. The app fetches one static `latest.json` and verifies every artifact it
downloads against the public key in `src-tauri/tauri.conf.json`.

```sh
TAURI_SIGNING_PRIVATE_KEY=/path/to/updater.key \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD= \
pnpm release --notes "What changed"
```

That builds the current platform, collects the installers into `dist/release/<version>/` and writes
that platform's entry into `dist/release/latest.json`. Windows and macOS are built by the **Release**
workflow (`Actions → Release → Run workflow`), which signs them with the same key from repository
secrets and attaches everything to a draft GitHub release. A draft is readable only by people with
write access to the repository, and creates no tag, so nothing reaches the public even though the
repository is. The build jobs upload straight to that draft and never to an Actions artifact —
artifacts on a public repository can be downloaded by anyone.

Each platform arrives as one `zyntaxai-<target>.zip` on the draft release. Drop those in `Builds/`,
then `node scripts/site-sync.mjs Builds dist/release` unpacks them and merges everything into
`zyntaxai/` — installers into `releases/<version>/`, every platform entry into one `latest.json`,
and a fresh `SHA256SUMS`.
Upload the release files before the manifest, or clients are told about a build that is not there
yet.

The variable is `TAURI_SIGNING_PRIVATE_KEY`, not `..._PATH`; the latter is a Tauri 1 name that the
current CLI ignores while still producing a bundle, silently unsigned. The script fails the run if no
signature ends up beside an artifact.

The full walkthrough, including what `latest.json` is and how the signature check works, is in
[`zyntaxai/PUBLISHING.md`](zyntaxai/PUBLISHING.md).

</details>

<details>
<summary><b>Project layout and tests</b></summary>

<br>

```sh
cargo test --workspace                                  # Rust tests
cargo clippy --workspace --all-targets -- -D warnings   # lints
pnpm typecheck                                          # TypeScript
pnpm test                                               # frontend tests
```

CI runs all four on Ubuntu, Windows and macOS for every push, then bundles installers for all three.

The layout separates what can be tested from what needs a desktop:

```
crates/
  zyntax-core/       domain model, prompt building, diff — no I/O at all
  zyntax-providers/  Gemini, OpenAI-compatible and Ollama behind one trait
  zyntax-platform/   hotkeys, selection capture, text injection, capability detection
  zyntax-store/      settings, OS keychain, SQLite history
src-tauri/           a thin shell: IPC commands, windows, tray
apps/desktop/        React 19 + TypeScript frontend
```

TypeScript types for the IPC boundary are generated from the Rust structs by
[`ts-rs`](https://github.com/Aleph-Alpha/ts-rs) during `cargo test`, and committed so the frontend
builds from a fresh clone. CI regenerates them and fails if they have drifted.

Provider behaviour is tested against a mock HTTP server, so the full request and response handling —
auth failures, rate limits, truncation and malformed payloads — runs in CI without any API key.

</details>

---

## Licence

[GNU General Public License v3.0 or later](LICENSE).

In short: you are free to use, study, share and modify ZyntaxAI. If you distribute it — modified or
not — you must pass on those same freedoms and make your source available under the same licence.

<div align="center">
<br>

**[Download](https://zsync.eu/zyntaxai/)** · [Source](https://github.com/TheHolyOneZ/ZyntaxAI) ·
[More projects](https://zsync.eu) · [Author](https://github.com/TheHolyOneZ)

<sub>Built with Rust, Tauri and React · © 2026 TheHolyOneZ</sub>

</div>
