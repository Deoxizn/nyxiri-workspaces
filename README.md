# Nyxiri workspaces

Hyprland workspace numbers for the Nyxiri bar, forked from stock Omarchy's
`omarchy.workspaces` with settings of its own:

- **Mode** — how many numbers show, Shibumi-style: **Ten** (the monitor's
  whole block of ten), **Five** (only the first five slots guaranteed), or
  **Active only** (just the workspaces Hyprland reports).
- **Hide empty workspaces** — drops workspaces with no windows from the row.
  The focused workspace always stays, even when it is empty, so you never
  lose your place.
- **Style** — what each workspace shows, after Shibumi-Shell's marker
  picker: **Numbers** (the slot, `0` for ten), **Kanji**
  (一二三四五六七八九十), **Pac-Man** (Pac-Man on the focused workspace, a
  ghost where windows live, a pellet on empty ones), **Dots** (filled for
  focused, ringed for occupied, hollow for empty), **Magic** (a star that
  fills, hollows, or shrinks to a pellet), **Default** (a soft halo behind
  every cell with a small pill marker inside), **Aurora** (a thin pill
  bar, wider and brighter on the focused workspace), or **Apps** (the icons
  of the apps running on the workspace instead of the marker: icons only,
  no numbers, no counts, one icon per app, six at most; empty workspaces
  keep their number, so the row stays clickable). Web apps opened from a
  link bind have no desktop file, so they use the site's favicon, fetched
  from Google's favicon service; if the fetch fails they show their first
  letter instead. A thin divider separates the cells, so two workspaces
  running the same app don't read as one. Steam/Proton games identify
  as `steam_app_...` with no desktop entry, so they show the window
  title's first letter instead (WoW shows W, not S) with the game name
  as the tooltip; a desktop entry named for the shortcut (`battlenet.desktop`
  for `steam_app_battlenet`) or for the game title resolves its real
  icon, and a library game with a numeric id uses the icon Steam cached
  in `librarycache`. Icons are display only:
  clicking a cell still focuses the workspace, and hovering a cell shows
  the app names. This is the small core of
  [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces):
  no agent status, no previews, no per-window click. The focused marker
  renders in the bar's active color, on a dark chip behind the cell so the
  active workspace stands out at a glance (shape styles carry their own
  focused signal instead of the chip: default's halo, aurora's wide bar).
  Numbers, kanji, Pac-Man, dots, magic, and apps are
  text; default and aurora are drawn shapes, so their cells are wider.

Anything else is stock behavior: click a marker to focus that workspace,
click the focused one to cycle its layout (same as Super + L), scroll over
the row to move between workspaces. Clicking still cycles the layout, but
the focused cell now shows the style's focused marker instead of the old
layout glyph.

## Classic workspaces

One global set of workspaces 1-10, as in Omarchy 4.0.6, instead of 4.5's
per-monitor blocks. The toggle lives in the settings card's **Workspaces**
tab (**Classic workspaces**); it runs `bin/mode`, which flips the flag
(`~/.local/state/omarchy/toggles/no-monitor-workspaces`) and reloads
Hyprland. The widget reads what Hyprland actually applied, from the
applied file the Lua writes, so the bar follows the real mode even if a
config error leaves the other one in place.

While classic is on, **Workspaces per monitor** pins which workspaces each
monitor shows, so a two-monitor setup can split the global set instead of
showing the same ten numbers twice:

```
DP-1:1-5,HDMI-A-1:6-10
```

`0` means 10, so `6-0` is 6-10. Entries split on whitespace or commas, a
single id works too (`DP-1:3`), and a monitor with no entry falls back to
the classic rule: 1-5 plus any other existing workspace up to 10, and
above 10 only one with windows. The focused workspace always joins its
monitor's row even when it falls outside that monitor's range. That field
is the *display* split: which numbers each bar shows. It does not move
workspaces. Super + 6 still opens workspace 6 on the focused monitor
unless the workspace is pinned to a monitor, and that pinning lives in
the two workspaces files the plugin ships, `hypr/workspaces.lua` (4.5)
and `hypr/workspaces-classic.lua` (classic): each one pins its
workspaces to their monitors with `default` and `persistent`, and holds
the app and game workspace assignments that used to live in
windowrules.lua. Only one is live at a time: the active mode's file is
`.lua` and the other is renamed to `.bak`, flipped by `bin/mode` on
every switch, so hyprland.lua loads just the one that matches the mode.
The setup script installs both files into `~/.config/hypr/` and wires
their loaders; edit the installed copies (or the plugin's, then
re-install) to change a pin. The card's ranges field is the display
split, the workspaces files are the Hyprland split, so keep them the
same.

Mode (Ten / Five / Active only) is just how many numbers show, not a
per-monitor split: Five shows the first five slots, it does not mean
five per monitor. The split is the ranges field above. The
toggle is also available from the command line:

```sh
bash ~/.config/omarchy/plugins/devi.nyxiri-workspaces/bin/mode classic
bash ~/.config/omarchy/plugins/devi.nyxiri-workspaces/bin/mode 4.5
bash ~/.config/omarchy/plugins/devi.nyxiri-workspaces/bin/mode status
```

The plugin id is `devi.nyxiri-workspaces`. The widget paints no background
of its own; the bar's pill is the background, so pill transparency applies
to it like everything else.

## Install

```sh
omarchy plugin add https://github.com/Deoxizn/nyxiri-workspaces.git --enable
omarchy-shell shell rescanPlugins
omarchy bar put devi.nyxiri-workspaces
```

`omarchy plugin add` is the install: it clones a real checkout (so
`omarchy plugin update` works), validates the manifest, and `--enable`
switches the plugin on. `scripts/install.sh` in this repo is just a
wrapper around that command. Live-edit with `scripts/install.sh --link`
instead, but note a symlinked install always fails `omarchy plugin
update` validation: Omarchy's validator refuses symlinks inside a
plugin folder.

Put it where the old workspaces widget was, then remove that one from the
bar. Requires the [Nyxiri bar](https://github.com/Deoxizn/nyxiri) for the
settings card; without it the widget still works with the defaults (Ten,
numbers, empty workspaces shown) and the settings are editable in
`shell.json`, on the widget's own layout entry.

Classic mode needs one extra one-time step: Hyprland has to load the
bundled Lua and the two workspaces files. The plugin ships a script that
installs `hypr/workspaces.lua` and `hypr/workspaces-classic.lua` into
`~/.config/hypr/`, appends the dofile block to the end of
`~/.config/hypr/hyprland.lua` (backing it up first), skips itself if the
block is already there, and reloads Hyprland:

```sh
bash ~/.config/omarchy/plugins/devi.nyxiri-workspaces/scripts/setup-classic.sh
```

After that, the Classic toggle in the settings card switches modes on its
own; nothing else needs editing. Without that step the widget still works
in 4.5 mode, and the Classic toggle does nothing (the mode script waits
for the applied file the Lua writes, then gives up and puts the flag
back).

```sh
omarchy bar set devi.nyxiri-workspaces style kanji
omarchy bar set devi.nyxiri-workspaces mode 5
omarchy bar set devi.nyxiri-workspaces hideEmpty true
omarchy bar set devi.nyxiri-workspaces style apps
omarchy bar set devi.nyxiri-workspaces iconSize 20 --json
```

## Settings

Right-click the bar to open the Nyxiri settings card, **Workspaces** tab
(it only offers controls while this widget is on the bar):

- **Mode** — Ten / Five / Active only.
- **Style** — Numbers / Kanji / Pac-Man / Dots / Magic / Default / Aurora / Apps.
- **Hide empty workspaces** — on or off.
- **App icon size** — 12–24px, default 16. Only shows in the card while
  the Apps style is picked; it does nothing in the other styles. The
  `bar set` example above needs `--json`, or the value lands as a string
  (the widget accepts both, the card slider writes a number).
- **Classic workspaces** — on or off. One global set 1-10 instead of 4.5's
  per-monitor blocks; the switch reloads Hyprland and takes a second or
  two. Needs the Lua loaded (see Install), or the toggle does nothing.
- **Workspaces per monitor** — only shows while classic is on.
  `DP-1:1-5,HDMI-A-1:6-10` pins which workspaces each monitor shows; `0`
  means 10. A monitor with no entry falls back to the classic rule.

## Tests

```sh
./test.sh
```

`WorkspaceModel.js` is pure logic (mode, hide-empty, style, block math, app
icons) and is exercised by real node tests; the QML is checked structurally.
