"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

function read(name) {
  return fs.readFileSync(path.join(__dirname, "..", name), "utf8")
}

test("the manifest declares the Nyxiri workspaces bar widget", () => {
  const manifest = JSON.parse(read("manifest.json"))
  assert.equal(manifest.id, "devi.nyxiri-workspaces")
  assert.deepEqual(manifest.kinds, ["bar-widget"])
  assert.equal(manifest.entryPoints.barWidget, "BarWidget.qml")
  assert.equal(manifest.barWidget.defaultSection, "left")
  assert.equal(manifest.barWidget.allowMultiple, false)
})

test("the widget reads mode, hideEmpty, and style from its layout entry", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /moduleName: "devi\.nyxiri-workspaces"/)
  assert.match(widget, /setting\("mode", "10"\)/)
  assert.match(widget, /setting\("hideEmpty", false\)/)
  // `bar set` stores booleans as strings without --json, so hideEmpty
  // accepts "true" as well as true.
  assert.match(widget, /setting\("hideEmpty", false\) === "true"/)
  assert.match(widget, /setting\("style", "numbers"\)/)
  assert.match(widget, /Model\.clampIconSize\(setting\("iconSize", 16\)\)/)
  assert.match(widget, /import "WorkspaceModel\.js" as Model/)
  assert.match(widget, /Model\.visibleIds\(root\.mode, root\.hideEmpty/)
  assert.match(widget, /Model\.markerFor\(root\.style, slot, shown, occupied, root\.perMonitorWorkspaces\)/)
  assert.match(widget, /readonly property var apps: root\.style === "apps" \? Model\.appsForWorkspace\(modelData, root\.workspaceValues\) : \[\]/)
  assert.match(widget, /Model\.stateFor\(modelData, root\.workspaceValues, root\.activeWorkspaceId\(\)\)/)
  assert.match(widget, /active: shown/)
})

test("the focused cell gets a dark chip behind its marker, except in shape styles", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /visible: shown && !root\.shapeStyle/)
  assert.match(widget, /z: -1/)
  assert.match(widget, /Qt\.rgba\(0, 0, 0, 0\.28\)/)
})

test("shape styles draw rectangles and leave the label empty", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /shapeStyle: Model\.markerKind\(root\.style\) === "shape"/)
  // WidgetButton hides itself when its text is empty, so a shape style
  // keeps the slot number as text and hides the label instead. Clearing
  // the text removed the whole widget.
  assert.match(widget, /text: root\.shapeStyle \? Model\.labelFor\(slot, root\.slots, root\.perMonitorWorkspaces\) : Model\.markerFor\(root\.style, slot, shown, occupied, root\.perMonitorWorkspaces\)/)
  assert.match(widget, /labelVisible: !root\.shapeStyle && !showAppIcons/)
  assert.doesNotMatch(widget, /text: root\.shapeStyle \? ""/)
  assert.match(widget, /fixedWidth: root\.vertical \? root\.barSize : Style\.space\(showAppIcons \? appCellSpan : \(root\.shapeStyle \? 36 : 20\)\)/)
  // Default: Shibumi's halo (34/16 wide, 16 tall) and pill marker (26/8 wide, 8 tall).
  assert.match(widget, /visible: root\.style === "default" && !showAppIcons/)
  assert.match(widget, /width: Style\.space\(shown \? 34 : 16\)/)
  assert.match(widget, /width: Style\.space\(shown \? 26 : 8\)/)
  assert.match(widget, /height: Style\.space\(8\)/)
  // Aurora: Shibumi's thin pill bar (28/6/4 wide, 3/6/4 tall).
  assert.match(widget, /visible: root\.style === "aurora" && !showAppIcons/)
  assert.match(widget, /width: Style\.space\(shown \? 28 : occupied \? 6 : 4\)/)
  assert.match(widget, /height: Style\.space\(shown \? 3 : occupied \? 6 : 4\)/)
  assert.match(widget, /opacity: shown \? 0\.92 : occupied \? 0\.62 : 0\.18/)
  // The orange stays on the focused cell only: occupied and empty
  // markers are the foreground, not the ink.
  assert.match(widget, /markerInk: shown \? \(root\.bar \? root\.bar\.urgent : Commons\.Color\.urgent\) : Commons\.Color\.foreground/)
  assert.match(widget, /color: markerInk/)
  assert.match(widget, /Qt\.rgba\(markerInk\.r, markerInk\.g, markerInk\.b, 0\.25\)/)
  // Shape styles are not dimmed a second time through the button, or
  // empty cells vanish and both shape styles read the same.
  assert.match(widget, /opacity: root\.shapeStyle \? 1 : \(occupied \|\| shown \? 1 : 0\.5\)/)
})

test("style apps renders one icon per app, icons only, and nothing else from Spaces", () => {
  const widget = read("BarWidget.qml")
  // The app id comes from the Wayland app id, else the IPC class.
  assert.match(widget, /toplevel\.wayland && toplevel\.wayland\.appId/)
  assert.match(widget, /ipc\["class"\]/)
  // Icons resolve through the desktop entries and the icon theme.
  assert.match(widget, /DesktopEntries\.byId\(/)
  assert.match(widget, /DesktopEntries\.heuristicLookup\(appId\)/)
  assert.match(widget, /Quickshell\.iconPath\(icon, true\)/)
  // The cell shows a row of icons with a letter fallback, the marker hidden.
  assert.match(widget, /readonly property var apps: root\.style === "apps" \? Model\.appsForWorkspace\(modelData, root\.workspaceValues\) : \[\]/)
  assert.match(widget, /readonly property bool showAppIcons: apps\.length > 0/)
  assert.match(widget, /tooltipText: showAppIcons/)
  assert.match(widget, /Model\.appLabel\(info\.name, a\.appId\)/)
  assert.match(widget, /Model\.fallbackLetter\(info\.name, modelData\.appId\)/)
  // No agent status, no previews, no per-window click: icons are display
  // only, the click still focuses the workspace.
  assert.doesNotMatch(widget, /agent/i)
  assert.doesNotMatch(widget, /preview/i)
  assert.doesNotMatch(widget, /focusWindow|activateWindow/)
  // Web apps with no desktop entry use the site's favicon; a failed
  // fetch falls back to the letter.
  assert.match(widget, /Model\.webAppHost\(appId\)/)
  assert.match(widget, /s2\/favicons\?domain=/)
  assert.match(widget, /iconImage\.status === Image\.Error/)
  // Icon size scales the cell, the icon, and its decode size.
  assert.match(widget, /apps\.length \* \(root\.iconSize \+ 2\) \+ 8/)
  assert.match(widget, /Style\.space\(root\.iconSize\)/)
  assert.match(widget, /sourceSize\.width: root\.iconSize \* 2/)
  // Apps style only: a thin divider between cells, none after the last.
  assert.match(widget, /visible: root\.style === "apps" && !root\.vertical && index < root\.workspaceIds\(\)\.length - 1/)
  assert.match(widget, /visible: root\.style === "apps" && root\.vertical && index < root\.workspaceIds\(\)\.length - 1/)
  assert.match(widget, /height: parent\.height \* 0\.55/)
  assert.match(widget, /width: parent\.width \* 0\.55/)
  // A Steam/Proton game has no desktop entry under its steam_app id, so
  // the title is the label (WoW shows "W", not "S"), a desktop entry
  // named for the game resolves its real icon, and a numeric library
  // game uses the icon Steam cached.
  assert.match(widget, /DesktopEntries\.heuristicLookup\(title\)/)
  assert.match(widget, /Model\.steamAppId\(appId\)/)
  assert.match(widget, /librarycache\//)
  assert.match(widget, /_icon\.jpg/)
  assert.match(widget, /if \(\/\^steam_app_\/\.test\(appId\) && title\) name = String\(title\)/)
  // The old showApps boolean is gone: apps is a style now.
  assert.doesNotMatch(widget, /showApps/)
})

test("the widget has no layout-glyph machinery left", () => {
  const widget = read("BarWidget.qml")
  assert.doesNotMatch(widget, /modeGlyph/)
  assert.doesNotMatch(widget, /modeProc/)
  assert.doesNotMatch(widget, /ShellIpc/)
  assert.doesNotMatch(widget, /activeMode/)
})

test("the widget paints no pill background of its own", () => {
  const widget = read("BarWidget.qml")
  assert.doesNotMatch(widget, /Rectangle \{[^}]*color: (Style|Util|root)/)
  assert.doesNotMatch(widget, /BorderSurface/)
})

test("the widget keeps stock focus, scroll, and layout-cycle behavior", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /o\.workspaces\.focus\(/)
  assert.match(widget, /scrollWorkspaces/)
  assert.match(widget, /cycleLayout/)
  assert.match(widget, /Hyprland\.refreshWorkspaces\(\)/)
})

test("install.sh defaults to omarchy plugin add", () => {
  const install = read("scripts/install.sh")
  assert.match(install, /omarchy plugin add "\$workspaces_repo" --enable/)
  assert.match(install, /devi\.nyxiri-workspaces/)
  // The usage heredoc must be quoted, or backticks inside it would execute.
  assert.match(install, /cat <<'USAGE'/)
})

test("classic mode ships the Lua, the mode script, and its i18n catalog", () => {
  const lua = read("hypr/classic-workspaces.lua")
  assert.match(lua, /o\.classic_workspaces = \{ move_layouts = move_layouts \}/)
  assert.match(lua, /record\("classic"\)/)
  assert.match(lua, /fabiopbarbieri\/omarchy-classic-workspaces/)
  const mode = read("bin/mode")
  assert.match(mode, /no-monitor-workspaces/)
  assert.match(mode, /classic-workspaces\/applied/)
  assert.match(mode, /hyprctl reload/)
  const catalog = JSON.parse(read("i18n/en.json"))
  assert.equal(typeof catalog["notify.classic"], "string")
  assert.equal(typeof catalog["notify.perMonitor"], "string")
})

test("the setup script appends the Lua loader once, backs up, and reloads", () => {
  const setup = read("scripts/setup-classic.sh")
  assert.match(setup, /-- BEGIN devi\.nyxiri-workspaces/)
  assert.match(setup, /hypr\/classic-workspaces\.lua/)
  assert.match(setup, /grep -Fq -- "\$marker" "\$conf"/)
  assert.match(setup, /\.bak\.\$\(date \+%s\)/)
  assert.match(setup, /hyprctl reload/)
  assert.match(setup, /hyprctl configerrors/)
})

test("the widget reads the applied mode and the flag, and ranges from its layout entry", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /setting\("ranges", ""\)/)
  assert.match(widget, /Model\.parseRanges\(root\.ranges\)/)
  assert.match(widget, /omarchy\/classic-workspaces\/applied/)
  assert.match(widget, /omarchy\/toggles\/no-monitor-workspaces/)
  assert.match(widget, /property bool perMonitorWorkspaces: true/)
  assert.match(widget, /Model\.visibleIds\(root\.mode, root\.hideEmpty, root\.block, root\.workspaceValues, root\.activeWorkspaceId\(\), root\.monitorName, root\.perMonitorWorkspaces, root\.range\)/)
  assert.match(widget, /if \(name === "configreloaded"\)/)
  assert.match(widget, /appliedScope\.reload\(\)/)
  assert.match(widget, /workspaceScope\.reload\(\)/)
  // Classic focus is a plain Hyprland focus by id, not the block-aware one.
  assert.match(widget, /if \(!root\.perMonitorWorkspaces\) \{\s*root\.dispatch\("hl\.dsp\.focus/)
})
