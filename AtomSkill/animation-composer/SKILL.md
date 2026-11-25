---
name: animation-composer
description: List Animation Composer content, apply, list and remove transition and effect presets on layers, and add precomps, animated fonts and sounds via its ExtendScript API
attachments:
  1: 'Read the Animation Composer API docs shipped with the installed plugin'
---

# Animation Composer

Animation Composer for After Effects (by Mister Horse) is a plugin with a large library of transition (In/Out) and effect
presets, precomps, animated fonts and sounds. When it's running, it exposes the `MisterHorseAnimationComposer` object
to ExtendScript, which you can use to list that content, apply presets to layers, check which presets are applied and
remove them, and add precomps, animated fonts and sounds to compositions.

## Before your first MisterHorseAnimationComposer call

1. Run attachment 1. It returns the full API reference that ships with the installed plugin (the file at
   `MisterHorseAnimationComposer.docsPath`), or a line starting with `ERROR:`.
2. Read the whole reference and follow it exactly. It's the source of truth for method names, params, results and
   errors, and it matches the installed version. Don't rely on memory or older copies.
3. If attachment 1 says Animation Composer isn't running, ask the user to install or start it
   (https://misterhorse.com/animation-composer), version 4.4.0 or newer, and stop. If it says `MisterHorseAnimationComposer.docsPath` is missing,
   ask the user to update Animation Composer.

## Rules that are easy to get wrong

- **Calls are asynchronous.** The callback runs only after your script has finished. Never wait for a result in the
  same script (no loops, no `$.sleep`). Store results in `$.global` from the callback and read them with a second
  script, as the reference shows.
- **ExtendScript is ES3, so there is no `JSON` object.** Write params as a JSON string literal, and use `toSource()`
  to return results.
- **Editor methods act on the active composition and its selected layers.** Activate the comp and select the target
  layers first, in the same script that makes the call.
- **Use what editor methods return.** `add*` methods return the new layers' ids (`app.project.layerByID(id)`), so
  don't rely on the selection to find them. `apply*`/`remove*` return the preset instances that changed: an empty
  list means nothing happened, so report it instead of claiming success.
- **Find items by filtering.** The content lists can be long. Filter them by `name` and `path`, or pass a folder
  `path` (or `onlyFavorites` for the user's favorites), instead of printing everything, and use `id` values exactly
  as returned.
- **Ask before you retry a `RetryableError`.** It means the operation needs permission for a side effect, such as
  renaming a layer or overwriting expressions. Ask the user, unless they already told you what to allow. Then retry
  with the matching flag from the reference, keeping any flags from earlier retries.
