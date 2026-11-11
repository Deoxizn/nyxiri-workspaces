import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Hyprland
import Quickshell.Io
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import "WorkspaceModel.js" as Model

// Nyxiri workspaces: stock Omarchy's per-monitor workspace numbers, with
// three settings of its own (read from this widget's shell.json layout entry,
// edited in the Nyxiri settings card):
//   mode       "10" | "5" | "active"   how many numbers show (Shibumi-style)
//   hideEmpty  true | false            hide workspaces with no windows
//   style      numbers | kanji | pacman | dots | magic | default | aurora
// The focused workspace always stays, even when it is empty. The widget
// paints no background of its own; the bar's pill is the background.
BarWidget {
  id: root
  moduleName: "devi.nyxiri-workspaces"

  readonly property string mode: String(setting("mode", "10"))
  readonly property bool hideEmpty: setting("hideEmpty", false) === true
  readonly property string style: String(setting("style", "numbers"))

  // Default and aurora draw shapes instead of text, so their cells are
  // wider (Shibumi's default halo is 34 wide) and the label stays empty.
  readonly property bool shapeStyle: Model.markerKind(root.style) === "shape"

  // Every monitor has workspaces 1-10 of its own, which Hyprland numbers in a
  // block of ten per monitor: 1-10, 11-20, and so on (see
  // default/hypr/monitor-workspaces.lua). Each bar shows its own monitor's block,
  // numbered 1-10, and the one that monitor shows, whichever monitor has focus.
  readonly property int slots: 10

  readonly property var monitor: {
    var window = root.QsWindow.window
    var screen = window ? window.screen : null
    return screen ? Hyprland.monitorFor(screen) : Hyprland.focusedMonitor
  }
  readonly property string monitorName: root.monitor ? root.monitor.name : ""

  // Connector -> block, from the file Hyprland keeps them in.
  property var blocks: ({})

  function readBlocks(text) {
    var next = {}
    var lines = String(text || "").split("\n")
    for (var i = 0; i < lines.length; i++) {
      var fields = lines[i].split("\t")
      if (fields.length >= 3 && fields[1] !== "") next[fields[1]] = parseInt(fields[0], 10)
    }
    root.blocks = next
  }

  FileView {
    path: (Quickshell.env("XDG_STATE_HOME") || Quickshell.env("HOME") + "/.local/state") + "/omarchy/monitors/workspaces"
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.readBlocks(text())
    onLoadFailed: root.readBlocks("")
  }

  function blockOf(id) {
    return Model.blockOf(id, root.slots)
  }

  function slotOf(id) {
    return Model.slotOf(id, root.slots)
  }

  function activeWorkspaceId() {
    return root.monitor && root.monitor.activeWorkspace ? root.monitor.activeWorkspace.id : -1
  }

  // Until Hyprland has written the file, the workspace a monitor shows is in
  // its own block.
  readonly property int block: {
    var block = root.blocks[root.monitorName]
    if (block !== undefined) return block
    var active = root.activeWorkspaceId()
    return active > 0 ? root.blockOf(active) : 0
  }

  // Hyprland's live values mapped to the plain shape WorkspaceModel.js works
  // on, so the model stays testable without Hyprland.
  readonly property var workspaceValues: {
    var out = []
    var values = Hyprland.workspaces.values
    for (var i = 0; i < values.length; i++) {
      var ws = values[i]
      out.push({
        id: ws.id,
        windowCount: ws.toplevels ? ws.toplevels.values.length : 0,
        monitorName: ws.monitor ? ws.monitor.name : ""
      })
    }
    return out
  }

  function workspaceIds() {
    return Model.visibleIds(root.mode, root.hideEmpty, root.block, root.workspaceValues, root.activeWorkspaceId(), root.monitorName)
  }

  function dispatch(expression) {
    if (root.bar) root.bar.run("hyprctl dispatch " + Util.shellQuote(expression))
  }

  function focusWorkspace(id) {
    if (root.blockOf(id) === root.block) {
      root.dispatch("o.workspaces.focus(" + root.slotOf(id) + ", \"" + root.monitorName + "\")")
    } else {
      root.dispatch("hl.dsp.focus({ workspace = \"" + id + "\" })")
    }
  }

  // A wheel notch moves one entry along the row, and a touchpad adds up its
  // smaller deltas until they make a notch's worth.
  property real wheelAccumulator: 0

  function scrollWorkspaces(delta) {
    var wheel = Util.wheelSteps(root.wheelAccumulator, delta)
    root.wheelAccumulator = wheel.remainder
    if (wheel.steps === 0) return

    // Holds at either end rather than wrapping, so a touchpad swipe that runs
    // long stops on the last workspace.
    var ids = root.workspaceIds()
    var index = ids.indexOf(root.activeWorkspaceId())
    if (index === -1) return
    var target = ids[Util.clamp(index - wheel.steps, 0, ids.length - 1)]
    if (target !== ids[index]) root.focusWorkspace(target)
  }

  // The workspace each monitor shows carries its layout, and clicking the
  // focused workspace cycles to the next one, as Super + L does. The layout
  // itself is not shown: with marker styles the focused cell is the style's
  // focused marker, rendered in the accent color (WidgetButton active).

  // The layout commands act on the focused workspace, so a click on another
  // monitor's bar focuses that monitor first.
  function cycleLayout() {
    if (!root.bar) return
    var command = "omarchy-hyprland-workspace-layout-toggle"
    if (root.monitor && !root.monitor.focused) {
      command = "hyprctl dispatch " + Util.shellQuote("hl.dsp.focus({ monitor = \"" + root.monitorName + "\" })") + " >/dev/null && " + command
    }
    root.bar.run(command)
  }

  Connections {
    target: Hyprland
    function onRawEvent(event) {
      var name = event ? String(event.name) : ""
      // Quickshell credits every workspace switch to the focused monitor, as
      // the event doesn't say which one switched, and misses the workspace a
      // monitor falls back to when its own is moved away. Moving workspaces
      // between monitors switches the others, so ask Hyprland for the truth.
      // A workspace that changes number is only learned by asking too. Every
      // bar shares what Hyprland answers, so one asks after a plain switch.
      var switched = name === "workspacev2" && root.monitor !== null && root.monitor.focused
      if (switched || name === "moveworkspacev2" || name === "changeworkspaceid") {
        Hyprland.refreshMonitors()
        Hyprland.refreshWorkspaces()
      }
    }
  }

  readonly property real trailingGap: root.vertical ? 0 : Style.spaceReal(1.5)

  implicitWidth: grid.implicitWidth + trailingGap
  implicitHeight: grid.implicitHeight

  GridLayout {
    id: grid
    anchors.fill: parent
    anchors.rightMargin: root.trailingGap
    columns: root.vertical ? 1 : root.workspaceIds().length
    columnSpacing: root.vertical ? 0 : Style.space(1)
    rowSpacing: root.vertical ? Style.space(2) : 0

    Repeater {
      model: root.workspaceIds()

      WidgetButton {
        required property int modelData

        readonly property var state: Model.stateFor(modelData, root.workspaceValues, root.activeWorkspaceId())
        readonly property bool occupied: state.occupied
        readonly property bool shown: state.focused
        readonly property int slot: root.slotOf(modelData)
        readonly property bool firstGuest: root.blockOf(modelData) !== root.block && index > 0 && root.blockOf(root.workspaceIds()[index - 1]) === root.block
        required property int index

        // A gap sets visiting workspaces apart from the monitor's own.
        Layout.leftMargin: firstGuest && !root.vertical ? Style.space(6) : 0
        Layout.topMargin: firstGuest && root.vertical ? Style.space(6) : 0

        bar: root.bar
        // WidgetButton hides itself when its text is empty
        // (hasVisualContent), so a shape style keeps the slot number as
        // its text and hides the label instead of clearing it. Clearing
        // the text made the whole widget vanish: every cell went
        // invisible and the row collapsed to zero width.
        text: root.shapeStyle ? Model.labelFor(slot) : Model.markerFor(root.style, slot, shown, occupied)
        labelVisible: !root.shapeStyle
        active: shown
        opacity: occupied || shown ? 1 : 0.5

        // The ink the shape markers use: the same color the label gets
        // when focused (the bar's urgent role), foreground otherwise.
        readonly property color markerInk: shown ? (root.bar ? root.bar.urgent : Commons.Color.urgent) : Commons.Color.foreground

        // The accent color alone is not enough to spot the focused
        // workspace in the text styles, so the focused cell also gets a
        // slight dark chip behind its marker. The default style has its
        // own halo instead, so the chip stays off there.
        Rectangle {
          anchors.fill: parent
          anchors.margins: 1
          visible: shown && root.style !== "default"
          z: -1
          radius: Style.cornerRadius
          color: Qt.rgba(0, 0, 0, 0.28)
        }

        // Default, after Shibumi: a wide soft halo behind every cell and
        // a small pill marker inside it. Widths are Shibumi's (34/16 halo,
        // 26/8 marker); the halo replaces the chip in this style. The
        // marker is accent on the focused cell, like the text styles.
        Rectangle {
          anchors.centerIn: parent
          visible: root.style === "default"
          z: -1
          width: Style.space(shown ? 34 : 16)
          height: Style.space(16)
          radius: height / 2
          color: Qt.rgba(Commons.Color.foreground.r, Commons.Color.foreground.g, Commons.Color.foreground.b, shown ? 0.20 : occupied ? 0.18 : 0.06)
        }
        Rectangle {
          anchors.centerIn: parent
          visible: root.style === "default"
          width: Style.space(shown ? 26 : 8)
          height: Style.space(8)
          radius: height / 2
          color: shown || occupied ? markerInk : Qt.rgba(markerInk.r, markerInk.g, markerInk.b, 0.5)
        }

        // Aurora, after Shibumi: a thin pill bar, wider and brighter on
        // the focused workspace. The focused chip still applies here.
        Rectangle {
          anchors.centerIn: parent
          visible: root.style === "aurora"
          width: Style.space(shown ? 28 : occupied ? 6 : 4)
          height: Style.space(shown ? 3 : occupied ? 6 : 4)
          radius: height / 2
          color: markerInk
          opacity: shown ? 0.92 : occupied ? 0.62 : 0.18
        }
        horizontalMargin: 6
        verticalPadding: 6
        fixedWidth: root.vertical ? root.barSize : Style.space(root.shapeStyle ? 36 : 20)
        fixedHeight: root.barSize
        onPressed: function() {
          if (shown) root.cycleLayout()
          else root.focusWorkspace(modelData)
        }
        onWheelMoved: function(delta) { root.scrollWorkspaces(delta) }
      }
    }
  }
}
