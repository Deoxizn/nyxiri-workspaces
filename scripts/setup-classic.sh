#!/usr/bin/env bash
# One-time setup for Classic workspaces: appends the dofile block that loads
# this plugin's hypr/classic-workspaces.lua to the end of hyprland.lua (if it
# is not already there), backs hyprland.lua up first, and reloads Hyprland.
# After this, the Classic toggle in the settings card switches modes on its
# own; nothing else needs editing. Run it with bash (pushes land mode 644):
#   bash ~/.config/omarchy/plugins/devi.nyxiri-workspaces/scripts/setup-classic.sh
set -euo pipefail

conf="$HOME/.config/hypr/hyprland.lua"
marker="-- BEGIN devi.nyxiri-workspaces"
if grep -Fq -- "$marker" "$conf" 2>/dev/null; then
  echo "Classic workspaces block already in $conf; nothing to do."
else
  cp "$conf" "$conf.bak.$(date +%s)"
  cat >> "$conf" <<'LUA'
-- BEGIN devi.nyxiri-workspaces
do
  local path = os.getenv("HOME") .. "/.config/omarchy/plugins/devi.nyxiri-workspaces/hypr/classic-workspaces.lua"
  local file = io.open(path, "r")
  if file then file:close(); dofile(path) end
end
-- END devi.nyxiri-workspaces
LUA
  echo "Added Classic workspaces block to $conf (backup made)."
fi
hyprctl reload
hyprctl configerrors
echo "Done. Switch modes in the settings card, Workspaces tab."
