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
//
// Classic mode (one global set 1-10, as in Omarchy 4.0.6, copied from
// fabiopbarbieri/omarchy-classic-workspaces): perMonitor is false, so the id
// is the slot and there is no block. A ranges string pins which workspaces
// each monitor shows, "DP-1:1-5,HDMI-A-1:6-10" (0 means 10, so 6-0 is
// 6-10); without a range for a monitor, classic shows 1-5 plus any other
// existing workspace up to 10, and above 10 only one with windows. The mode itself is not a setting here: the widget reads what
// Hyprland applied (the applied file, else the flag), and the settings card
// switches it by running bin/mode.

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

function markerFor(styleValue, slotValue, focused, occupied, perMonitor) {
  var style = STYLES.indexOf(String(styleValue || "")) !== -1 ? String(styleValue) : "numbers"
  var slot = Number(slotValue)
  if (!Number.isInteger(slot) || slot < 1) slot = 1
  // Classic mode: an id above 10 has no kanji/pacman/dots marker, so it
  // shows its number, whatever the style.
  if (perMonitor === false && slot > SLOTS) return String(slot)
  if (slot > SLOTS) slot = 1
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

function blockOf(id, slots, perMonitor) {
  // Classic mode: one global set, no blocks.
  if (perMonitor === false) return 0
  return Math.floor((positiveId(id) - 1) / (slots || SLOTS))
}

function slotOf(id, slots, perMonitor) {
  // Classic mode: the id is the slot; workspace 13 is slot 13, not 3.
  if (perMonitor === false) return positiveId(id)
  return (positiveId(id) - 1) % (slots || SLOTS) + 1
}

// The label a slot shows: slot 10 renders as 0, like stock Omarchy. In
// classic mode an id above 10 shows its own number.
function labelFor(id, slots, perMonitor) {
  var slot = slotOf(id, slots, perMonitor)
  if (perMonitor === false) return slot === SLOTS ? "0" : String(slot)
  return slot === (slots || SLOTS) ? "0" : String(slot)
}

// Per-monitor ranges for classic mode, from the settings card's text field:
//   "DP-1:1-5,HDMI-A-1:6-10"
// Entries split on whitespace or commas; each is MONITOR:spec, where spec
// is a range "a-b" or a single id, and 0 means 10 (so "6-0" is 6-10).
// Malformed parts are dropped, so a half-typed field never breaks the bar;
// an empty or unparseable string is {}.
function rangeNumber(value) {
  var n = Number(String(value || "").trim())
  if (!Number.isInteger(n) || n < 0 || n > SLOTS) return 0
  return n === 0 ? SLOTS : n
}

function parseRanges(text) {
  var out = {}
  var tokens = String(text || "").split(/[\s,]+/)
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]
    if (!token) continue
    var colon = token.indexOf(":")
    if (colon < 1) continue
    var name = token.slice(0, colon)
    var spec = token.slice(colon + 1)
    if (!name || !spec) continue
    var ids = []
    var dash = spec.indexOf("-")
    if (dash >= 0) {
      var lo = rangeNumber(spec.slice(0, dash))
      var hi = rangeNumber(spec.slice(dash + 1))
      if (lo && hi && lo <= hi) {
        for (var n = lo; n <= hi; n++) ids.push(n)
      }
    } else {
      var single = rangeNumber(spec)
      if (single) ids.push(single)
    }
    if (ids.length === 0) continue
    var list = out[name] || []
    for (var j = 0; j < ids.length; j++) {
      if (list.indexOf(ids[j]) === -1) list.push(ids[j])
    }
    list.sort(function(left, right) { return left - right })
    out[name] = list
  }
  return out
}

function normalize(settings) {
  var raw = settings && typeof settings === "object" ? settings : {}
  return {
    mode: MODES.indexOf(String(raw.mode || "")) !== -1 ? String(raw.mode) : "10",
    hideEmpty: raw.hideEmpty === true,
    style: STYLES.indexOf(String(raw.style || "")) !== -1 ? String(raw.style) : "numbers",
    ranges: String(raw.ranges || "")
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
// A Steam/Proton game id: steam_app_<appid> for library games (numeric),
// steam_app_<name> for a shortcut added by hand (Battle.net). Only the
// numeric form has an icon Steam cached to fetch.
function steamAppId(appId) {
  var match = /^steam_app_(\d+)$/.exec(String(appId || ""))
  return match ? match[1] : ""
}

function appIdCandidates(appId) {
  var id = String(appId || "")
  if (id === "") return []
  var out = [id]
  function add(v) { if (v && out.indexOf(v) === -1) out.push(v) }
  add(id.toLowerCase())
  // A Steam/Proton id carries the shortcut name after the prefix:
  // steam_app_battlenet is the Battle.net desktop entry.
  if (id.indexOf("steam_app_") === 0) add(id.slice("steam_app_".length))
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

function visibleIds(modeValue, hideEmpty, block, values, focusedId, monitorName, perMonitor, range) {
  var mode = MODES.indexOf(String(modeValue || "")) !== -1 ? String(modeValue) : "10"
  var source = values && typeof values.length === "number" ? values : []
  var focused = positiveId(focusedId)
  var blockNumber = Number(block)
  if (!Number.isInteger(blockNumber) || blockNumber < 0) blockNumber = 0
  // Classic mode: one global set, so the block is meaningless and the
  // range (when this monitor has one) is the set. perMonitor defaults to
  // true, so every old caller keeps the 4.5 behavior.
  var classic = perMonitor === false
  var rangeIds = range && typeof range.length === "number" ? range : null

  var ids = []
  function add(id) {
    id = positiveId(id)
    if (id && ids.indexOf(id) === -1) ids.push(id)
  }

  // Guaranteed slots for the persistent modes; "active" guarantees none.
  // In classic mode with a range, the range is the explicit set, so the
  // mode's count doesn't trim it; "active" still shows only the focused one.
  if (mode !== "active") {
    if (classic && rangeIds && rangeIds.length) {
      for (var r = 0; r < rangeIds.length; r++) add(rangeIds[r])
    } else {
      var limit = mode === "5" ? 5 : SLOTS
      for (var slot = 1; slot <= limit; slot++) add(classic ? slot : blockNumber * SLOTS + slot)
    }
  }

  var guests = []
  for (var i = 0; i < source.length; i++) {
    var entry = source[i] || {}
    var id = positiveId(entry.id)
    if (!id) continue
    if (classic) {
      // With a range, only the range shows (the focused one joins below);
      // without one, the classic rule: any existing workspace up to 10,
      // and above 10 only one with windows. (The upstream rule also keeps
      // one shown on a screen; the model can't see other monitors' active
      // workspace, so windows are the testable half, and the focused one
      // always joins anyway.)
      if (rangeIds && rangeIds.length) continue
      if (id <= SLOTS || (Number(entry.windowCount) || 0) > 0) add(id)
    } else if (blockOf(id) === blockNumber) add(id)
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
