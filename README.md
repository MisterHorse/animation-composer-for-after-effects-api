# Animation Composer for After Effects: Public API

[Animation Composer](https://misterhorse.com/animation-composer) by Mister Horse has a large library of transitions,
effect presets, precomps, animated fonts and sounds. Animation Composer for After Effects has a public ExtendScript API
that lets scripts and AI agents use it:

- list presets, precomps, animated fonts and sounds
- apply transition and effect presets to the selected layers, check which ones are applied, and remove them
- add precomps, animated fonts and sounds to the active composition

This repo covers After Effects only. Animation Composer for Premiere and for DaVinci Resolve don't share this API.

## What's here

| File | For |
| --- | --- |
| [AnimationComposerPublicApi.md](AnimationComposerPublicApi.md) | The full API reference: methods, params, results and errors. |
| [AgentInstructions.md](AgentInstructions.md) | Instructions for AI agents that drive After Effects, e.g. through an After Effects MCP server. |
| [AtomSkill/](AtomSkill/) | A ready-made skill for [Atom](https://tryatom.ai). |

The same API reference ships with Animation Composer. In After Effects, `MisterHorseAnimationComposer.docsPath` gives
its location, and that copy always matches the version you have installed.

## Requirements

- Animation Composer for After Effects 4.4.0 or newer, installed and running. The public API is available since
  version 4.4.0.
- You're logged in to Animation Composer.

## Quick start

Check that the API is available:

```js
typeof MisterHorseAnimationComposer !== "undefined"   // true when Animation Composer is running
```

List transition presets. Calls are asynchronous, so the callback runs after your script finishes:

```js
MisterHorseAnimationComposer.call("Content.getTransitionPresets", "{}", function (error, result) {
    if (error) { alert(error.message); return; }
    alert(result.length + " transition presets");
});
```

See [How calls work](AnimationComposerPublicApi.md#how-calls-work) for reading results from another script, which is
what AI agents need.

To try calls by hand, open the Public API Test Panel: in the Animation Composer panel, open the panel's menu (next to
its name in the tab) and choose **Public API Test Panel**.

## License

[MIT](LICENSE)
