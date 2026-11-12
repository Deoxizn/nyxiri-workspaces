"use strict"

// QML's `.pragma library` directive is not valid JavaScript, so the test
// runner strips it and evaluates the module in a CommonJS-shaped scope in
// this realm, so deepEqual sees the same prototypes as the tests.
const fs = require("node:fs")
const path = require("node:path")

const source = fs.readFileSync(path.join(__dirname, "..", "WorkspaceModel.js"), "utf8")
const body = source.replace(/^\s*\.pragma\s+library\s*/, "")
const loaded = { exports: {} }
new Function("module", "exports", body + "\nmodule.exports = { normalize, visibleIds, stateFor, labelFor, markerFor, markerKind, slotOf, blockOf, positiveId, appsForWorkspace, appIdCandidates, webAppHost, appLabel, fallbackLetter, appKey, MAX_APPS, clampIconSize, ICON_SIZE_DEFAULT, ICON_SIZE_MIN, ICON_SIZE_MAX };")(loaded, loaded.exports)
module.exports = loaded.exports
