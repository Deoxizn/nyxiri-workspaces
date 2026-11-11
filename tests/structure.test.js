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

test("the focused cell gets a dark chip behind its marker", () => {
  const widget = read("BarWidget.qml")
  assert.match(widget, /visible: shown/)
  assert.match(widget, /z: -1/)
  assert.match(widget, /Qt\.rgba\(0, 0, 0, 0\.28\)/)
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
