# Animation Composer skill for Atom AI

This is an [Atom](https://tryatom.ai) skill that teaches Atom to use Animation Composer in After Effects: list its
content, apply presets to layers, check which presets are applied and remove them, and add precomps, animated fonts
and sounds to compositions. It uses the Animation Composer public ExtendScript API (`MisterHorseAnimationComposer`).

The skill itself is short. On first use it runs `1.jsx` to read the full API reference that ships with the installed
Animation Composer plugin (`MisterHorseAnimationComposer.docsPath`). That way the instructions always match the plugin
version the user has, and the skill doesn't need updating when the API grows.

## Requirements

- Animation Composer for After Effects 4.4.0 or newer, installed and running.
- The user is logged in to Animation Composer.

## Install

Copy the `animation-composer` folder into Atom's global skills folder, then restart Atom:

- macOS: `~/Library/Application Support/atom/skills/`

To install it for one project only, copy the folder to `atom/skills/` next to the project's `.aep` file instead.

Check that it's installed under **Settings > Skills** in Atom.

## Use

- `/animation-composer add a slide-in transition to the title layer`
- `/animation-composer remove the Animation Composer transitions from the selected layers`
- Or ask in plain words, e.g. "Use Animation Composer to add a glitch effect to the selected layers".
