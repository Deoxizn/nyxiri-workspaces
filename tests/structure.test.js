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
  assert.match(widget, /setting\("style", "numbers"\)/)
  assert.match(widget, /import "WorkspaceModel\.js" as Model/)
  assert.match(widget, /Model\.visibleIds\(root\.mode, root\.hideEmpty/)
  assert.match(widget, /Model\.markerFor\(root\.style, slot, shown, occupied\)/)
  assert.match(widget, /Model\.stateFor\(modelData, root\.workspaceValues, root\.activeWorkspaceId\(\)\)/)
  assert.match(widget, /active: shown/)
})

test("the focused cell gets a dark chip behind its marker, except in the default style", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /visible: shown && root\.style !== "default"/)
  assert.match(widget, /z: -1/)
  assert.match(widget, /Qt\.rgba\(0, 0, 0, 0\.28\)/)
})

test("shape styles draw rectangles and leave the label empty", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /shapeStyle: Model\.markerKind\(root\.style\) === "shape"/)
  assert.match(widget, /text: root\.shapeStyle \? "" : Model\.markerFor\(root\.style, slot, shown, occupied\)/)
  assert.match(widget, /fixedWidth: root\.vertical \? root\.barSize : Style\.space\(root\.shapeStyle \? 36 : 20\)/)
  // Default: Shibumi's halo (34/16 wide, 16 tall) and pill marker (26/8 wide, 8 tall).
  assert.match(widget, /visible: root\.style === "default"/)
  assert.match(widget, /width: Style\.space\(shown \? 34 : 16\)/)
  assert.match(widget, /width: Style\.space\(shown \? 26 : 8\)/)
  assert.match(widget, /height: Style\.space\(8\)/)
  // Aurora: Shibumi's thin pill bar (28/6/4 wide, 3/6/4 tall).
  assert.match(widget, /visible: root\.style === "aurora"/)
  assert.match(widget, /width: Style\.space\(shown \? 28 : occupied \? 6 : 4\)/)
  assert.match(widget, /height: Style\.space\(shown \? 3 : occupied \? 6 : 4\)/)
  assert.match(widget, /opacity: shown \? 0\.92 : occupied \? 0\.62 : 0\.18/)
  // Shape markers use the theme colors, accent on the focused cell.
  assert.match(widget, /Commons\.Color\.accent/)
  assert.match(widget, /Commons\.Color\.foreground/)
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
