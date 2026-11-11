.pragma library

// Pure workspace math for the Nyxiri workspaces widget. Everything here
// works on plain objects ({ id, windowCount, monitorName }) so node can
// test it without Hyprland; BarWidget.qml maps Hyprland's live values into
// that shape before calling in.
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

// Marker styles, after Shibumi-Shell's marker picker. Every style is text,
// so it renders in the bar's normal cell: numbers are the slot, kanji are
// the Japanese numerals, pacman puts Pac-Man on the focused workspace, a
// ghost on occupied ones, and a pellet on empty ones, and dots are filled /
// ringed / hollow by state.
var STYLES = ["numbers", "kanji", "pacman", "dots"]
var KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
var PACMAN_GLYPH = String.fromCodePoint(0xF0BAF) // nf-md-pac_man
var GHOST_GLYPH = String.fromCodePoint(0xF02A0) // nf-md-ghost

function markerFor(styleValue, slotValue, focused, occupied) {
  var style = STYLES.indexOf(String(styleValue || "")) !== -1 ? String(styleValue) : "numbers"
  var slot = Number(slotValue)
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS) slot = 1
  if (style === "kanji") return KANJI[slot - 1]
  if (style === "pacman") return focused ? PACMAN_GLYPH : occupied ? GHOST_GLYPH : "·"
  if (style === "dots") return focused ? "●" : occupied ? "◉" : "○"
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
