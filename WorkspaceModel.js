.pragma library

// Pure workspace math for the Nyxiri workspaces widget. Everything here
// works on plain objects ({ id, windowCount, monitorName, apps: [{ appId,
// title }] }) so node can test it without Hyprland; BarWidget.qml maps
// Hyprland's live values into that shape before calling in.
//
// Modes, after Shibumi-Shell's visible-workspaces setting:
//   "10"     this monitor's block of ten, always shown, plus any real
//            workspace in the block and any guest on this monitor
//   "5"      same, but only the first five slots guaranteed
//   "active" only workspaces Hyprland actually reports, plus the focused one
// hideEmpty drops workspaces with no windows, except the focused one, which
// always stays so you never lose your place.

var MODES = ["10", "5", "active"]
var SLOTS = 10

// Marker styles, after Shibumi-Shell's marker picker. Numbers, kanji,
// pacman, dots, and magic are text, so they render in the bar's normal
// cell: numbers are the slot, kanji are the Japanese numerals, pacman
// puts Pac-Man on the focused workspace, a ghost on occupied ones, and a
// pellet on empty ones, dots are filled / ringed / hollow by state, and
// magic is a star that fills, hollows, or shrinks to a pellet. Default
// and aurora are shapes, not text: the delegate draws them as rectangles
// (a pill halo and marker, an aurora bar), so markerFor returns "" for
// those and markerKind tells the delegate which path to take. Apps is
// text too, and markerFor returns the number for it: occupied cells show
// the app icons instead of the label, empty cells keep their number.
var STYLES = ["numbers", "kanji", "pacman", "dots", "magic", "default", "aurora", "apps"]
var SHAPE_STYLES = ["default", "aurora"]
var KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
var PACMAN_GLYPH = String.fromCodePoint(0xF0BAF) // nf-md-pac_man
var GHOST_GLYPH = String.fromCodePoint(0xF02A0) // nf-md-ghost

function markerKind(styleValue) {
  var style = STYLES.indexOf(String(styleValue || "")) !== -1 ? String(styleValue) : "numbers"
  return SHAPE_STYLES.indexOf(style) !== -1 ? "shape" : "text"
}

function markerFor(styleValue, slotValue, focused, occupied) {
  var style = STYLES.indexOf(String(styleValue || "")) !== -1 ? String(styleValue) : "numbers"
  var slot = Number(slotValue)
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS) slot = 1
  if (style === "kanji") return KANJI[slot - 1]
  if (style === "pacman") return focused ? PACMAN_GLYPH : occupied ? GHOST_GLYPH : "·"
  if (style === "dots") return focused ? "●" : occupied ? "◉" : "○"
  if (style === "magic") return focused ? "✦" : occupied ? "✧" : "·"
  if (SHAPE_STYLES.indexOf(style) !== -1) return ""
  return labelFor(slot)
}

function positiveId(value) {
  var id = Number(value)
  return Number.isInteger(id) && id > 0 && id <= 9999 ? id : 0
}

function blockOf(id, slots) {
  return Math.floor((positiveId(id) - 1) / (slots || SLOTS))
}

function slotOf(id, slots) {
  return (positiveId(id) - 1) % (slots || SLOTS) + 1
}

// The label a slot shows: slot 10 renders as 0, like stock Omarchy.
function labelFor(id, slots) {
  var slot = slotOf(id, slots)
  return slot === (slots || SLOTS) ? "0" : String(slot)
}

function normalize(settings) {
  var raw = settings && typeof settings === "object" ? settings : {}
  return {
    mode: MODES.indexOf(String(raw.mode || "")) !== -1 ? String(raw.mode) : "10",
    hideEmpty: raw.hideEmpty === true,
    style: STYLES.indexOf(String(raw.style || "")) !== -1 ? String(raw.style) : "numbers"
  }
}

// App icons, after omarchy-spaces: one icon per app running on a workspace,
// no numbers, no counts, no agent badges. They show when the style is
// "apps", instead of the marker; empty workspaces keep their number.
var MAX_APPS = 6

// App icon size, in logical pixels: 12-24, default 16. Accepts the string
// form `omarchy bar set` stores without --json, like the boolean settings.
var ICON_SIZE_DEFAULT = 16
var ICON_SIZE_MIN = 12
var ICON_SIZE_MAX = 24

function clampIconSize(value) {
  if (value === null || value === undefined) return ICON_SIZE_DEFAULT
  var size = Number(value)
  if (!Number.isFinite(size)) return ICON_SIZE_DEFAULT
  return Math.max(ICON_SIZE_MIN, Math.min(ICON_SIZE_MAX, Math.round(size)))
}

function appKey(appId) {
  return String(appId || "").toLowerCase()
}

// Lookup keys for an app id, most specific first. Reverse-DNS ids such as
// "dev.example.my-tool" often ship a desktop file named after the last part.
function appIdCandidates(appId) {
  var id = String(appId || "")
  if (id === "") return []
  var out = [id]
  function add(v) { if (v && out.indexOf(v) === -1) out.push(v) }
  add(id.toLowerCase())
  var dot = id.lastIndexOf(".")
  if (dot > 0 && dot < id.length - 1) {
    add(id.slice(dot + 1))
    add(id.slice(dot + 1).toLowerCase())
  }
  return out
}

// Chromium-family --app windows use classes like
// "chrome-web.whatsapp.com__-Default" or "brave-app.hey.com__-Profile_1".
// Returns the host ("web.whatsapp.com") or "" when the class is not one.
function webAppHost(appId) {
  var m = /^(?:chrome|chromium|brave|msedge|vivaldi|helium|opera)-([^_]+?)(?:__|_).*-(?:Default|Profile_\d+)$/i.exec(String(appId || ""))
  return m ? m[1] : ""
}

// The readable label for an app: its desktop-entry name when known, the
// webapp host for a Chromium --app window, else the readable tail of a
// reverse-DNS class, so org.omarchy.herdr reads "herdr" and not "org".
function appLabel(name, appId) {
  var label = String(name || "")
  var id = String(appId || "")
  if (label !== "") return label
  var host = webAppHost(id)
  if (host !== "") return host
  var parts = id.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : id
}

// The letter to stand in for an app with no resolvable icon: the first
// character of its label, uppercased. codePointAt keeps a surrogate pair
// (an emoji first character) whole.
function fallbackLetter(name, appId) {
  var label = appLabel(name, appId)
  var first = label.codePointAt(0)
  return first === undefined ? "" : String.fromCodePoint(first).toUpperCase()
}

// The apps running on one workspace, one entry per app in first-seen
// order, capped at MAX_APPS. The shell hosts more than one app under its
// own id, so each of its windows keeps its own entry instead of
// collapsing into one.
function appsForWorkspace(idValue, values) {
  var id = positiveId(idValue)
  var source = values && typeof values.length === "number" ? values : []
  var out = []
  var seen = {}
  for (var i = 0; i < source.length; i++) {
    var entry = source[i] || {}
    if (positiveId(entry.id) !== id) continue
    var apps = entry.apps && typeof entry.apps.length === "number" ? entry.apps : []
    for (var j = 0; j < apps.length; j++) {
      var app = apps[j] || {}
      var appId = String(app.appId || "")
      if (!appId) continue
      var key = appKey(appId) === "org.quickshell"
        ? "org.quickshell\u0000" + String(app.title || "")
        : appKey(appId)
      if (seen[key]) continue
      seen[key] = true
      out.push({ appId: appId, title: String(app.title || "") })
      if (out.length >= MAX_APPS) return out
    }
    return out
  }
  return out
}

function visibleIds(modeValue, hideEmpty, block, values, focusedId, monitorName) {
  var mode = MODES.indexOf(String(modeValue || "")) !== -1 ? String(modeValue) : "10"
  var source = values && typeof values.length === "number" ? values : []
  var focused = positiveId(focusedId)
  var blockNumber = Number(block)
  if (!Number.isInteger(blockNumber) || blockNumber < 0) blockNumber = 0

  var ids = []
  function add(id) {
    id = positiveId(id)
    if (id && ids.indexOf(id) === -1) ids.push(id)
  }

  // Guaranteed slots for the persistent modes; "active" guarantees none.
  if (mode !== "active") {
    var limit = mode === "5" ? 5 : SLOTS
    for (var slot = 1; slot <= limit; slot++) add(blockNumber * SLOTS + slot)
  }

  var guests = []
  for (var i = 0; i < source.length; i++) {
    var entry = source[i] || {}
    var id = positiveId(entry.id)
    if (!id) continue
    if (blockOf(id) === blockNumber) add(id)
    else if (entry.monitorName && entry.monitorName === monitorName) guests.push(id)
  }
  guests.sort(function(left, right) { return left - right })
  for (var g = 0; g < guests.length; g++) add(guests[g])
  if (focused) add(focused)

  if (hideEmpty === true) {
    var counts = {}
    for (var j = 0; j < source.length; j++) {
      var item = source[j] || {}
      var itemId = positiveId(item.id)
      if (itemId) counts[itemId] = Math.max(0, Number(item.windowCount) || 0)
    }
    ids = ids.filter(function(id) {
      // A slot Hyprland never reported has no count; it counts as empty.
      return id === focused || (counts[id] || 0) > 0
    })
  }

  ids.sort(function(left, right) { return left - right })
  return ids
}

function stateFor(idValue, values, focusedValue) {
  var id = positiveId(idValue)
  var focusedId = positiveId(focusedValue)
  var source = values && typeof values.length === "number" ? values : []
  var count = 0
  for (var i = 0; i < source.length; i++) {
    if (positiveId(source[i] ? source[i].id : 0) !== id) continue
    count = Math.max(0, Number(source[i].windowCount) || 0)
    break
  }
  return {
    id: id,
    focused: id !== 0 && id === focusedId,
    occupied: count > 0,
    windowCount: count
  }
}
