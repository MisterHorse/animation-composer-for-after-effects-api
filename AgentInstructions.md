# Using Animation Composer for After Effects from AI agents

Animation Composer for After Effects has a public ExtendScript API for AI agents and scripts. Any agent that can
run ExtendScript in After Effects can use it, for example through a third-party After Effects MCP server or
[Atom](https://tryatom.ai). With it, an agent can:

- list Animation Composer's content: transition and effect presets, precomps, animated fonts and sounds
- apply presets to the selected layers, and remove them
- add precomps, animated fonts and sounds to the active composition

## Requirements

- Animation Composer for After Effects 4.4.0 or newer is installed and running.
- The user is logged in to Animation Composer.

## Instructions for the agent

Copy this into your agent's instructions or system prompt:

> Animation Composer (by Mister Horse) exposes the global `MisterHorseAnimationComposer` object to After Effects'
> main ExtendScript engine. Before your first call, run this script and read the whole reference it returns. It's the
> API reference for the installed version: follow it exactly, and don't rely on memory.
>
> ```js
> (function () {
>     if (typeof MisterHorseAnimationComposer === "undefined") return "ERROR: Animation Composer is not running";
>     var f = new File(MisterHorseAnimationComposer.docsPath);
>     f.encoding = "UTF-8";
>     if (!f.open("r")) return "ERROR: cannot read " + MisterHorseAnimationComposer.docsPath;
>     var text = f.read();
>     f.close();
>     return text;
> })();
> ```
>
> Rules that are easy to get wrong:
>
> - All calls go through `MisterHorseAnimationComposer.call(method, paramsJson, callback)`, and they're asynchronous:
>   the callback runs only after your script finishes. Don't wait in the same script (no loops, no `$.sleep`). Store
>   the result in `$.global` from the callback, then read it with a second script.
> - ExtendScript is ES3 and has no `JSON` object. Write `paramsJson` as a string literal, and return results with
>   `toSource()`.
> - Editor methods act on the active composition and its selected layers. Select the target layers in the same script
>   that makes the call.
> - If an error has type `RetryableError`, ask the user before you retry with the permission flag the reference
>   names.

## Notes

- Atom users can install our ready-made Atom skill instead: [Animation Composer skill for Atom](AtomSkill/).
- To try API calls by hand, open the Public API Test Panel. In the Animation Composer panel, click the menu button (≡)
  in its tab, then choose **Public API Test Panel**.
- The full API reference also ships with the plugin. In After Effects, `MisterHorseAnimationComposer.docsPath` gives
  its location.
