#!/usr/bin/env bash
# Install the Nyxiri workspaces widget. Preferred install is Omarchy's own
# command, and this script is just a wrapper around it:
#
#   omarchy plugin add https://github.com/Deoxizn/nyxiri-workspaces.git --enable
#
# That clones a real checkout (so `omarchy plugin update` works) and
# validates the manifest. Re-running install removes any existing install
# first, because `plugin add` refuses when the id is already installed.
#
# --link is the live-editing escape hatch: a symlinked install, but note
# Omarchy's validator refuses symlinks inside a plugin folder, so
# `omarchy plugin update` always fails validation (and rolls back) on one.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
target=${NYXIRI_WORKSPACES_PLUGIN_DIR:-$HOME/.config/omarchy/plugins/devi.nyxiri-workspaces}
mode=add
workspaces_repo=${NYXIRI_WORKSPACES_REPO:-https://github.com/Deoxizn/nyxiri-workspaces.git}
yes_flags=()

usage() {
  cat <<'USAGE'
Usage: scripts/install.sh [--add|--clone|--link|--copy] [--yes] [--target DIR]

  --add    omarchy plugin add <url> --enable (default)
  --clone  git clone the repo origin into the plugin directory
  --link   symlink this checkout to the plugin directory (live editing;
           `omarchy plugin update` will fail validation on a symlink)
  --copy   copy the plugin files instead (no .git, so no plugin updates)
  --yes    pass --yes through to omarchy plugin add/remove (non-interactive)
  --target DIR  install elsewhere (default ~/.config/omarchy/plugins/devi.nyxiri-workspaces)
USAGE
}

while (( $# > 0 )); do
  case "$1" in
    --add) mode=add; shift ;;
    --clone) mode=clone; shift ;;
    --link) mode=link; shift ;;
    --copy) mode=copy; shift ;;
    --yes) yes_flags=(--yes); shift ;;
    --target) target=${2:?--target needs a directory}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'install: unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
done

mkdir -p -- "$(dirname -- "$target")"

[[ -n $target && $target != "/" && $target != "$HOME" ]] || {
  printf 'install: refusing to replace %s\n' "$target" >&2
  exit 1
}

remove_if_installed() {
  if [[ -e $target || -L $target ]]; then
    omarchy plugin remove devi.nyxiri-workspaces "${yes_flags[@]}"
  fi
}

if [[ $mode == add ]]; then
  command -v omarchy >/dev/null 2>&1 || {
    printf 'install: omarchy is not on PATH; use --clone, --link, or --copy instead\n' >&2
    exit 1
  }
  remove_if_installed
  omarchy plugin add "$workspaces_repo" --enable "${yes_flags[@]}"
elif [[ $mode == clone ]]; then
  url=$(git -C "$root" config --get remote.origin.url || true)
  [[ -n $url ]] || {
    printf 'install: cannot determine the repo origin URL; use --link, --copy, or omarchy plugin add <url>\n' >&2
    exit 1
  }
  rm -rf -- "$target"
  git clone -- "$url" "$target"
  printf 'cloned %s -> %s\n' "$url" "$target"
elif [[ $mode == link ]]; then
  rm -rf -- "$target"
  ln -s -- "$root" "$target"
  printf 'linked %s -> %s\n' "$root" "$target"
else
  rm -rf -- "$target"
  mkdir -p -- "$target"
  cp -- manifest.json WorkspaceModel.js BarWidget.qml README.md LICENSE "$target/"
  printf 'copied to %s\n' "$target/"
fi

printf '\nNext:\n'
printf '  omarchy-shell shell rescanPlugins\n'
printf '  omarchy plugin enable devi.nyxiri-workspaces\n'
printf '  omarchy bar put devi.nyxiri-workspaces\n'
printf '\nEnable moves the widget in. Put it where the old workspaces widget was,\nthen remove that one from the bar.\n'
