"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const Model = require("./_load-model.js")

// Two monitors' worth of Hyprland workspaces, in the plain shape the widget
// maps live values into. Monitor DP-1 owns block 0 (1-10); HDMI-A-1 owns
// block 1 (11-20). Workspace 3 has windows; 1 and 7 are empty on DP-1;
// 12 has windows on HDMI-A-1; 13 is a guest, a block-1 workspace showing
// on DP-1.
const VALUES = [
  { id: 1, windowCount: 0, monitorName: "DP-1" },
  { id: 3, windowCount: 2, monitorName: "DP-1" },
  { id: 7, windowCount: 0, monitorName: "DP-1" },
  { id: 11, windowCount: 0, monitorName: "HDMI-A-1" },
  { id: 12, windowCount: 1, monitorName: "HDMI-A-1" },
  { id: 13, windowCount: 1, monitorName: "DP-1" },
  { id: 15, windowCount: 0, monitorName: "HDMI-A-1" }
]

test("normalize keeps the mode and hideEmpty, defaulting to ten and shown", () => {
  assert.deepEqual(Model.normalize({}), { mode: "10", hideEmpty: false })
  assert.deepEqual(Model.normalize({ mode: "5", hideEmpty: true }), { mode: "5", hideEmpty: true })
  assert.deepEqual(Model.normalize({ mode: "active" }), { mode: "active", hideEmpty: false })
  assert.deepEqual(Model.normalize({ mode: "nope", hideEmpty: "yes" }), { mode: "10", hideEmpty: false })
  assert.deepEqual(Model.normalize(null), { mode: "10", hideEmpty: false })
})

test("mode ten shows the whole block plus guests and the focused workspace", () => {
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 3, "DP-1"),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13]
  )
  // Focused workspace 15 lives on the other monitor's block, so it joins.
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 15, "DP-1"),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 15]
  )
})

test("mode five guarantees only the first five slots", () => {
  assert.deepEqual(
    Model.visibleIds("5", false, 0, VALUES, 3, "DP-1"),
    [1, 2, 3, 4, 5, 7, 13]
  )
})

test("mode active shows only workspaces Hyprland reports, plus the focused one", () => {
  assert.deepEqual(
    Model.visibleIds("active", false, 0, VALUES, 3, "DP-1"),
    [1, 3, 7, 13]
  )
  assert.deepEqual(
    Model.visibleIds("active", false, 1, VALUES, 12, "HDMI-A-1"),
    [11, 12, 13, 15]
  )
})

test("hideEmpty drops empty workspaces but never the focused one", () => {
  // Focused 3 stays, occupied guest 13 stays, the rest of the block (empty
  // or never reported) hides.
  assert.deepEqual(Model.visibleIds("10", true, 0, VALUES, 3, "DP-1"), [3, 13])
  // Focused workspace 1 is empty and still shows, alongside occupied 3 and 13.
  assert.deepEqual(Model.visibleIds("10", true, 0, VALUES, 1, "DP-1"), [1, 3, 13])
  // Active + hideEmpty leaves only occupied workspaces and the focused one.
  assert.deepEqual(Model.visibleIds("active", true, 1, VALUES, 11, "HDMI-A-1"), [11, 12, 13])
})

test("slot numbers label ten as zero", () => {
  assert.equal(Model.labelFor(10), "0")
  assert.equal(Model.labelFor(1), "1")
  assert.equal(Model.labelFor(20), "0")
  assert.equal(Model.slotOf(13), 3)
  assert.equal(Model.blockOf(13), 1)
  assert.equal(Model.blockOf(3), 0)
})

test("stateFor reports focused, occupied, and window count", () => {
  assert.deepEqual(Model.stateFor(3, VALUES, 3), { id: 3, focused: true, occupied: true, windowCount: 2 })
  assert.deepEqual(Model.stateFor(1, VALUES, 3), { id: 1, focused: false, occupied: false, windowCount: 0 })
  assert.deepEqual(Model.stateFor(99, VALUES, 3), { id: 99, focused: false, occupied: false, windowCount: 0 })
  assert.deepEqual(Model.stateFor(0, VALUES, 3), { id: 0, focused: false, occupied: false, windowCount: 0 })
})
