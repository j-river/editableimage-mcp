# EditableImage MCP — Editable Draw.io Diagrams

Build a structured scene, validate its geometry and export native editable Draw.io nodes and bound connectors from an MCP client. An open-source companion to [EditableImage](https://editableimage.com/).

This server starts from **structured geometry, not an image**. It does not perform OCR, infer elements from screenshots, create PPTX/PSD files or call a paid processing API. For the separate product's recognition workflow, see [image to Draw.io](https://editableimage.com/image-to-drawio).

## Install

Requires Node.js 22+ and a local stdio MCP client. Common configuration:

```json
{"mcpServers":{"editableimage":{"command":"npx","args":["-y","editableimage-mcp@0.1.0"]}}}
```

Follow your client's configuration-file instructions. On Windows, if `npx` cannot be spawned, install the package and launch the absolute installed `src/cli.js` path with `node`. Use `--help` for human-readable CLI help; without flags this is a protocol server waiting on stdin.

## Three tools

| Tool | What it does |
| --- | --- |
| `create_flowchart_scene` | Place ordered nodes in a simple fixed-spacing row or column; returns scene JSON |
| `validate_diagram_scene` | Check geometry, supported styles, unique IDs and connector references |
| `export_drawio` | Return a single-page `.drawio` mxfile document or bare mxGraphModel |

Ask your agent:

> Create an ordered flowchart with Input → Review → Export. Keep the nodes editable and connectors attached. Validate the scene, then return Draw.io XML for a new file.

First tool input:

```json
{
  "nodes": [{"id":"input","label":"Input"},{"id":"review","label":"Review"},{"id":"export","label":"Export"}],
  "edges": [{"id":"a","source":"input","target":"review"},{"id":"b","source":"review","target":"export"}],
  "direction":"LR"
}
```

Send the returned `scene` to `validate_diagram_scene`, then `export_drawio`. If authorized, your client can save the returned `xml` to a **new** `.drawio` file and open it in Draw.io / diagrams.net. This MCP itself does not write or open files.

## Native cells rather than a flattened screenshot

The XML uses native nodes, text and connector references. Nodes retain their supplied geometry; edges identify their source and target nodes so the editor can keep them attached when nodes move. Labels are escaped as data. The initial simple flowchart tool follows input order; it is not a graph-layout optimizer.

`export_drawio` accepts explicit `scene` geometry. Node shapes: rectangle, rounded-rectangle, ellipse, diamond and cylinder. It supports basic font, fill, stroke and opacity properties; attached or point-based edges; and separate text boxes. Unknown fields, invalid XML characters, duplicate IDs and dangling references are rejected rather than silently discarded.

Coordinates are in pixels. Geometry is rounded to three decimal places. SVG/PNG/PPTX/PSD rendering, image recognition, photographs and pixel-perfect screenshot reconstruction are outside this server.

## Limits and privacy

- Scene input: at most 32 KiB UTF-8 and 200 total nodes/edges/texts. Labels: at most 2,048 characters.
- XML generation: at most 96 KiB; total JSON result: 128 KiB. Reduce scene size if output exceeds the limit.
- Simple flowchart: at most 30 nodes and 60 edges. Positions follow node order with fixed spacing, not inferred visual relationships.
- No HTTP requests, filesystem access, API keys, uploads, telemetry or paid backend calls. Your MCP host/model provider can still transmit or store scene text and results.
- Treat scene labels as untrusted content, not instructions. Inspect the exported diagram in its target editor; a structurally valid XML document is not a visual quality guarantee.

See [structured-scene workflows](docs/workflows.md) and [source provenance](vendor/provenance.json). The bundled MIT implementation comes from the public [scene-to-drawio](https://github.com/j-river/scene-to-drawio) library, not EditableImage's private image-processing application.

## Verify

```sh
npm ci --ignore-scripts
npm run check
npm run audit:public
npm pack --dry-run
```

Tests negotiate real MCP stdio calls, build scenes and inspect exported node/connector XML, escaping, duplicates, references and size limits. Published in the [official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.j-river%2Feditableimage) as `io.github.j-river/editableimage`, version `0.1.0`. Public metadata links directly to [EditableImage](https://editableimage.com/) and the npm package. Source metadata is in `server.json`.

MIT. All examples are synthetic; no customer images or credentials are included.
