#!/usr/bin/env bash
# One-time setup for Classic workspaces. Wires the loaders into
# hyprland.lua and sets which workspaces file is live:
#   bash ~/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/scripts/setup-classic.sh
# What it does, all idempotent, then reloads Hyprland:
#   1. Appends one dofile block to hyprland.lua (backing it up first)
#      that loads the plugin's hypr/classic-workspaces.lua and your two
#      workspaces files, ~/.config/hypr/workspaces.lua (4.5) and
#      ~/.config/hypr/workspaces-classic.lua (classic). Each load is
#      guarded, so a missing file is skipped. An old block (classic Lua
#      only) is replaced. The workspaces files ship in this plugin,
#      written from your own config: the script installs them into
#      ~/.config/hypr/ if they aren't there yet (your edits to the
#      installed copies are left alone; delete one to re-install it
#      from the plugin).
#   2. Sets which workspaces file is live from the current mode: the
#      active mode's file stays .lua, the other is renamed to .bak.
#      bin/mode flips them on every switch, so exactly one loads.
#   3. Removes the old generated classic-workspaces-pinning.lua,
#      superseded by the two workspaces files.
# After this, the Classic toggle in the settings card switches modes on
# its own; nothing else needs editing. Run it with bash (pushes land
# mode 644).
set -euo pipefail

hypr_dir="$HOME/.config/hypr"
conf="$hypr_dir/hyprland.lua"
marker="-- BEGIN pizza.dirty.nyxiri-workspaces"
flag="${XDG_STATE_HOME:-$HOME/.local/state}/omarchy/toggles/no-monitor-workspaces"
plugin_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 0. Install the two workspaces files from the plugin (copy if missing).
for f in workspaces.lua workspaces-classic.lua; do
  if [[ -f $hypr_dir/$f || -f $hypr_dir/${f%.lua}.bak ]]; then
    echo "Already installed: $hypr_dir/$f (or its .bak); left alone."
  else
    cp "$plugin_dir/hypr/$f" "$hypr_dir/$f"
    echo "Installed $hypr_dir/$f."
  fi
done

# 1. Loader block in hyprland.lua (classic Lua + both workspaces files).
if grep -Fq -- "$marker" "$conf" 2>/dev/null; then
  if grep -Fq -- ".config/hypr/workspaces.lua" "$conf"; then
    echo "Classic workspaces block already in $conf; nothing to do."
  else
    cp "$conf" "$conf.bak.$(date +%s)"
    sed -i '/-- BEGIN pizza.dirty.nyxiri-workspaces/,/-- END pizza.dirty.nyxiri-workspaces/d' "$conf"
    echo "Removed the old loader block from $conf (backup made)."
  fi
fi
if ! grep -Fq -- "$marker" "$conf" 2>/dev/null; then
  cat >> "$conf" <<'LUA'
-- BEGIN pizza.dirty.nyxiri-workspaces
do
  local path = os.getenv("HOME") .. "/.config/omarchy/plugins/pizza.dirty.nyxiri-workspaces/hypr/classic-workspaces.lua"
  local file = io.open(path, "r")
  if file then file:close(); dofile(path) end
end
do
  local path = os.getenv("HOME") .. "/.config/hypr/workspaces.lua"
  local file = io.open(path, "r")
  if file then file:close(); dofile(path) end
end
do
  local path = os.getenv("HOME") .. "/.config/hypr/workspaces-classic.lua"
  local file = io.open(path, "r")
  if file then file:close(); dofile(path) end
end
-- END pizza.dirty.nyxiri-workspaces
LUA
  echo "Added Classic workspaces block to $conf."
fi

# 2. Only the active mode's workspaces file is .lua; the other is .bak.
if [[ -f $flag ]]; then
  [[ -f $hypr_dir/workspaces.lua ]] && mv "$hypr_dir/workspaces.lua" "$hypr_dir/workspaces.bak"
  [[ -f $hypr_dir/workspaces-classic.bak ]] && mv "$hypr_dir/workspaces-classic.bak" "$hypr_dir/workspaces-classic.lua"
else
  [[ -f $hypr_dir/workspaces-classic.lua ]] && mv "$hypr_dir/workspaces-classic.lua" "$hypr_dir/workspaces-classic.bak"
  [[ -f $hypr_dir/workspaces.bak ]] && mv "$hypr_dir/workspaces.bak" "$hypr_dir/workspaces.lua"
fi

# 3. The generated pinning file is superseded by the two workspaces files.
rm -f "$hypr_dir/classic-workspaces-pinning.lua"

hyprctl reload
hyprctl configerrors
echo "Done. Switch modes in the settings card, Workspaces tab."
