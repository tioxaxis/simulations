# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TioX is a set of browser-based animated simulations for teaching Operations Management (queueing, Little's law, newsvendor, inventory, factory/face game, economies of scale, batching, surge). Licensed GPL-3.0-or-later; source files carry the GPL header. Deployed at tiox.org.

TioX stands for "Time is on (the) X-axis". The core teaching idea is that students watch the animation and, at the same moment, see the time-based graph of what's happening being drawn below it. Keep the stage and the graph in sync. The graph's x-axis is simulated time (`now / tioxTimeConv`).

The typical user is a professor demonstrating concepts live to a class. Professors who don't like the default scenarios set up their own; those are kept in that browser's localStorage and come back on reload. Moving them to another machine or browser, or giving them to students, is done with the copy-link button. Changes to the scenario-handling code must not lose a professor's saved scenarios.

Plain vanilla JavaScript using ES modules: no build step, no package manager, no linter, no test runner. Third-party libraries are vendored minified in `app/res/` (`jstat.min.js` for random distributions, `seedrandom.min.js`, which makes `Math.random()` seeded).

## Running

Serve the repo root over HTTP. You can't use `file://`, because ES modules and the `fetch` of the scenario JSON both need a server. The VS Code launch config expects Live Server on `http://localhost:5500`. Any static server works, for example `python3 -m http.server 5500`.

- `index.html#que`, `#lit`, `#nvp`, `#inv`, `#fac`, `#eos`, `#bat`, `#sur` open a single simulation. A bare `index.html` shows the directory page (`#dir`).
- `unittests/index.html` is an old, manual browser page for the `Heap`. It imports `../modules/utility.js`, which no longer exists (the code is now `app/mod/util.js`), so it is stale.

## Architecture

**Single page, hash routing.** `index.html` holds all markup. Its top `displayNone` section holds *generic templates* (play/reset box, `whole` 2-column wrapper, `stageWrapper` canvases, scenarios panel), plus an empty `<div id='<key>'>` for each simulation. `app/app.js` reads `location.hash` and lazily calls `<key>Start()` the first time a tab is shown. It keeps the instances in `omConcepts`, pauses the old tab on switch, and routes keyboard shortcuts (Space play/pause, B reset, arrows to move between scenarios, Enter/Escape for edit mode) to the active instance.

**Template cloning with key-suffixed ids.** `addDiv(key, toId, ...fromIds)` in `app/mod/params.js` deep-clones template nodes and appends `key` to every `id`. So code refers to elements as `'foreground' + key`, `'ULScenarioList' + key`, `'playButtonque'`, etc. A new element added to a template gets the suffix automatically. Look elements up with the suffix.

**Each simulation (`app/<key>/<key>.js`)** follows the same pattern (see `que.js`):
- `defineParams()` builds a `Map` of user inputs (`NumSlider`, `ArbSlider`, `Checkbox`, `RadioButtons`, `LegendButton`, `Description` from `app/mod/params.js`). Map keys are the scenario field names.
- `<key>HTML(usrInputs)` clones templates and appends each input's `.create(...)` DOM.
- A subclass of `OmConcept` (`app/mod/rhs.js`) sets `keyNames` and implements `localReset`, `localUpdateFromSliders`, `redoStagesGraph`, and `redrawBackground`.
- A `localUpdate(inp)` switch maps each param change onto the simulation (RV rates/CVs, rescheduling heap events via `heap.modify(...)`). It is triggered by a `localUpdate` CustomEvent on the simulation's root div.
- A `theSimulation` object holds the step objects (queues, machine centers) and the RVs.
- A `TioxGraph` subclass (`app/mod/graph.js`) with `GraphLine`s draws the chart. Legend toggles are `LegendButton` params named `leg0`, `leg1`, ...
- `export function <key>Start()` wires it all together and returns the instance.

**Shared modules (`app/mod/`)**
- `rhs.js`: `OmConcept` base class. It owns the discrete-event engine state (`now`, `frameNow`, `heap`, `frameSpeed`, `itemCollection`), the play/pause/reset loop, and the scenarios panel (list, edit, add/delete, copy-link export).
- `stepitem.js`: simulation building blocks: `Queue`, `MachineCenter`, `InfiniteMachineCenter`, `WalkAndDestroy`, `Combine`, `Item`/`Person`, stick figures, `ItemCollection`/`ResourceCollection`.
- `util.js`: RVs (`GammaRV`, `UniformRV`, `DeterministicRV`, ...), `Heap` (event queue), stats (`Average`, `Thruput`, `IRT`), `StageOnCanvas`, `cbColors`, `tioxSpeeds`.
- `params.js`: the current parameter/input-widget classes plus `addDiv`, `genPlayResetBox`, and `match(inps, keys)`.
- `genHTML.js`: the **legacy** predecessor of `params.js`. The imports of it in every simulation are commented out. Use `params.js`.

**Page layout.** Each simulation uses the cloned `whole` 2-column wrapper. The left column (`leftHandSideBox`) holds the animation stage (upper; two stacked canvases, `foreground` for moving items and `background` for static scenery), a stats line, and the chart (lower). The right column holds the sliders, the play/reset/speed controls, and the scenarios list.

**Animation loop and time model.** The redraw is *not* an event on the simulation heap. `OmConcept.eachFrame` (`app/mod/rhs.js`) is driven by `requestAnimationFrame`, roughly every 16 ms at 60 Hz. Each frame:
1. It advances `frameNow` by real elapsed time × `frameSpeed`, capping the real gap at 100 ms.
2. It pulls and runs every heap event (`{time, proc, item}`) with `time <= frameNow`, setting `now` to each event's time. Arrivals, service completions, etc. are scheduled with `heap.push` (most of it inside `stepitem.js`).
3. It clears the foreground canvas and calls `itemCollection.moveDisplayAll(deltaSimuTime)` and `resourceCollection.drawAll()`, so people and boxes move along their paths between events.

The graph is *not* redrawn per frame. Simulation event handlers add points as things happen, such as `que.graph.push(...)` when a person leaves the queue. When the speed is ∞ (`frameSpeed >= 100`), `fullSpeedSim` runs events to the end of the graph's current x-range in one go and covers the stage (`coverAnimation`). Each simulation defines its own module-level `tioxTimeConv` (1000 or 10000). Rates shown in the UI are per `tioxTimeConv` ms of simulated time, so rates are divided by `tioxTimeConv` when set on RVs, and times are divided by it before graphing. `doc/startofdocs.txt` explains this (its file names are out of date).

**Random variables.** Most simulations expose arrival rate/CV and service rate/CV sliders, and generate times with `GammaRV` (`app/mod/util.js`). `GammaRV`:
- takes a **rate**, not a mean, already divided by `tioxTimeConv`;
- uses shape = 1/CV² and scale = 1/(rate·shape), so the mean is 1/rate and the coefficient of variation equals CV;
- samples by inverse CDF, `jStat.gamma.inv(p, shape, scale)`, with `p` from the seeded `Math.random()` (or a per-RV seed from `setSeed`);
- is deterministic (always the mean) when CV = 0, returns `tioxInfinity` when rate = 0 (e.g. a "coffee break" with no service), and never returns less than `minimumTime` (1).

On a slider change, the simulation's `localUpdate` calls `setRate`/`setCV` and then `heap.modify(...)` to reschedule the pending event with a fresh sample. Exceptions: `lit` takes a service *time* (`st`, so it is built with `1/st`); `inv` uses a Gamma lead time; `nvp` uses `DiscreteUniformRV` demand; `fac`, `bat` and `sur` use `DeterministicRV`.

**Scenarios** (all in `OmConcept`, `app/mod/rhs.js`).
- *Contents.* A scenario is a flat object of string values with one entry per `usrInputs` key: the model sliders plus `speed`, `action` (`none`/`play`/`pause`), `reset` (bool), `leg0..n` (graph legend visibility) and `desc` (the displayed name).
- *Presenter remote.* Scenarios work like slides. The design maps four functions onto the four keys nearly every presentation remote sends. In `keyDownFunction` (`app/app.js`): PageDown/PageUp (or the arrows) are next/previous scenario, Space is play/pause, and B (the "blank screen" button) is reset. Per scenario, `reset` and `action` decide what the next click does: keep running with the new parameters (`action: none`), pause, or restart from time 0 (`reset: true`, usually with `action: play`). Keep these key bindings working.
- *Selecting a scenario* (click, or the remote/arrow keys) runs `setSlidersFrom(row)`. It sets every input. Outside edit mode it also clicks reset if `reset=='true'` and then play or pause per `action`. It finally calls `localUpdateFromSliders` with the inputs that changed. Moving a slider outside edit mode deselects the current scenario; inside edit mode, `setOrReleaseCurrentLi` writes the new value into the selected scenario instead.
- *Editing* happens only in edit mode (the pencil button), which pauses the run:
  - add (`+`) copies the current slider values into a new row, named "X copy", "X copy 2", ...;
  - remove (`-`) deletes the selected row;
  - Enter or a double-click renames the selected row; an empty name becomes "(no name)".
- *Sorting and saving.* Every edit calls `saveEdit()`. It sorts the `<li>` rows by name (`innerHTML.localeCompare`, hence the A:, B:, ... prefixes) and writes the whole list to `localStorage['Tiox-<key>']`. Rows are *not* sorted on load, so keep each default JSON file in alphabetical order.
- *Loading.* At startup, `setupScenarios` takes the first of:
  1. the `?scenarios=` URL parameter, used only when the hash matches the key;
  2. `localStorage['Tiox-<key>']`;
  3. the default `app/<key>/<key>.json`, shaped `{"app":{"omConcept":{"key":..., "scenarios":[...]}}}`.

  Consequences: once a browser has saved scenarios, later edits to the default `.json` don't reach it until the user presses reset-scenarios. localStorage is per origin, so `localhost:5500` and `tiox.org` keep separate copies. Every value passes through each input's `verify()`. The reset-scenarios button removes the localStorage copy and reloads the list from the URL or the default file. `getlocalStoreAndParse` contains migration shims for older localStorage formats (`inv`: `which`→`method`; `lit`: `sr`→`st`). If you rename a scenario field, add a similar shim and update the default JSON.
- *Link export.* This is meant for a professor to send a custom set of scenarios to students by email or on the course website. The maintainer doesn't know of any professor actually using custom scenarios or links, and none has reported bugs, so don't go fixing latent problems here unprompted. Still, don't break the feature. **Links must keep working across deploys for at least a whole term.** The link button calls `sEncode`, which writes a compact binary base64 string. Each field is stored as its index in `keyNames` plus either a one-byte code from `inp.encode()` or a UTF-8 string of up to 127 bytes. The encoding warns above about 1500 bytes. Each code is a signed `Int8`, -128..127:
  - `NumParam`: value × 10^precision, where precision comes from `step`;
  - `ArbParam`/`RadioButtons`: an index into `values`;
  - `BoolParam`: 0 or 1.

  Things that break existing links:
  - reordering or removing `keyNames` entries (appending is safe);
  - changing a slider's `step` (which changes its scale);
  - reordering an `ArbParam`'s `values`;
  - any numeric max × scale above 127, which overflows `Int8`.

  When a link is decoded, a field it lacks gets that input's `deflt`. Decoded URL rows skip `verify()`.
- *Getting JSON out.* Alt+Shift+Cmd-clicking the link button copies the current scenarios as JSON in the default-file format. This is the way to author a new `<key>.json`.

**Colors.** Stage items and graph lines are chosen to work for the major types of color blindness while still looking normal to everyone else. Use `cbColors` from `app/mod/util.js` (blue, purple, red/magenta, orange, yellow, which match the IBM color-blind-safe palette, plus black and lightYellow) rather than new color literals. A few hard-coded named colors remain (e.g. `strokeStyle = 'blue'` for the `que` scanner, `'pink'`, greys). The maintainer wants to revisit the color choices later.

**Determinism.** `OmConcept`'s constructor calls `Math.seedrandom('this is a Simulation')`, so runs are reproducible.
