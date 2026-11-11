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
  every cell with a small pill marker inside), or **Aurora** (a thin pill
  bar, wider and brighter on the focused workspace). The focused marker
  renders in the bar's active color, on a dark chip behind the cell so the
  active workspace stands out at a glance (shape styles carry their own
  focused signal instead of the chip: default's halo, aurora's wide bar).
  Numbers, kanji, Pac-Man, dots, and magic are
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
```

## Settings

Right-click the bar to open the Nyxiri settings card, **Workspaces** tab
(it only offers controls while this widget is on the bar):

- **Mode** — Ten / Five / Active only.
- **Style** — Numbers / Kanji / Pac-Man / Dots / Magic / Default / Aurora.
- **Hide empty workspaces** — on or off.

## Tests

```sh
./test.sh
```

`WorkspaceModel.js` is pure logic (mode, hide-empty, style, block math) and is
exercised by real node tests; the QML is checked structurally.
