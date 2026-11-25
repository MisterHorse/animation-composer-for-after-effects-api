// Returns the Animation Composer public API reference shipped with the installed plugin
// (MisterHorseAnimationComposer.docsPath).
(function () {
    if (typeof MisterHorseAnimationComposer === "undefined")
        return "ERROR: Animation Composer is not running in After Effects (MisterHorseAnimationComposer is undefined).";
    if (!MisterHorseAnimationComposer.docsPath)
        return "ERROR: MisterHorseAnimationComposer.docsPath is missing. This Animation Composer version is too old, " +
               "ask the user to update it.";

    var file = new File(MisterHorseAnimationComposer.docsPath);
    if (!file.exists)
        return "ERROR: API docs not found at " + MisterHorseAnimationComposer.docsPath +
               ". Ask the user to reinstall Animation Composer.";

    file.encoding = "UTF-8";
    if (!file.open("r"))
        return "ERROR: cannot open " + MisterHorseAnimationComposer.docsPath + ": " + file.error;
    var text = file.read();
    file.close();
    return text;
})();
