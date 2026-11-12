# Nyxiri workspaces

Hyprland workspace numbers for the Nyxiri bar, forked from stock Omarchy's
`omarchy.workspaces` with three settings of its own:

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
  as the tooltip; a desktop entry named for the game resolves its real
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
`shell.json`, on the widget's own layout entry:

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

## Tests

```sh
./test.sh
```

`WorkspaceModel.js` is pure logic (mode, hide-empty, style, block math, app
icons) and is exercised by real node tests; the QML is checked structurally.
