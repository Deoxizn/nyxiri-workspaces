import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import qs.Commons as Commons
import qs.Ui

// Standalone workspaces settings. A floating layer-shell window with the
// same controls as the bar's settings window Workspaces tab, for when the
// workspaces plugin runs on its own (stock Omarchy bar, no Nyxiri bar),
// where there is no bar settings window to open. Opened by right-clicking
// any workspace cell; the widget's toggleSettings() flips it.
// Every control writes through hostWidget.setWorkspaces(), which is the
// same updateEntryInline the bar's window uses, so the two stay in sync:
// both write to the same workspaces layout entry. When the bar IS
// installed, the bar's settings window is the primary UI and this is just
// an alternate door into the same settings.
PanelWindow {
  id: popup

  // `bar` is passed from the widget (the bar the widget sits on, Nyxiri
  // or stock); `hostWidget` is the workspaces widget root, which owns the
  // settings and the write mechanism.
  property var bar: null
  property var hostWidget: null

  // A real layer-shell surface, not a popup: it takes keyboard focus
  // natively, so the ranges field just works. Floating: it reserves no
  // bar space, and the mask limits input to the window body so clicks
  // outside it pass through to the windows below.
  color: "transparent"
  exclusionMode: ExclusionMode.Ignore
  WlrLayershell.namespace: "pizza.dirty.nyxiri-workspaces-settings"
  WlrLayershell.layer: WlrLayer.Overlay
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.OnDemand

  anchors {
    top: true
    bottom: true
    left: true
    right: true
  }

  // Close is named closeSettings, not close: PanelWindow is a QQuickWindow
  // and already has a close() method, which this must not shadow.
  function closeSettings() {
    if (hostWidget) hostWidget.settingsOpen = false
  }

  // ---------------------------------------------------------------- settings

  function wsSetting(name, fallback) {
    return hostWidget ? hostWidget.setting(name, fallback) : fallback
  }

  function setWorkspaces(patch) {
    if (hostWidget) hostWidget.setWorkspaces(patch)
  }

  // ------------------------------------------------------------------- classic

  // Classic workspaces mode, read from the workspaces plugin's bin/mode.
  // The mode is Hyprland state, not a widget setting, so this asks the
  // script instead of reading the layout entry. The script runs through
  // bash: pushes land mode 644, so it never runs directly.
  readonly property string classicModeScript: (Quickshell.env("HOME") || "") + "/.config/hexciri/plugins/pizza.dirty.nyxiri-workspaces/bin/mode"
  property bool classicMode: false
  property bool classicModeKnown: false
  property bool classicSwitching: false

  function refreshClassicMode() {
    if (modeStatus.running) return
    modeStatus.command = ["bash", popup.classicModeScript, "status"]
    modeStatus.running = true
  }

  function switchClassic(classic) {
    if (modeSwitch.running || popup.classicSwitching) return
    popup.classicSwitching = true
    modeSwitch.command = ["bash", popup.classicModeScript, classic ? "classic" : "4.5"]
    modeSwitch.running = true
  }

  // ------------------------------------------------------------------- ui

  onVisibleChanged: {
    if (visible) refreshClassicMode()
  }

  component SectionLabel: Text {
    color: Qt.darker(popup.bar.foreground, 1.35)
    font.family: popup.bar.fontFamily
    font.pixelSize: Style.font.title
    font.bold: true
    font.letterSpacing: 0.4
    textFormat: Text.PlainText
    topPadding: Style.space(16)
    bottomPadding: Style.spacing.md
  }

  // Sub-headers under a section (Mode, Style, ...): one step smaller than
  // a section header, still bigger than the old caption labels, with room
  // under them too.
  component SubLabel: Text {
    color: Qt.darker(popup.bar.foreground, 1.4)
    font.family: popup.bar.fontFamily
    font.pixelSize: Style.font.body
    font.bold: true
    textFormat: Text.PlainText
    bottomPadding: Style.spacing.sm
  }

  component BodyText: Text {
    color: popup.bar.foreground
    font.family: popup.bar.fontFamily
    font.pixelSize: Style.font.bodySmall
    textFormat: Text.PlainText
    verticalAlignment: Text.AlignVCenter
  }

  // A slider with its label on its own line above it. The label gets its
  // own line and the slider gets the whole width. `value` is bound to the
  // setting, `released` writes it back.
  component SliderRow: Column {
    id: sliderRow
    required property string label
    required property real value
    required property real minimum
    required property real maximum
    required property real step
    property bool integer: false
    required property string valueText
    signal released(real value)

    width: parent.width
    spacing: Style.spacing.xxs

    BodyText {
      text: sliderRow.label
      width: parent.width
    }

    Row {
      width: parent.width
      spacing: Style.spacing.sm

      PanelSlider {
        width: parent.width - sliderValue.width - parent.spacing
        bar: popup.bar
        value: sliderRow.value
        minimum: sliderRow.minimum
        maximum: sliderRow.maximum
        step: sliderRow.step
        integer: sliderRow.integer
        onReleased: function(value) { sliderRow.released(value) }
      }

      BodyText {
        id: sliderValue
        text: sliderRow.valueText
        width: Style.space(40)
        horizontalAlignment: Text.AlignRight
      }
    }
  }

  // Text input in a popup does not take keyboard focus on click by itself:
  // the click selects text but no cursor appears and keys go nowhere.
  // Stock panels force focus explicitly, deferred: forcing focus
  // synchronously during the press can run before the click has activated
  // the popup window, so it lands nowhere. This defers it the same way,
  // and lets the press through so cursor placement and selection keep
  // working. The field owns its text and only syncs from `settingText`
  // when the saved value actually changes, so typing is never clobbered
  // by an unrelated layout write. It commits on its own: 400ms after the
  // last keystroke, and immediately on Enter or focus loss, so typing
  // sticks however the window is left.
  component FocusField: TextField {
    signal commit(string value)

    property string settingText: ""
    onSettingTextChanged: {
      if (settingText !== text) text = settingText
      lastCommitted = settingText
    }

    property string lastCommitted: ""

    Component.onCompleted: lastCommitted = text

    function commitNow() {
      commitTimer.stop()
      if (text === lastCommitted) return
      lastCommitted = text
      commit(text)
    }

    Timer {
      id: commitTimer
      interval: 400
      onTriggered: commitNow()
    }

    onTextChanged: commitTimer.restart()
    onEditingFinished: commitNow()

    MouseArea {
      anchors.fill: parent
      acceptedButtons: Qt.LeftButton
      onPressed: function(mouse) {
        mouse.accepted = false
        var field = parent
        Qt.callLater(function() { field.forceActiveFocus() })
      }
    }
  }

  Shortcut {
    sequence: "Escape"
    enabled: popup.visible
    onActivated: popup.closeSettings()
  }

  // Classic workspaces mode: `bin/mode status` prints "classic" or
  // "4.5". The switch reloads Hyprland (a second or two), so the toggle
  // stays disabled until the status comes back and confirms the new mode.
  Process {
    id: modeStatus
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        var mode = String(text || "").trim()
        if (mode === "classic" || mode === "4.5") {
          popup.classicMode = mode === "classic"
          popup.classicModeKnown = true
        }
      }
    }
    stderr: StdioCollector { waitForEnd: true }
  }

  Process {
    id: modeSwitch
    stdout: StdioCollector { waitForEnd: true }
    stderr: StdioCollector { waitForEnd: true }
    onExited: function(exitCode) {
      popup.classicSwitching = false
      popup.refreshClassicMode()
    }
  }

  // The window body: a fixed-size surface centered on its screen. The
  // PanelWindow itself spans the screen (transparent) and the mask limits
  // input to this body, so clicks outside it pass through.
  BorderSurface {
    id: windowBody
    anchors.centerIn: parent
    width: Style.space(560)
    height: Style.space(600)
    radius: Style.cornerRadius
    color: popup.bar.background
    borderSpec: Border.flat(popup.bar.foreground, 1)

    Column {
      anchors.fill: parent
      anchors.margins: Style.spacing.md
      spacing: Style.spacing.sm

      Flickable {
        id: scrollArea
        width: parent.width
        height: parent.height - closeButton.height - parent.spacing
        contentWidth: width
        contentHeight: body.implicitHeight
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.VerticalFlick
        clip: true

        Column {
          id: body
          width: scrollArea.width
          spacing: Style.space(16)

          SectionLabel { text: "WORKSPACES" }

          // Dropdown popups open below the trigger and are clipped by
          // this window, so on a short tab the last options fall off the
          // bottom edge. Choice rows have nothing to clip.
          SubLabel { text: "Mode" }

          Row {
            width: body.width
            spacing: Style.spacing.xs

            Repeater {
              model: [
                { value: "10", label: "Ten" },
                { value: "5", label: "Five" },
                { value: "active", label: "Active only" }
              ]

              delegate: Button {
                required property var modelData
                width: (parent.width - parent.spacing * 2) / 3
                text: modelData.label
                selected: popup.wsSetting("mode", "10") === modelData.value
                bordered: !selected
                foreground: popup.bar.foreground
                onClicked: popup.setWorkspaces({ mode: modelData.value })
              }
            }
          }

          // In classic with a range set, the ranges decide how many
          // show, so Ten vs Five is a no-op: the modes are really a
          // 4.5 thing. Without a range, Mode still sets the count.
          Text {
            visible: popup.classicMode && popup.wsSetting("ranges", "") !== ""
            width: body.width
            text: "Modes really only for 4.5"
            color: Qt.darker(popup.bar.foreground, 1.4)
            font.family: popup.bar.fontFamily
            font.pixelSize: Style.font.caption
            wrapMode: Text.WordWrap
          }

          SubLabel { text: "Style" }

          // Eight styles no longer fit one row, so this one wraps: four
          // on each line.
          Flow {
            width: body.width
            spacing: Style.spacing.xs

            Repeater {
              model: [
                { value: "numbers", label: "Numbers" },
                { value: "kanji", label: "Kanji" },
                { value: "pacman", label: "Pac-Man" },
                { value: "dots", label: "Dots" },
                { value: "magic", label: "Magic" },
                { value: "default", label: "Default" },
                { value: "aurora", label: "Aurora" },
                { value: "apps", label: "Apps" }
              ]

              delegate: Button {
                required property var modelData
                width: (parent.width - parent.spacing * 3) / 4
                text: modelData.label
                selected: popup.wsSetting("style", "numbers") === modelData.value
                bordered: !selected
                foreground: popup.bar.foreground
                onClicked: popup.setWorkspaces({ style: modelData.value })
              }
            }
          }

          Toggle {
            width: body.width
            label: "Hide empty workspaces"
            description: popup.wsSetting("mode", "10") === "active" ? "Does nothing while Mode is Active only" : "Drops workspaces with no windows; the focused one always stays"
            checked: popup.wsSetting("hideEmpty", false) === true
            enabled: popup.wsSetting("mode", "10") !== "active"
            foreground: popup.bar.foreground
            onClicked: popup.setWorkspaces({ hideEmpty: !checked })
          }

          Toggle {
            width: body.width
            label: "Cycle layout on click"
            description: "Clicking the workspace you're already on switches tiling, scrolling, floating. Turn it off if a double-click keeps changing your layout."
            checked: popup.wsSetting("cycleLayoutOnClick", true) === true || popup.wsSetting("cycleLayoutOnClick", true) === "true"
            foreground: popup.bar.foreground
            onClicked: popup.setWorkspaces({ cycleLayoutOnClick: !checked })
          }

          // Classic workspaces is a Hyprland mode, not a widget setting:
          // the toggle runs the workspaces plugin's bin/mode, which flips
          // the flag and reloads Hyprland. The ranges field pins which
          // workspaces each monitor shows while classic is on.
          Toggle {
            width: body.width
            label: "Classic workspaces"
            description: popup.classicSwitching ? "Switching…" : popup.classicMode ? "One global set 1-10, as in Omarchy 4.0.6" : "Omarchy 4.5: each monitor has its own 1-10"
            checked: popup.classicMode
            enabled: popup.classicModeKnown && !popup.classicSwitching
            foreground: popup.bar.foreground
            onClicked: popup.switchClassic(!checked)
          }

          SubLabel {
            visible: popup.classicMode
            text: "Workspaces per monitor"
          }

          FocusField {
            visible: popup.classicMode
            width: body.width
            settingText: popup.wsSetting("ranges", "")
            placeholderText: "DP-1:1-5,HDMI-A-1:6-10"
            foreground: popup.bar.foreground
            font.family: popup.bar.fontFamily
            font.pixelSize: Style.font.body
            onCommit: function(value) { popup.setWorkspaces({ ranges: value }) }
          }

          // App icon size only matters for the Apps style, so the slider
          // only shows while that style is picked.
          SliderRow {
            visible: popup.wsSetting("style", "numbers") === "apps"
            label: "App icon size"
            value: popup.wsSetting("iconSize", 16)
            minimum: 12
            maximum: 24
            step: 1
            integer: true
            valueText: String(popup.wsSetting("iconSize", 16)) + "px"
            onReleased: function(value) { popup.setWorkspaces({ iconSize: value }) }
          }
        }
      }

      Button {
        id: closeButton
        width: parent.width
        text: "Close"
        bordered: true
        foreground: popup.bar.foreground
        onClicked: popup.closeSettings()
      }
    }
  }

  // Input goes only to the window body; the rest of the fullscreen surface
  // is transparent to the pointer.
  mask: Region { item: windowBody }
}
