# AGENTS.md

Harvest & Herald: The Great Commission — a 2D isometric ministry/discipleship
simulation. Plain HTML, CSS, and vanilla JavaScript on an HTML5 Canvas. No build
step for the web version.

## Layout

- `index.html` — the game. Loads classic (non-module) scripts in dependency order.
- `downloads.html` — public download page; links point at the `v1.0.0` release assets.
- `src/core/` — `iso` (projection), `utils`, `state` (save/load + meters), `game`
  (loop, input, every UI flow).
- `src/systems/` — `innerLife`, `preaching`, `encounters`, `discipleship`.
- `src/world/town.js`, `src/render/renderer.js`, `src/data/`, `src/ui/`.
- `styles/main.css` — game; `styles/downloads.css` — download page.
- `packaging/` — Android + Electron desktop builds. Output goes to `dist/`
  (gitignored; artifacts live in the GitHub Release).

## Conventions

- Scripts are ES5-flavored IIFEs attached to `window` (e.g. `(function(root){...})(window)`).
  Match that style; do not introduce ES modules.
- Player meters live at `state.meters` and are keyed `spirit`, `doctrine`,
  `compassion`, `burnout` — note `spirit` (Secret Place Overflow), not `secretPlace`.
- Modals are built with `Modal.open`; action buttons live in `.modal-foot`,
  content buttons in `.modal-body`. Scope DOM queries accordingly — the action bar
  buttons also exist in the document.

## Building

```bash
packaging/build-android.sh      # signed APK; needs JAVA_HOME (JDK 17) + ANDROID_HOME
packaging/build-desktop.sh      # linux win32 darwin; needs Node
```

Toolchains on this machine: `~/tools/jdk-17.0.21.1+2`, `~/tools/android-sdk`.

Two traps worth remembering:

- `electron-packager` needs Wine to target win32 from Linux (only to stamp the exe
  icon). The build script sidesteps it by assembling the official Electron zip.
- Python's `zipfile` follows symlinks by default. macOS `.app` bundles are mostly
  symlinks; following them bloated the zip to 168M and risked an unlaunchable
  bundle. `packaging/zipdir.py` stores real symlink entries and exec bits.

## Testing without a display

No X server, no user namespaces, no Wine, no dbus here. Electron still runs headless
with a userland Xvfb on `DISPLAY=:99` plus `--no-sandbox --disable-gpu`.
`/usr/bin/chromium` + `playwright-core` works for plain web pages (the download page).

## Releasing

Assets must be uploaded to the GitHub Release for the download links to work.
`https://github.com/Mubogi/harvest-and-herald/releases/latest/download/<name>`
