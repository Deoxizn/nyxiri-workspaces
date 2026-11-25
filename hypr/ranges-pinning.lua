-- Ranges pinning for Classic workspaces (nyxiri-workspaces, nyx).
--
-- The settings card's "Workspaces per monitor" field
-- ("DP-4:1-5,HDMI-A-2:6-0", 0 means 10) is a widget setting in
-- ~/.config/hexciri/shell.json. Until now nothing ever turned it into
-- Hyprland state: hypr/workspaces-classic.lua only ships a generic
-- 1-10 loop, its monitor pinning is a commented-out example, and the
-- widget's ranges only filter what the bar *shows* (and the focused
-- workspace always joins anyway). So on dokoz, Classic on, ranges set,
-- Hyprland still ran 4.5 blocks: HDMI-A-2 block 0 (ws 2) and DP-4
-- block 1 (ws 11), both outside their ranges.
--
-- This file closes that gap, classic mode only (it returns early
-- unless the classic flag file exists):
--   1. Emits hl.workspace_rule pinning every ranged id to its monitor,
--      so a ranged workspace is created / shown on that monitor.
--   2. Settles the workspaces that already exist, on hyprland.start
--      and config.reloaded: a workspace whose id belongs to another
--      monitor's range is moved there, and a workspace above 10 is
--      renumbered into a free slot in its monitor's range first
--      (mirroring o.workspaces.compact, but range-aware; compact alone
--      only renumbers when a 1-10 slot is free anywhere, and knows
--      nothing about ranges).
-- Loaded by scripts/setup-classic.sh's loader block, after
-- classic-workspaces.lua. A ranges edit while already in classic
-- needs a `hyprctl reload` to take effect (the settings card runs one
-- on ranges commit, see the QML change); switching modes reloads
-- anyway, so bin/mode needs no change.
--
-- Ranges are read straight from shell.json with a plain string match:
-- only the workspaces plugin stores a "ranges" key, so the first
-- match is its value. No JSON parser, no new dependency.

local paths = require("default.hypr.paths")

local state_home = paths.state_home or (os.getenv("HOME") .. "/.local/state")
local flag_path = state_home .. "/hexciri/toggles/no-monitor-workspaces"

local function file_exists(path)
  local f = io.open(path, "r")
  if not f then return false end
  f:close()
  return true
end

-- Classic mode only: without the flag, Omarchy 4.5 per-monitor blocks
-- run untouched and ranges must not pin anything.
if not file_exists(flag_path) then
  return
end

local function read_file(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local content = f:read("*a")
  f:close()
  return content
end

-- "DP-4:1-5,HDMI-A-2:6-0" -> { ["DP-4"] = {1,2,3,4,5},
--                               ["HDMI-A-2"] = {6,7,8,9,10} }
-- 0 means 10. Malformed tokens are dropped, like WorkspaceModel.js
-- parseRanges, which this mirrors.
local function parse_ranges(text)
  local out = {}
  if not text or text == "" then return out end
  for token in string.gmatch(text, "[^%s,]+") do
    local name, spec = string.match(token, "^([^:]+):(.+)$")
    if name and spec then
      local ids = {}
      local lo_s, hi_s = string.match(spec, "^(%d+)%-(%d+)$")
      if lo_s and hi_s then
        local lo, hi = tonumber(lo_s), tonumber(hi_s)
        if lo == 0 then lo = 10 end
        if hi == 0 then hi = 10 end
        if lo and hi and lo >= 1 and hi <= 10 and lo <= hi then
          for id = lo, hi do ids[#ids + 1] = id end
        end
      else
        local single = tonumber(spec)
        if single == 0 then single = 10 end
        if single and single >= 1 and single <= 10 then
          ids[#ids + 1] = single
        end
      end
      if #ids > 0 then
        local list = out[name] or {}
        for _, id in ipairs(ids) do
          local seen = false
          for _, have in ipairs(list) do if have == id then seen = true end end
          if not seen then list[#list + 1] = id end
        end
        table.sort(list)
        out[name] = list
      end
    end
  end
  return out
end

local shell_json = read_file(os.getenv("HOME") .. "/.config/hexciri/shell.json") or ""
local ranges_text = string.match(shell_json, '"ranges"%s*:%s*"([^"]*)"') or ""
local ranges = parse_ranges(ranges_text)
local monitor_for = {}
for monitor, ids in pairs(ranges) do
  for _, id in ipairs(ids) do monitor_for[id] = monitor end
end

if next(monitor_for) == nil then
  return
end

-- 1. Pin every ranged id to its monitor.
for id, monitor in pairs(monitor_for) do
  hl.workspace_rule({
    workspace = tostring(id),
    monitor = monitor,
    default = true,
    persistent = true,
  })
end

-- 2. Settle workspaces that already exist.
local function settle()
  for _, workspace in ipairs(hl.get_workspaces() or {}) do
    if workspace and not workspace.special and workspace.id and workspace.id > 0 then
      local id = workspace.id
      local monitor = monitor_for[id]
      if id > 10 then
        -- Renumber into a free slot in its own range first. The slot
        -- the id maps to ((id-1)%10+1) is tried first, then the range
        -- in order; if the range is full, leave the workspace alone.
        local slot = (id - 1) % 10 + 1
        local target = nil
        local range_monitor = monitor_for[slot]
        if range_monitor then
          for _, candidate in ipairs(ranges[range_monitor]) do
            if not hl.get_workspace(candidate) then target = candidate break end
          end
          if not target and not hl.get_workspace(slot) then target = slot end
        end
        if target then
          hl.dispatch(hl.dsp.workspace.change_id({
            workspace = tostring(id), id = target,
          }))
          id = target
          monitor = monitor_for[id]
        end
      end
      if monitor and workspace.monitor and workspace.monitor.name ~= monitor then
        hl.dispatch(hl.dsp.workspace.move({
          workspace = tostring(id), monitor = monitor,
        }))
      end
    end
  end
end

hl.on("hyprland.start", settle)
hl.on("config.reloaded", settle)
