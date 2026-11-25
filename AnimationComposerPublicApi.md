# Animation Composer for After Effects — Public ExtendScript API

This API lets scripts and AI agents running ExtendScript inside **Adobe After Effects** list Animation Composer
content (presets, precomps, animated fonts and sounds), apply presets to layers, add precomps, animated fonts and
sounds to compositions, and check which presets are currently applied to the selected layers.

| Method | Purpose |
| --- | --- |
| [`Content.getTransitionPresets`](#contentgettransitionpresets) | List transition presets (In/Out animations). |
| [`Content.getEffectPresets`](#contentgeteffectpresets) | List effect presets (looks/effects that aren't In/Out animations). |
| [`Content.getPrecomps`](#contentgetprecomps) | List precomps (ready-made animated compositions). |
| [`Content.getAnimatedFonts`](#contentgetanimatedfonts) | List animated fonts. |
| [`Content.getSounds`](#contentgetsounds) | List sounds. |
| [`Editor.applyTransitionPreset`](#editorapplytransitionpreset) | Apply a transition preset to the selected layers. |
| [`Editor.applyEffectPreset`](#editorapplyeffectpreset) | Apply an effect preset to the selected layers. |
| [`Editor.removePresets`](#editorremovepresets) | Remove applied transition and/or effect presets from the selected layers. |
| [`Editor.removePreset`](#editorremovepreset) | Remove one specific applied preset instance from the selected layers. |
| [`Editor.getAppliedPresets`](#editorgetappliedpresets) | List presets currently applied to the selected layers. |
| [`Editor.addPrecomp`](#editoraddprecomp) | Add a precomp to the active composition. |
| [`Editor.addAnimatedFont`](#editoraddanimatedfont) | Add text in an animated font to the active composition. |
| [`Editor.addSound`](#editoraddsound) | Add a sound to the active composition. |
| [`App.openTestPanel`](#appopentestpanel) | Open the Public API Test Panel, for trying calls by hand. |

## Requirements

- Animation Composer for After Effects 4.4.0 or newer is installed and loaded. The public API is available since
  version 4.4.0.
- The user is logged in to Animation Composer. If not, every method returns the error `User is not logged in.`
- Scripts run in After Effects' main ExtendScript engine (the default). Scripts that switch to a custom engine with
  `#targetengine` can't see the API.

Check that the API is available before you use it:

```js
typeof MisterHorseAnimationComposer !== "undefined"   // true when Animation Composer is running
MisterHorseAnimationComposer.apiVersion                // currently 1
MisterHorseAnimationComposer.docsPath                  // full path to this document, shipped with the installed plugin
```

`MisterHorseAnimationComposer` appears a few seconds after After Effects starts, once Animation Composer has loaded.

## How calls work

There is a single entry point:

```js
MisterHorseAnimationComposer.call(method, paramsJson, callback)
```

| Argument | Type | Description |
| --- | --- | --- |
| `method` | string | Method name, e.g. `"Content.getTransitionPresets"`. |
| `paramsJson` | string | Method params as a **JSON string**, e.g. `'{"id": "A1B", "animateIn": true}'`. Use `"{}"` or `undefined` for none. |
| `callback` | function | `function (error, result)`. `error` is `null` on success. Otherwise it's an object `{ type, message }`. |

Returns a request ID (string).

**All calls are asynchronous.** The callback never runs during the script that made the call. It runs shortly after
that script finishes, when After Effects is idle. This has three consequences:

1. **Don't wait for the result in the same script.** A loop or `$.sleep()` blocks After Effects, and the result
   never arrives.
2. **To read a result, store it in `$.global` from the callback and read it with a second script** (pattern below).
3. `MisterHorseAnimationComposer.call` throws right away only for invalid arguments, or when Animation Composer can't be
   reached. All other errors arrive through the callback.

### ExtendScript notes

- ExtendScript is ES3. **There is no `JSON` object**: don't use `JSON.stringify` / `JSON.parse` in scripts you
  generate. Write `paramsJson` as a string literal. To return results as text, use `value.toSource()`.
- Results the callback receives are already plain objects and arrays, so no parsing is needed.

### Recommended pattern for agents: call, then poll

**Script 1: start the call.** Its return value is the request ID.

```js
(function () {
    if (typeof MisterHorseAnimationComposer === "undefined") return "ERROR: Animation Composer is not running";
    $.global.__acResults = $.global.__acResults || {};
    var requestId = MisterHorseAnimationComposer.call("Content.getTransitionPresets", "{}", function (error, result) {
        $.global.__acResults[requestId] = { done: true, error: error, result: result };
    });
    $.global.__acResults[requestId] = { done: false };
    return requestId;
})();
```

**Script 2: run it again until `done` is true.** Replace `REQUEST_ID` with the value Script 1 returned.

```js
(function () {
    var entry = $.global.__acResults && $.global.__acResults["REQUEST_ID"];
    if (!entry) return "ERROR: unknown request";
    if (!entry.done) return "PENDING";
    delete $.global.__acResults["REQUEST_ID"];
    return entry.toSource();   // e.g. ({done:true, error:null, result:[...]})
})();
```

Results usually arrive within a fraction of a second. If Script 2 returns `PENDING`, wait briefly and run it again.

## Results of editor methods

Every `Editor.*` method that changes the project returns an **object** describing what actually changed, so a
script can tell a real change from a call that did nothing, and work with the new layers without depending on the
selection (by the time the callback runs, the user may have selected something else).

### Layer references

Methods that add layers return them as layer references:

```js
{
    id: 123,          // Layer.id - find the layer with app.project.layerByID(id)
    compId: 45,       // CompItem.id of the composition holding the layer - app.project.itemByID(compId)
    index: 1,         // 1-based layer index at the time the call finished (changes when layers are added/moved)
    name: "Title"     // layer name at the time the call finished
}
```

Prefer `id`: unlike `index` and `name`, it stays valid when layers are reordered or renamed.

```js
MisterHorseAnimationComposer.call("Editor.addPrecomp", '{"id": "…"}', function (error, result) {
    if (error) { alert(error.message); return; }
    var layer = app.project.layerByID(result.layers[0].id);
    layer.name = "Intro";
});
```

### Applied preset entries

`Editor.getAppliedPresets`, `Editor.apply*` and `Editor.remove*` describe applied preset instances as:

```js
{
    id: "A1B",                 // preset code, same as Content.get* and Editor.apply*
    name: "Slide In Left",
    type: "transitionIn",      // "transitionIn", "transitionOut" or "effect"
    instanceNumber: 1,         // 1, 2, … when the same preset is applied more than once to one layer
    layer: { id, compId, index, name }  // the layer the instance is applied to, see "Layer references"
}
```

## Methods

### Listing content

All `Content.get*` methods work the same way: each lists the items of one type available to the user in Animation
Composer, searching the whole library or one folder of it, including its subfolders.

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | array of strings | `[]` (whole library) | Folder to list from: folder names from the top level down, in the same form as the `path` field of the results, e.g. `["Essentials", "Slide"]`. Names must match exactly. |
| `onlyFavorites` | boolean | `false` | List only items the user marked as favorite in Animation Composer. |

**Result:** array of items:

```js
[
    {
        id: "A1B",                     // presets: 3-character preset code
        type: "transitionPreset",
        name: "Slide In Left",
        path: ["Essentials", "Slide"]
    },
    {
        id: "…",                       // other types: item ID
        type: "precomp",
        name: "Title 01 - Bold",
        path: ["Titles", "Simple"]
    }
    // ...
]
```

| Field | Description |
| --- | --- |
| `id` | Item ID. Pass it as the `id` param of the matching `Editor` method. For presets, it's the short preset code (3 characters, e.g. `"A1B"`) that Animation Composer shows in layer and effect names. |
| `type` | Item type: `"transitionPreset"`, `"effectPreset"`, `"precomp"`, `"animatedFont"` or `"sound"`. |
| `name` | Display name, as shown in Animation Composer. For an item variant, the variant name is appended after `" - "` (e.g. `"Title 01 - Bold"`). Names aren't unique across packs. |
| `path` | Folder that contains the item in the Animation Composer library: folder names from the top level down, without the item's own name. Variants of one item share the same `path`. Use it to tell apart items with the same name, or to search by category (e.g. `"Text"`, `"Glitch"`). |

The lists can contain hundreds of items. To find what the user asked for, filter by `name` and `path` instead of
showing everything, pass `path` to list only one folder, or pass `onlyFavorites` when the user asks for their
favorites.

**Example params:**

```js
'{}'                                   // whole library
'{"path": ["Essentials", "Slide"]}'    // only the "Essentials > Slide" folder and its subfolders
'{"onlyFavorites": true}'              // only the user's favorite items, from the whole library
```

**Errors:** `Path not found in tree: …` when `path` doesn't match a folder in the library.

### `Content.getTransitionPresets`

Lists transition presets (`type: "transitionPreset"`). Pass the `id` to `Editor.applyTransitionPreset`.
Params and result: see [Listing content](#listing-content).

### `Content.getEffectPresets`

Lists effect presets (`type: "effectPreset"`). Effect presets add a look or ongoing effect to a layer, rather than an
In/Out animation. Pass the `id` to `Editor.applyEffectPreset`. Params and result: see
[Listing content](#listing-content).

### `Content.getPrecomps`

Lists precomps (`type: "precomp"`): ready-made animated compositions, such as titles or backgrounds. Pass the
`id` to `Editor.addPrecomp`. Params and result: see [Listing content](#listing-content).

### `Content.getAnimatedFonts`

Lists animated fonts (`type: "animatedFont"`): fonts whose letters are animated. Pass the `id` to
`Editor.addAnimatedFont`. Params and result: see [Listing content](#listing-content).

### `Content.getSounds`

Lists sounds (`type: "sound"`): sound effects bundled with Animation Composer content. Pass the `id` to
`Editor.addSound`. Params and result: see [Listing content](#listing-content).

### `Editor.applyTransitionPreset`

Applies a transition preset to the **currently selected layers in the active composition**. The change is a single
undo step, named "AC: Apply preset".

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Preset `id` from `Content.getTransitionPresets`. |
| `animateIn` | bool | `false` | Apply as an **In** transition, at the layer's start. |
| `animateOut` | bool | `false` | Apply as an **Out** transition, at the layer's end. |
| `fixAmbiguousNames` | bool | `false` | Allow renaming the layer if its name isn't unique in the comp. |
| `allowOverwriteAPGrouping` | bool | `false` | Allow changing a text layer's *Anchor Point Grouping*. |
| `canOverwriteForeignExpressions` | bool | `false` | Allow overwriting the user's existing expressions. |
| `canConvertLayerTo3d` | bool | `false` | Allow converting a 2D layer to 3D, for presets that need 3D. |

At least one of `animateIn` / `animateOut` must be `true`. With both `true`, the preset is applied as both an In and
an Out transition.

**Result:** `{ applied: [ ... ] }`, the preset instances this call added, as
[applied preset entries](#applied-preset-entries). With both `animateIn` and `animateOut`, each layer gets two entries
(`transitionIn` and `transitionOut`). A selected layer that's missing from the list didn't get the preset (for example
because Animation Composer can't manage that layer). Pass an entry's `id`, `instanceNumber` and `type` to
`Editor.removePreset` to undo it.

**Before calling:** make sure a composition is active and the target layers are selected. You can do both in the
same script that makes the call, for example:

```js
var comp = app.project.activeItem;          // must be a CompItem
for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
comp.layer("Title").selected = true;
MisterHorseAnimationComposer.call("Editor.applyTransitionPreset", '{"id": "A1B", "animateIn": true}', callback);
```

**Example params:**

```js
'{"id": "A1B", "animateIn": true}'                      // In transition
'{"id": "A1B", "animateIn": true, "animateOut": true}'  // In and Out
```

### `Editor.applyEffectPreset`

Applies an effect preset to the **currently selected layers in the active composition**. The change is a single
undo step. Select the target layers first, the same way as for `Editor.applyTransitionPreset`.

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Preset `id` from `Content.getEffectPresets`. |
| `fixAmbiguousNames` | bool | `false` | Allow renaming the layer if its name isn't unique in the comp. |
| `allowOverwriteAPGrouping` | bool | `false` | Allow changing a text layer's *Anchor Point Grouping*. |
| `canOverwriteForeignExpressions` | bool | `false` | Allow overwriting the user's existing expressions. |
| `canConvertLayerTo3d` | bool | `false` | Allow converting a 2D layer to 3D, for presets that need 3D. |

Don't pass `animateIn` / `animateOut`: effect presets reject them.

**Result:** `{ applied: [ ... ] }`, the preset instances this call added, as
[applied preset entries](#applied-preset-entries). A selected layer that's missing from the list didn't get the
preset.

**Example params:**

```js
'{"id": "Q7M"}'
```

### `Editor.removePresets`

Removes Animation Composer presets that were applied to the **currently selected layers in the active composition**.
Select the target layers first, the same way as for `Editor.applyTransitionPreset`. The change is a single undo step,
named "AC Remove Presets".

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `inTransitions` | bool | `false` | Remove applied **In** transitions. |
| `outTransitions` | bool | `false` | Remove applied **Out** transitions. |
| `effects` | bool | `false` | Remove applied effect presets. |

At least one param must be `true`.

**Result:** `{ removed: [ ... ] }`, the preset instances this call removed, as
[applied preset entries](#applied-preset-entries).

- Removes every applied preset of the chosen kinds. To remove a single one, use `Editor.removePreset`.
- If no layer is selected, or the selected layers have no presets of the chosen kinds, nothing happens: the call
  still succeeds, with `removed: []`.
- A preset that can't be removed is skipped without an error, and isn't in `removed`.

**Example params:**

```js
'{"inTransitions": true, "outTransitions": true}'                    // all transitions
'{"inTransitions": true, "outTransitions": true, "effects": true}'   // everything
'{"effects": true}'                                                  // effect presets only
```

### `Editor.removePreset`

Removes one specific applied preset instance from the **currently selected layers in the active composition**,
identified by the `id`, `instanceNumber` and `type` of an entry from `Editor.getAppliedPresets`. Unlike
`Editor.removePresets`, this removes only that one instance, not every preset of its kind. The change is a single
undo step, named "AC Remove Preset".

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Preset `id` (preset code) from `Editor.getAppliedPresets`. |
| `instanceNumber` | integer | — (required) | `instanceNumber` from the same `Editor.getAppliedPresets` entry, to tell apart multiple applications of the same preset on one layer. |
| `type` | string | — (required) | `type` from the same `Editor.getAppliedPresets` entry: `"transitionIn"`, `"transitionOut"` or `"effect"`. |

All three params are required: `instanceNumber` only tells apart multiple instances on the *same* layer, not across
different selected layers (each layer numbers its own instances independently, so two selected layers can each have
their own instance `1` of the same preset). `type` is needed to identify the instance unambiguously.

**Result:** `{ removed: [ ... ] }`, the removed instances as [applied preset entries](#applied-preset-entries).

- If more than one selected layer has an instance matching all three params, all matching instances are removed,
  and `removed` has one entry per layer. To limit removal to one layer, select only that layer (its `layer.id` is in
  the `Editor.getAppliedPresets` entry).
- Get a fresh `id`/`instanceNumber`/`type` set from `Editor.getAppliedPresets` right before calling this: if the
  selection or its applied presets changed since you last listed them, the call fails with `Preset instance not
  found`.

**Example params:**

```js
'{"id": "A1B", "instanceNumber": 1, "type": "transitionIn"}'
```

**Errors:** `Preset instance not found` when no applied preset on the selected layers matches `id` and
`instanceNumber`.

### `Editor.getAppliedPresets`

Reports the Animation Composer presets currently applied to the **currently selected layers in the active
composition**. Use it to see what's already on the selected layers before applying or removing something.

**Params:** none.

**Result:** array of [applied preset entries](#applied-preset-entries), one per preset instance (a layer with the
same preset applied twice has two entries). Each entry's `layer` tells which selected layer the instance is on.

Returns `[]` when no layer is selected, or the selection has no applied presets.

**Example params:**

```js
'{}'
```

### `Editor.addPrecomp`

Adds a precomp to the **active composition** as a new layer, starting at the current time indicator. If layers are
selected, the new layer is placed above the topmost selected layer, otherwise at the top of the layer stack. When
the call finishes, the new layer is selected and the composition is opened in the viewer.

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Precomp `id` from `Content.getPrecomps`. |
| `animateIn` | bool | `true` | Include the precomp's In animation. |
| `animateOut` | bool | `true` | Include the precomp's Out animation. |
| `sound` | bool | `true` | Include the precomp's sound effects. |
| `replaceSelected` | bool | `false` | Replace the selected layer instead of adding a new one. Takes effect only when exactly one layer is selected and it's an Animation Composer precomp. |
| `keepOriginal` | bool | `false` | With `replaceSelected`: keep the original layer instead of removing it. |
| `keepTexts` | bool | `false` | With `replaceSelected`: copy the texts from the replaced precomp. |
| `keepTextProperties` | bool | `false` | With `replaceSelected`: copy text properties from the replaced precomp. |
| `keepTransform` | bool | `false` | With `replaceSelected`: copy the transform from the replaced layer. |
| `keepOtherProperties` | bool | `false` | With `replaceSelected`: copy the remaining editable properties from the replaced precomp. |
| `insertAsTexture` | bool | `false` | Use the selected layer as the precomp's texture. Takes effect only when exactly one layer is selected. |

**Result:** `{ layers: [ ... ] }` with the new precomp layer, as a [layer reference](#layer-references). With
`replaceSelected` it's the replacement layer (the replaced one is gone, or kept and disabled with `keepOriginal`). With
`insertAsTexture` it's the precomp layer, parented to the selected layer; helper layers the texture rig adds aren't
listed.

**Example params:**

```js
'{"id": "…"}'                                              // add a new layer
'{"id": "…", "animateOut": false, "sound": false}'         // without Out animation and sound
'{"id": "…", "replaceSelected": true, "keepTexts": true}'  // swap the selected precomp, keep its texts
```

### `Editor.addAnimatedFont`

Adds text written in an animated font to the **active composition** as a new layer. When the call finishes, the new
layer is selected.

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Animated font `id` from `Content.getAnimatedFonts`. |
| `text` | string | — (required) | Text to write. At most 30 characters, and only characters the font contains. |

**Result:** `{ layers: [ ... ] }` with the new animated font layer, as a [layer reference](#layer-references).

Make sure a composition is active first. Otherwise the call fails with `No active composition`.

**Example params:**

```js
'{"id": "…", "text": "Hello World"}'
```

### `Editor.addSound`

Adds a sound to the **active composition** as a new layer, starting at the current time indicator. If
`replaceSelected` is `true`, every currently selected audio-only layer is replaced instead — **not** limited to
layers Animation Composer inserted: any footage layer with no video track qualifies, including audio the user
imported directly. If more than one such layer is selected, all of them are replaced. When the call finishes, the
new (or replacement) layer(s) are selected.

**Params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | — (required) | Sound `id` from `Content.getSounds`. |
| `replaceSelected` | bool | `false` | Replace every selected audio-only layer instead of adding a new one. An empty selection, or one containing any non-audio layer, fails the call rather than falling back to adding a new layer. |
| `reverse` | bool | `false` | Play the sound in reverse. |
| `pitchShift` | integer | `0` | Pitch shift, in semitones. Must be between `-79` and `79`. |

**Result:** `{ layers: [ ... ] }`, the new sound layer, or with `replaceSelected` one replacement layer per replaced
layer, as [layer references](#layer-references), top to bottom.

Make sure a composition is active first. Otherwise the call fails with `No active composition`.

**Example params:**

```js
'{"id": "…"}'                                        // add a new layer
'{"id": "…", "reverse": true, "pitchShift": -5}'     // reversed, pitched down
'{"id": "…", "replaceSelected": true}'               // swap the selected sound
```

### `App.openTestPanel`

Opens the Public API Test Panel: an After Effects panel where you pick a method, edit its params and call it,
and see the results. It's meant for people writing scripts against this API, to try calls by hand. It isn't listed in
**Window → Extensions**. Besides this method, you can open it from the Animation Composer panel: click the menu button
(≡) in the panel's tab, then choose **Public API Test Panel**.

The panel calls `MisterHorseAnimationComposer.call` from its own ExtendScript, exactly like a script does, so it
behaves the same as your script would.

**Params:** none.

**Result:** `{}`.

## Errors

`error` is an object:

| Field | Description |
| --- | --- |
| `type` | Error category, e.g. `"Error"`, `"RetryableError"`, `"ApiError"`, `"UnhandledException"`. |
| `message` | Human-readable description. Messages from Animation Composer are written for end users. |
| `eventId` | Present only for unexpected internal errors (crash-report ID). |

### Errors that need a decision: retry with a permission param

Some operations are blocked until the caller explicitly allows a side effect. This applies to both apply methods. These errors have the type
`RetryableError`. **Ask the user, or follow the user's instructions, then call again with the matching param set to
`true`.**

| Message starts with | Retry with |
| --- | --- |
| "Name of the layer you want to apply the preset to must have a unique name…" | `"fixAmbiguousNames": true` |
| "This operation will change \"Anchor Point Grouping\" property…" | `"allowOverwriteAPGrouping": true` |
| "This operation will overwrite some of your expressions…" | `"canOverwriteForeignExpressions": true` |
| "This preset can be applied only to 3D layer. Would you like to convert…" | `"canConvertLayerTo3d": true` |

Several of these can occur in turn. Keep the params from previous retries when you call again.

### Common errors

| Message | Meaning / what to do |
| --- | --- |
| `User is not logged in.` | Ask the user to log in to Animation Composer. |
| `Unknown method: …` | Wrong method name. Names are case-sensitive. |
| `Invalid params: …` (type `ApiError`) | `paramsJson` isn't a valid JSON object string. |
| `No active composition` | Open or activate a composition first. |
| `Please select a layer` | Select at least one layer in the active comp. |
| `Item not found` | The `id` doesn't exist, e.g. a preset's `id` passed to `Editor.addPrecomp`. Get a fresh `id` from the matching `Content.get*` method. |
| `Locked item cannot be used.` | The `id` belongs to an item the user's plan doesn't currently unlock (e.g. past the free-tier user-library limit). `Content.get*` already excludes these, so this only happens with a stale or guessed `id`. |
| `Invalid preset id "…". …` (type `ApiError`) | A preset apply method got an `id` that isn't a preset code, e.g. a precomp's `id`. Use the `id` from `Content.getTransitionPresets` or `Content.getEffectPresets`. |
| `Item "…" is of a different type than this method expects. …` (type `ApiError`) | The `id` belongs to another item type, e.g. an animated font's `id` passed to `Editor.addPrecomp`. Use the `id` from the `Content.get*` method that matches the `Editor` method. |
| `Invalid preset type. Transition expected.` | `Editor.applyTransitionPreset` got an effect preset. Use `Editor.applyEffectPreset`. |
| `Invalid preset type. Effect expected.` | `Editor.applyEffectPreset` got a transition preset. Use `Editor.applyTransitionPreset`. |
| `Effect presets do not support animateIn and animateOut params.` | Remove `animateIn` / `animateOut` from `Editor.applyEffectPreset` params. |
| `Layer does not support effects.` | The selected layer type can't hold effects. Pick another layer. |
| `Applying transition preset requires at least one of animateIn or animateOut…` | Set `animateIn` and/or `animateOut` to `true`. |
| `At least one of inTransitions, outTransitions or effects must be true` | Set at least one `Editor.removePresets` param to `true`. |
| `Preset instance not found` | `Editor.removePreset`'s `id`/`instanceNumber`/`type` doesn't match any preset currently applied to the selected layers. Get a fresh set from `Editor.getAppliedPresets`. |
| `Invalid applied preset type "…". …` (type `ApiError`) | `Editor.removePreset`'s `type` isn't `"transitionIn"`, `"transitionOut"` or `"effect"`. Use the `type` from `Editor.getAppliedPresets`. |
| `Invalid parameter "pitchShift". Must be between -79 and 79.` (type `ApiError`) | `Editor.addSound`'s `pitchShift` is out of range. |
| `No audio layer selected` / `Please, select a layer containing audio footage.` | `Editor.addSound`'s `replaceSelected` is `true`, but nothing is selected, or the selection contains a layer that isn't an audio-only footage layer. |
| `Sorry, it's not possible to apply a preset to this kind of layer.` | Layer type isn't supported (e.g. camera, light). |
| `This preset can be applied only to Text Layer.` / `…only to Shape Layer` | Choose a matching layer. |
| `3D preset can only be applied to 3D layer.` | Retry with `canConvertLayerTo3d`, or pick a 3D layer. |
| `Preset can be used at most 9 times on one layer.` | Limit reached for this layer. |
| `Layer is locked. Please unlock it…` | Unlock the layer (`layer.locked = false`) if the user agrees. |
| `Project must be saved before inserting this preset…` | Save the project first. |
| `Text is empty` | Pass a non-empty `text` to `Editor.addAnimatedFont`. |
| `Text is too long. (max 30 characters)` | Shorten the `text` for `Editor.addAnimatedFont`. |
| `Some characters are not available in this font: …` | The animated font lacks the listed characters. Remove them, or pick another font. |
| `Path not found in tree: …` | The `path` param of a `Content.get*` method doesn't match a library folder. Names are case-sensitive; take them from the `path` field of earlier results. |
| `Unable to load precomp from disk…` | The precomp's pack is damaged or missing. Ask the user to reinstall it. |
| `Precomp import failed. After Effects … or newer is required…` | The precomp needs a newer After Effects. Tell the user. |

### Notes

- Use a preset's `id` with the apply method that matches its `type`: `"transitionPreset"` with
  `Editor.applyTransitionPreset`, `"effectPreset"` with `Editor.applyEffectPreset`.
- In rare cases, such as missing effect plugins, Animation Composer may show a warning dialog in After Effects after
  a preset is applied. The call still succeeds.
- `MisterHorseAnimationComposer.call` errors thrown synchronously (`MisterHorseAnimationComposer.call: ...`) mean
  invalid arguments, or that Animation Composer isn't reachable.
