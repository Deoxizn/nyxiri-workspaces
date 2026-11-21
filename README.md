# Nyxiri workspaces

Workspace numbers for the Nyxiri bar. Click a number to jump to that workspace. Click the one you're on to cycle the layout. Scroll over the row to move between workspaces.

## Install

```sh
omarchy plugin add https://github.com/Deoxizn/nyxiri-workspaces.git --enable
omarchy-shell shell rescanPlugins
omarchy bar put pizza.dirty.nyxiri-workspaces
```

Put it where the old workspaces widget was, then remove that one.

## Settings

Right-click any workspace cell to open settings. Or open the Nyxiri settings window from the bat icon on the bar and pick the **Workspaces** tab.

- **Mode** — how many workspaces show: `10`, `5`, or `active` (only ones with windows).
- **Style** — what each workspace shows: `numbers`, `kanji`, `pacman`, `dots`, `magic`, `default`, `aurora`, or `apps` (app icons instead of a marker).
- **Hide empty workspaces** — on or off.
- **Cycle layout on click** — on or off. On, clicking the workspace you're on switches tiling, scrolling, floating (same as Super + L).
- **App icon size** — 12–24, default 16. Only matters with the Apps style.

From the command line:

```sh
omarchy bar set pizza.dirty.nyxiri-workspaces style kanji
omarchy bar set pizza.dirty.nyxiri-workspaces mode 5
omarchy bar set pizza.dirty.nyxiri-workspaces hideEmpty true
omarchy bar set pizza.dirty.nyxiri-workspaces style apps
omarchy bar set pizza.dirty.nyxiri-workspaces iconSize 20 --json
```

## Classic workspaces

One shared set of workspaces 1–10 for all monitors, like Omarchy 4.0.6. Off by default. While it's on, each monitor shows part of that one set instead of its own block of ten.

One-time setup (only if you want Classic):

```sh
bash ~/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/scripts/setup-classic.sh
```

Then flip the **Classic workspaces** switch in settings. Or from the command line:

```sh
bash ~/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/bin/mode classic
bash ~/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/bin/mode 4.5
bash ~/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/bin/mode status
```

While Classic is on, **Workspaces per monitor** picks which workspaces each monitor shows, for example `DP-1:1-5,HDMI-A-1:6-10`. `0` means 10.
