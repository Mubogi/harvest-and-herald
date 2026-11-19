# Harvest &amp; Herald: The Great Commission

A playable 2D isometric ministry, evangelism, and discipleship simulation that runs entirely in the browser. No build step, no dependencies, no framework — plain HTML, CSS, and vanilla JavaScript on an HTML5 Canvas.

You are a gospel worker in a diverse town district. Walk the neighborhoods, listen before you speak, preach with a heart that has actually been in the Secret Place, and stay with the people who respond until they are rooted enough to carry it themselves.

## Download and play

Play in the browser, or install a native build. Both run fully offline and keep your
progress on your own device.

| Platform | Build | Notes |
| --- | --- | --- |
| Any modern browser | [Play now](index.html) | Nothing to install |
| Android 6+ | [APK](https://github.com/Mubogi/harvest-and-herald/releases/latest/download/HarvestAndHerald-1.0.0.apk) | ~75 KB, installs as an app |
| Windows 10+ | [ZIP](https://github.com/Mubogi/harvest-and-herald/releases/latest/download/HarvestAndHerald-1.0.0-windows-x64.zip) | Portable, unzip and run |
| macOS 11+ | [ZIP](https://github.com/Mubogi/harvest-and-herald/releases/latest/download/HarvestAndHerald-1.0.0-macos-x64.zip) | Portable `.app` bundle |
| Linux x64 | [ZIP](https://github.com/Mubogi/harvest-and-herald/releases/latest/download/HarvestAndHerald-1.0.0-linux-x64.zip) | Portable, `chmod +x` the binary |

All builds are unsigned. Your OS will warn the first time; the install notes on
[`downloads.html`](downloads.html) cover how to allow each one.

## Run it

Because the game is split into ES5-style modules loaded by `<script>` tags, any static file server works.

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

Opening `index.html` directly with `file://` also works in most browsers, but a local server avoids any file-protocol quirks.

## Build the native packages

Each platform build is scripted and produces artifacts in `dist/`:

```bash
packaging/build-android.sh                 # signed APK (needs JDK 17 + Android SDK 34)
packaging/build-desktop.sh                 # Linux, Windows, macOS zips (needs Node)
packaging/build-desktop.sh linux           # or pick specific targets
```

The desktop builds wrap the same web bundle in Electron, so `index.html` remains the
single source of truth for the game.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / arrow keys | Step one tile |
| Click a tile | Walk there (clicking a person walks to them and starts the conversation) |
| `E` or `Enter` | Talk to / disciple whoever is nearby |
| `P` | Prepare and deliver a message |
| `R` | Prayer Room (the Secret Place) |
| `F` | Follow-Up and discipleship roster |
| `K` | Preacher's Heart Check |
| `Space` | Pause / resume the clock |

`?seed=1234` in the URL generates a specific district, so a town can be shared or replayed.

## The two lives you are living

The game's whole argument is that the outer ministry is drawn from an inner reservoir, and that faking one while neglecting the other eventually shows.

**Inner life (built only in private)**

- **Secret Place Overflow** — grows through prayer, fasting, and repentance. Every sermon and counseling conversation spends it. Preach without returning to the Secret Place and your words thin out into noise.
- **Biblical Depth & Sound Doctrine** — grows through careful study. Guards against misquoting Scripture and collapsing when a skeptic asks a real question.
- **Humility & Compassion** — the fruit that decides whether hardened people come closer or walk away. Being right with a cold heart still empties a room.
- **Burnout / Pride** — climbs when you chase applause, skip rest, neglect family, or argue in anger.

**Outer ministry (what it produces)**

- **Souls Discipled & Established** — not just decisions, but people who grow into rooted, reproducing believers.

## What you actually do

**Counseling encounters.** Every townsperson carries a real need — grief, pride, deception, religious legalism, addiction, or fear — and the game deliberately hides which one at first. Each encounter runs three steps: listen, discern, then respond. Truth without timing wounds. Grace without content leaves people where they were. Harsh answers are punished even when the doctrine is correct.

**Public preaching.** Compose a message from three parts that all matter: prayer preparation, a Scripture theme, and your heart motive. The preview shows projected power and integrity before you stand up. Deliver it and watch the crowd split into repentant, moved, curious, unmoved, and hostile — driven by your actual meters rather than the size of the crowd. Deep themes need deep doctrine; shallow doctrine produces misquotes, and misquotes get remembered.

**Follow-up.** A convert is a newborn, not a disciple. New believers decay on a timer unless someone mentors them. You can personally carry three; past that you must delegate to believers who have grown enough to teach others (2 Timothy 2:2). Ignore them and they drift.

**Heart Check.** At milestones the game stops and asks you the uncomfortable questions a ministry team should ask — who did you lead to Christ and then leave alone, what text have you been teaching that you have not obeyed.

## Project layout

```
index.html              markup and script load order
styles/main.css         all styling
src/
  main.js               boot
  core/
    utils.js            helpers: clamp, RNG, DOM, formatting
    iso.js              isometric projection
    state.js            game state, save/load, time advance
    game.js             the main loop, input, and all player actions
  data/
    scriptures.js       themes, verses, motives, preparation options
    people.js           townspeople, needs, and encounter scripts
    questions.js        the hard questions asked after preaching
  world/town.js         town generation, zones, collision
  systems/
    innerLife.js        prayer, fasting, repentance, study, rest, family, service
    encounters.js       counseling session resolution and outcome gates
    preaching.js        message composition, power projection, crowd response
    discipleship.js     believer stages, mentoring, neglect drift
  ui/
    hud.js              inner-life and ministry meters
    log.js              ministry log with Scripture reminders
    modals.js           modal plumbing
  render/renderer.js    isometric canvas rendering, townspeople, icons
```

All modules attach to `window` and are loaded in dependency order by `index.html`. There is no bundler and no transpiler; the code is plain ES5-compatible JavaScript with `'use strict'` per module.

## Saving

Save and Load write to `localStorage` under `harvest-and-herald.save.v1`. Saves are per-browser and per-origin.

## Scripture

The game is built around 1 Corinthians 9:27 (discipline yourself while you preach to others), 1 Timothy 4:16 (watch your life and doctrine closely), and Colossians 4:5-6 (speech full of grace, seasoned with salt). Every log entry carries a verse reminder, including 1 Corinthians 13:1 for the times your eloquence outruns your love.

Scripture quotations are paraphrased or lightly adapted for gameplay; check the actual text in your own Bible.

## License

MIT — see [LICENSE](LICENSE).
