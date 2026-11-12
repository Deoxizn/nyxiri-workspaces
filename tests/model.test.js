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

test("normalize keeps the mode, hideEmpty, and style, defaulting to ten, shown, numbers", () => {
  assert.deepEqual(Model.normalize({}), { mode: "10", hideEmpty: false, style: "numbers", ranges: "" })
  assert.deepEqual(Model.normalize({ mode: "5", hideEmpty: true, style: "kanji", ranges: "" }), { mode: "5", hideEmpty: true, style: "kanji", ranges: "" })
  assert.deepEqual(Model.normalize({ mode: "active", style: "pacman" }), { mode: "active", hideEmpty: false, style: "pacman", ranges: "" })
  assert.deepEqual(Model.normalize({ style: "magic" }), { mode: "10", hideEmpty: false, style: "magic", ranges: "" })
  assert.deepEqual(Model.normalize({ style: "default" }), { mode: "10", hideEmpty: false, style: "default", ranges: "" })
  assert.deepEqual(Model.normalize({ style: "aurora" }), { mode: "10", hideEmpty: false, style: "aurora", ranges: "" })
  assert.deepEqual(Model.normalize({ style: "apps" }), { mode: "10", hideEmpty: false, style: "apps", ranges: "" })
  assert.deepEqual(Model.normalize({ mode: "nope", hideEmpty: "yes", style: "nope" }), { mode: "10", hideEmpty: false, style: "numbers", ranges: "" })
  assert.deepEqual(Model.normalize(null), { mode: "10", hideEmpty: false, style: "numbers", ranges: "" })
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

test("markerFor renders every style by state", () => {
  // Numbers are the slot label.
  assert.equal(Model.markerFor("numbers", 1, false, false), "1")
  assert.equal(Model.markerFor("numbers", 10, true, true), "0")
  assert.equal(Model.markerFor("nope", 3, false, false), "3")
  // Kanji are the Japanese numerals, same in every state.
  assert.equal(Model.markerFor("kanji", 1, false, false), "一")
  assert.equal(Model.markerFor("kanji", 10, true, true), "十")
  assert.equal(Model.markerFor("kanji", 5, false, true), "五")
  // Pac-Man: pacman on the focused workspace, a ghost where windows live,
  // a pellet on empty ones. The glyphs are the Nerd Font codepoints.
  assert.equal(Model.markerFor("pacman", 2, true, true), String.fromCodePoint(0xF0BAF))
  assert.equal(Model.markerFor("pacman", 2, false, true), String.fromCodePoint(0xF02A0))
  assert.equal(Model.markerFor("pacman", 2, false, false), "·")
  // Dots: filled for focused, ringed for occupied, hollow for empty.
  assert.equal(Model.markerFor("dots", 2, true, true), "●")
  assert.equal(Model.markerFor("dots", 2, false, true), "◉")
  assert.equal(Model.markerFor("dots", 2, false, false), "○")
  // Magic: a star that fills, hollows, or shrinks to a pellet.
  assert.equal(Model.markerFor("magic", 2, true, true), "✦")
  assert.equal(Model.markerFor("magic", 2, false, true), "✧")
  assert.equal(Model.markerFor("magic", 2, false, false), "·")
  // Default and aurora are shapes, not text: no label for the delegate.
  assert.equal(Model.markerFor("default", 2, true, true), "")
  assert.equal(Model.markerFor("default", 2, false, false), "")
  assert.equal(Model.markerFor("aurora", 2, true, true), "")
  assert.equal(Model.markerFor("aurora", 2, false, true), "")
  // Apps shows the number as its label: occupied cells show the icons
  // instead and hide the label, empty cells keep their number.
  assert.equal(Model.markerFor("apps", 3, false, false), "3")
  assert.equal(Model.markerFor("apps", 10, true, true), "0")
})

test("markerKind splits text styles from shape styles", () => {
  assert.equal(Model.markerKind("numbers"), "text")
  assert.equal(Model.markerKind("kanji"), "text")
  assert.equal(Model.markerKind("pacman"), "text")
  assert.equal(Model.markerKind("dots"), "text")
  assert.equal(Model.markerKind("magic"), "text")
  assert.equal(Model.markerKind("default"), "shape")
  assert.equal(Model.markerKind("aurora"), "shape")
  assert.equal(Model.markerKind("apps"), "text")
  assert.equal(Model.markerKind("nope"), "text")
  assert.equal(Model.markerKind(undefined), "text")
})

test("stateFor reports focused, occupied, and window count", () => {
  assert.deepEqual(Model.stateFor(3, VALUES, 3), { id: 3, focused: true, occupied: true, windowCount: 2 })
  assert.deepEqual(Model.stateFor(1, VALUES, 3), { id: 1, focused: false, occupied: false, windowCount: 0 })
  assert.deepEqual(Model.stateFor(99, VALUES, 3), { id: 99, focused: false, occupied: false, windowCount: 0 })
  assert.deepEqual(Model.stateFor(0, VALUES, 3), { id: 0, focused: false, occupied: false, windowCount: 0 })
})

// Workspaces with the apps list the widget maps toplevels into. Workspace
// 3 runs Firefox twice plus Files; 5 runs two shell-hosted apps under the
// same org.quickshell id; 7 is empty; 9 runs eight distinct apps.
const APP_VALUES = [
  { id: 3, windowCount: 3, monitorName: "DP-1", apps: [
    { appId: "firefox", title: "Mozilla Firefox" },
    { appId: "org.gnome.Nautilus", title: "Files" },
    { appId: "firefox", title: "Firefox - second window" }
  ] },
  { id: 5, windowCount: 2, monitorName: "DP-1", apps: [
    { appId: "org.quickshell", title: "Omamail" },
    { appId: "org.quickshell", title: "Settings" }
  ] },
  { id: 7, windowCount: 0, monitorName: "DP-1", apps: [] },
  { id: 9, windowCount: 8, monitorName: "DP-1", apps: [
    { appId: "a1", title: "" }, { appId: "a2", title: "" }, { appId: "a3", title: "" },
    { appId: "a4", title: "" }, { appId: "a5", title: "" }, { appId: "a6", title: "" },
    { appId: "a7", title: "" }, { appId: "a8", title: "" }
  ] }
]

test("clampIconSize keeps 12-24, defaulting to 16", () => {
  assert.equal(Model.clampIconSize(16), 16)
  assert.equal(Model.clampIconSize(20), 20)
  assert.equal(Model.clampIconSize(12), 12)
  assert.equal(Model.clampIconSize(24), 24)
  assert.equal(Model.clampIconSize(8), 12)
  assert.equal(Model.clampIconSize(30), 24)
  assert.equal(Model.clampIconSize("20"), 20)
  assert.equal(Model.clampIconSize(17.6), 18)
  assert.equal(Model.clampIconSize("nope"), 16)
  assert.equal(Model.clampIconSize(null), 16)
  assert.equal(Model.clampIconSize(undefined), 16)
  assert.equal(Model.ICON_SIZE_DEFAULT, 16)
  assert.equal(Model.ICON_SIZE_MIN, 12)
  assert.equal(Model.ICON_SIZE_MAX, 24)
})

test("appIdCandidates strips the steam_app_ prefix for the shortcut name", () => {
  assert.deepEqual(Model.appIdCandidates("steam_app_battlenet"), ["steam_app_battlenet", "battlenet"])
  assert.deepEqual(Model.appIdCandidates("steam_app_12345"), ["steam_app_12345", "12345"])
  assert.deepEqual(Model.appIdCandidates("firefox"), ["firefox"])
})

test("steamAppId pulls the numeric id out of a Steam game id", () => {
  assert.equal(Model.steamAppId("steam_app_12345"), "12345")
  assert.equal(Model.steamAppId("steam_app_battlenet"), "")
  assert.equal(Model.steamAppId("firefox"), "")
  assert.equal(Model.steamAppId(""), "")
  assert.equal(Model.steamAppId(null), "")
})

test("appsForWorkspace returns one entry per app, first-seen order, capped at six", () => {
  assert.deepEqual(Model.appsForWorkspace(3, APP_VALUES), [
    { appId: "firefox", title: "Mozilla Firefox" },
    { appId: "org.gnome.Nautilus", title: "Files" }
  ])
  // Shell-hosted windows keep their own entries despite sharing an id.
  assert.deepEqual(Model.appsForWorkspace(5, APP_VALUES), [
    { appId: "org.quickshell", title: "Omamail" },
    { appId: "org.quickshell", title: "Settings" }
  ])
  // Eight apps collapse to the first six.
  assert.deepEqual(
    Model.appsForWorkspace(9, APP_VALUES).map((a) => a.appId),
    ["a1", "a2", "a3", "a4", "a5", "a6"]
  )
  assert.equal(Model.MAX_APPS, 6)
  // Empty, missing, and app-less workspaces have no apps.
  assert.deepEqual(Model.appsForWorkspace(7, APP_VALUES), [])
  assert.deepEqual(Model.appsForWorkspace(99, APP_VALUES), [])
  assert.deepEqual(Model.appsForWorkspace(3, VALUES), [])
  assert.deepEqual(Model.appsForWorkspace(0, APP_VALUES), [])
})

test("appIdCandidates tries the id, its lowercase form, and the reverse-DNS tail", () => {
  assert.deepEqual(Model.appIdCandidates("dev.example.my-tool"), ["dev.example.my-tool", "my-tool"])
  assert.deepEqual(Model.appIdCandidates("Firefox"), ["Firefox", "firefox"])
  assert.deepEqual(Model.appIdCandidates("org.gnome.Nautilus"), ["org.gnome.Nautilus", "org.gnome.nautilus", "Nautilus", "nautilus"])
  assert.deepEqual(Model.appIdCandidates(""), [])
})

test("webAppHost pulls the host out of a Chromium --app class", () => {
  assert.equal(Model.webAppHost("chrome-web.whatsapp.com__-Default"), "web.whatsapp.com")
  assert.equal(Model.webAppHost("brave-app.hey.com__-Profile_1"), "app.hey.com")
  assert.equal(Model.webAppHost("firefox"), "")
  assert.equal(Model.webAppHost(""), "")
})

test("appLabel prefers the entry name, then the webapp host, then the reverse-DNS tail", () => {
  assert.equal(Model.appLabel("Firefox", "firefox"), "Firefox")
  assert.equal(Model.appLabel("", "org.omarchy.herdr"), "herdr")
  assert.equal(Model.appLabel("", "chrome-discord.com__-Default"), "discord.com")
  assert.equal(Model.appLabel("", "firefox"), "firefox")
  assert.equal(Model.appLabel("", ""), "")
})

test("fallbackLetter is the first character of the label, uppercased", () => {
  assert.equal(Model.fallbackLetter("Firefox", "firefox"), "F")
  assert.equal(Model.fallbackLetter("", "org.omarchy.herdr"), "H")
  assert.equal(Model.fallbackLetter("", "chrome-discord.com__-Default"), "D")
  assert.equal(Model.fallbackLetter("", ""), "")
})

test("parseRanges reads monitor ranges, with 0 meaning 10", () => {
  assert.deepEqual(Model.parseRanges("DP-1:1-5,HDMI-A-1:6-10"), { "DP-1": [1, 2, 3, 4, 5], "HDMI-A-1": [6, 7, 8, 9, 10] })
  assert.deepEqual(Model.parseRanges("DP-1:1-5 HDMI-A-1:6-0"), { "DP-1": [1, 2, 3, 4, 5], "HDMI-A-1": [6, 7, 8, 9, 10] })
  assert.deepEqual(Model.parseRanges("DP-1:3"), { "DP-1": [3] })
  assert.deepEqual(Model.parseRanges("DP-1:0"), { "DP-1": [10] })
  assert.deepEqual(Model.parseRanges("DP-1:1-5,DP-1:7"), { "DP-1": [1, 2, 3, 4, 5, 7] })
  assert.deepEqual(Model.parseRanges(""), {})
  assert.deepEqual(Model.parseRanges("garbage"), {})
  assert.deepEqual(Model.parseRanges("DP-1:11"), {})
  assert.deepEqual(Model.parseRanges("DP-1:5-1"), {})
})

test("classic mode is one global set: the id is the slot, there is no block", () => {
  assert.equal(Model.slotOf(13, 10, false), 13)
  assert.equal(Model.slotOf(3, 10, false), 3)
  assert.equal(Model.blockOf(13, 10, false), 0)
  assert.equal(Model.labelFor(13, 10, false), "13")
  assert.equal(Model.labelFor(10, 10, false), "0")
  // Per-monitor mode keeps the old math.
  assert.equal(Model.slotOf(13, 10, true), 3)
  assert.equal(Model.blockOf(13, 10, true), 1)
})

test("classic markerFor shows the number for ids above ten, whatever the style", () => {
  assert.equal(Model.markerFor("numbers", 13, false, true, false), "13")
  assert.equal(Model.markerFor("kanji", 13, false, false, false), "13")
  assert.equal(Model.markerFor("pacman", 13, true, true, false), "13")
  assert.equal(Model.markerFor("numbers", 10, true, true, false), "0")
  assert.equal(Model.markerFor("kanji", 10, true, true, false), "十")
})

test("classic mode without a range shows the global set plus occupied workspaces above ten", () => {
  // 1-10 guaranteed; 12 and 13 have windows, 11 and 15 are empty and stay out.
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 3, "DP-1", false, null),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13]
  )
  assert.deepEqual(
    Model.visibleIds("5", false, 0, VALUES, 3, "DP-1", false, null),
    [1, 2, 3, 4, 5, 7, 12, 13]
  )
  assert.deepEqual(
    Model.visibleIds("active", false, 0, VALUES, 3, "DP-1", false, null),
    [1, 3, 7, 12, 13]
  )
})

test("classic mode with a range shows only that monitor's workspaces, plus the focused one", () => {
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 3, "DP-1", false, [1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5]
  )
  // Focused 8 is outside DP-1's range and still joins, so you never lose it.
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 8, "DP-1", false, [1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5, 8]
  )
  // HDMI-A-1's range, focused 12 outside it.
  assert.deepEqual(
    Model.visibleIds("10", false, 0, VALUES, 12, "HDMI-A-1", false, [6, 7, 8, 9, 10]),
    [6, 7, 8, 9, 10, 12]
  )
  // A range is the explicit set, so mode five doesn't trim it.
  assert.deepEqual(
    Model.visibleIds("5", false, 0, VALUES, 3, "DP-1", false, [1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5]
  )
})

test("classic mode with hideEmpty keeps only occupied workspaces and the focused one", () => {
  assert.deepEqual(
    Model.visibleIds("10", true, 0, VALUES, 3, "DP-1", false, null),
    [3, 12, 13]
  )
})
