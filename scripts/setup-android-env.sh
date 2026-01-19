#!/usr/bin/env bash
set -euo pipefail

# scripts/setup-android-env.sh
# Idempotently add Android SDK environment variables to a shell profile.

DEFAULT_SDK="$HOME/Android/Sdk"

print_usage() {
  cat <<EOF
Usage: $0 [SDK_PATH]

If SDK_PATH is omitted, the script uses the first of:
  - the provided argument
  - the current ANDROID_SDK_ROOT or ANDROID_HOME env var
  - $DEFAULT_SDK

This script appends an idempotent block to your shell profile (e.g. ~/.bashrc, ~/.zshrc, or ~/.profile).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  print_usage
  exit 0
fi

SDK_PATH="${1:-${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$DEFAULT_SDK}}}"

# Determine profile file to modify
SHELL_NAME="$(basename "${SHELL:-/bin/sh}")"
PROFILE="$HOME/.bashrc"
if [[ "$SHELL_NAME" == "zsh" && -w "$HOME/.zshrc" ]]; then
  PROFILE="$HOME/.zshrc"
elif [[ -w "$HOME/.profile" ]]; then
  PROFILE="$HOME/.profile"
fi

MARKER_START="# >>> pet-genie Android SDK config >>>"
MARKER_END="# <<< pet-genie Android SDK config <<<"

BLOCK="$MARKER_START
export ANDROID_SDK_ROOT=\"$SDK_PATH\"
export ANDROID_HOME=\"$SDK_PATH\"
export PATH=\"\$PATH:\$ANDROID_SDK_ROOT/emulator:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:\$ANDROID_SDK_ROOT/tools:\$ANDROID_SDK_ROOT/tools/bin:\$ANDROID_SDK_ROOT/platform-tools\"
$MARKER_END
"

echo "Using SDK path: $SDK_PATH"
echo "Modifying profile: $PROFILE"

# Ensure profile exists
if [[ ! -f "$PROFILE" ]]; then
  echo "Creating profile file: $PROFILE"
  touch "$PROFILE"
fi

# Idempotent append
if grep -Fq "$MARKER_START" "$PROFILE"; then
  echo "Android SDK block already present in $PROFILE; updating block." 
  # replace existing block
  awk -v start="$MARKER_START" -v end="$MARKER_END" -v block="$BLOCK" '
    $0 == start { inblock=1; print block; next }
    $0 == end { inblock=0; next }
    !inblock { print }
  ' "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
else
  echo "Appending Android SDK block to $PROFILE"
  printf "\n%s\n" "$BLOCK" >> "$PROFILE"
fi

echo "Done. To apply changes run:"
echo "  source $PROFILE"
echo "Or open a new terminal session."

exit 0
