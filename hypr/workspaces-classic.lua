-- Workspace rules for Classic mode (one global set 1-10).
-- Installed by the plugin's scripts/setup-classic.sh into
-- ~/.config/hypr/, and loaded by hyprland.lua. Only live while this file
-- is .lua: bin/mode renames the other workspaces file to .bak on switch,
-- so exactly one of workspaces.lua / workspaces-classic.lua loads at a
-- time. Workspace assignments are not window rules: they live here, not
-- in windowrules.lua. No default_name glyphs: the bar's workspace
-- settings own the labels now.
--
-- This file ships as a template: the live rules below are generic (no
-- monitor or app names), and the personal setup is kept as commented
-- examples underneath. Uncomment an example and edit it for your own
-- monitors and apps; the installed copy in ~/.config/hypr/ is yours to
-- change, the plugin only installs it when it is missing.

-- Workspaces always exist, on whichever monitor they are opened on.
-- Pinning them to a monitor is personal, so that is an example below.
for i = 1, 10 do
    hl.workspace_rule({ workspace = tostring(i), default = true, persistent = true })
end

-- Example: monitor pinning, two monitors, 1-5 on the main display and
-- 6-10 on the second. Uncomment and edit the names and ranges for your
-- setup, and remove the generic loop above.
-- for i = 1, 5 do
--     hl.workspace_rule({ workspace = tostring(i), monitor = "DP-1", default = true, persistent = true })
-- end
-- for i = 6, 10 do
--     hl.workspace_rule({ workspace = tostring(i), monitor = "HDMI-A-1", default = true, persistent = true })
-- end

-- Example: app pins (classic ids). Uncomment and edit.
-- local workspaceApps = {
--     { match = { class = "^(brave-origin)$" },                 workspace = "1" },
--     { match = { class = "^(io\\.github\\.lgse\\.Strata)$" },  workspace = "2" },
--     { match = { class = "^(Spotify)$" },                      workspace = "3" },
--     { match = { class = "^(steam|battle\\.net\\.exe|net\\.lutris\\.Lutris|com\\.heroicgameslauncher\\.hgl|heroic|retroarch|minecraft-launcher)$" }, workspace = "4" },
--     { match = { class = "^(vesktop|discord)$" },              workspace = "6" },
-- }
-- for _, r in ipairs(workspaceApps) do
--     hl.window_rule({ match = r.match, workspace = r.workspace })
-- end

-- Example: webapp windows (brave --app=...). Uncomment and edit.
-- local workspaceWebapps = {
--     { host = "messenger\\.com",       title = "(?i)messenger", workspace = "7" },
--     { host = "muse\\.ai",             title = "(?i)^muse",     workspace = "8" },
--     { host = "gemini\\.google\\.com",  title = "(?i)^gemini",   workspace = "8" },
--     { host = "chatgpt\\.com",         title = "(?i)^chatgpt",  workspace = "8" },
--     { host = "xbox\\.com",            title = "(?i)^xbox",     workspace = "4" },
-- }
-- for _, r in ipairs(workspaceWebapps) do
--     hl.window_rule({ match = { class = "^brave-(www\\.)?" .. r.host .. "__.*$" }, workspace = r.workspace })
--     hl.window_rule({ match = { class = "^(brave-origin)$", title = r.title }, workspace = r.workspace })
-- end

-- Example: gaming, everything on workspace 4. Uncomment and edit.
-- hl.window_rule({ match = { content = "game" }, workspace = "4" })
-- hl.window_rule({ match = { xdg_tag = "^(.*game.*)$" }, workspace = "4" })
-- hl.window_rule({ match = { class = "^(steam_app.*|gamescope)$" }, workspace = "4" })
-- hl.window_rule({ match = { class = "^(steam)$", title = "^(Launching\\.{3})$" }, workspace = "4" })
-- hl.window_rule({ match = { class = "^(steam_app.*)$", initial_title = "^$" }, workspace = "4" })
-- hl.window_rule({ match = { class = "^(steam_app_battlenet|battle\\.net\\.exe)$", title = "negative:^(World of Warcraft)$" }, workspace = "4" })
-- hl.window_rule({ name = "world-of-warcraft", match = { class = "^(steam_app_battlenet)$", title = "^(World of Warcraft)$" }, workspace = "4" })
