# Turn a structured diagram into editable Draw.io XML

## Start from explicit elements

Use `create_flowchart_scene` when your input is a small ordered list of steps and connections. It places nodes in a row (`LR`) or column (`TB`). The tool does not choose an optimal graph layout. Review long labels and branches before exporting.

For a richer diagram, supply a scene directly: page width and height; nodes with IDs, positions and dimensions; optional text boxes; and edges referencing node IDs. Your AI client may help propose the scene, but this MCP does not look at an image and cannot verify the proposal against a screenshot.

## Validate before saving

Call `validate_diagram_scene`. A valid result confirms the supported structural rules, not visual similarity. Duplicate IDs and references to nonexistent nodes fail. An unsupported style is rejected rather than being silently removed.

Call `export_drawio` with the same scene after review. Choose `container: "file"` for a full uncompressed document, or `"model"` for a bare mxGraphModel. Node shapes and labels become editable cells; edge endpoints retain node references.

The tool only returns XML. Saving or opening it requires the client's own file/browser permissions. Keep existing diagrams and save to a new filename.

## When your starting point is an image

Extracting geometry from pixels is a different task. The separate [EditableImage](https://editableimage.com/) product offers image-to-editable-file workflows, including [image to Draw.io](https://editableimage.com/image-to-drawio). The MCP does not call that commercial service or spend credits.

Use the public [scene playground](https://huggingface.co/spaces/j-river/scene-to-drawio) to inspect the companion library separately. Its schematic preview is not a substitute for the final Draw.io rendering.

## Review what the model supplied

A model can invent an edge, reverse a relationship or omit a label while still producing valid scene JSON. Structural validation cannot discover those semantic mistakes. Compare content against your intended diagram, then adjust geometry and typography in Draw.io.
