# Android SDK Setup (pet-genie)

This repository includes a helper script to add Android SDK environment variables to your shell profile.

Files added:

- `scripts/setup-android-env.sh` — idempotent script that appends an environment block to your shell profile (e.g. `~/.bashrc`, `~/.zshrc`, or `~/.profile`).

Quick usage:

1. Inspect the script if you like:

   bash scripts/setup-android-env.sh --help

2. Run the script (optionally pass your SDK path):

   bash scripts/setup-android-env.sh /path/to/Android/Sdk

   If you omit the path the script will use `$ANDROID_SDK_ROOT`, `$ANDROID_HOME`, or `~/Android/Sdk`.

3. Apply the changes in your current shell:

   source ~/.bashrc    # or source ~/.zshrc / source ~/.profile depending on your shell

What the script adds (example block):

```
# >>> pet-genie Android SDK config >>>
export ANDROID_SDK_ROOT="/home/you/Android/Sdk"
export ANDROID_HOME="/home/you/Android/Sdk"
export PATH="$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/tools/bin:$ANDROID_SDK_ROOT/platform-tools"
# <<< pet-genie Android SDK config <<<
```

Notes:
- The script is idempotent — running it multiple times will not duplicate the block.
- The script modifies the first writable profile it finds for your shell; check the script if you need a different target.
