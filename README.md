# Nyxiri workspaces

Hyprland workspace numbers for the Nyxiri bar, forked from stock Omarchy's
`omarchy.workspaces` with two settings of its own:

- **Mode** — how many numbers show, Shibumi-style: **Ten** (the monitor's
  whole block of ten), **Five** (only the first five slots guaranteed), or
  **Active only** (just the workspaces Hyprland reports).
- **Hide empty workspaces** — drops workspaces with no windows from the row.
  The focused workspace always stays, even when it is empty, so you never
  lose your place.
- **Style** — what each workspace shows: **Numbers** (the slot, `0` for ten),
  **Kanji** (一二三四五六七八九十), **Pac-Man** (Pac-Man on the focused
  workspace, a ghost where windows live, a pellet on empty ones), or
  **Dots** (filled for focused, ringed for occupied, hollow for empty).
  The focused marker renders in the accent color.

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
empty workspaces shown) and the settings are editable in `shell.json`.

## Settings

Right-click the bar to open the Nyxiri settings card, **Workspaces** tab
(it only offers controls while this widget is on the bar):

- **Mode** — Ten / Five / Active only.
- **Style** — Numbers / Kanji / Pac-Man / Dots.
- **Hide empty workspaces** — on or off.

## Tests

```sh
./test.sh
```

`WorkspaceModel.js` is pure logic (mode, hide-empty, block math) and is
exercised by real node tests; the QML is checked structurally.
