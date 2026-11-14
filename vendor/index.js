// editableimage-mcp/vendor/source/index.ts
var SceneExportError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "SceneExportError";
    this.code = code;
  }
};
var FONT_KEYS = ["fontSize", "fontFamily", "fontColor", "bold", "align"];
var BOX_KEYS = ["id", "x", "y", "width", "height"];
function fail(code, message) {
  throw new SceneExportError(code, message);
}
function object(value, allowed, path) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail("INVALID_SCENE", `${path} must be a plain data object.`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.includes(key)) fail("INVALID_SCENE", `${path} has an unsupported field.`);
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value")) fail("INVALID_SCENE", `${path} cannot contain accessors.`);
  }
  return value;
}
function number(value, min, max, path) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail("INVALID_SCENE", `${path} is out of range.`);
  return value;
}
function text(value, max, path) {
  if (typeof value !== "string") fail("INVALID_SCENE", `${path} must be a string.`);
  if (value.length > max) fail("INPUT_TOO_LARGE", `${path} is too long.`);
  for (const char of value) {
    const c = char.codePointAt(0);
    if (!(c === 9 || c === 10 || c === 13 || c >= 32 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536)) {
      fail("INVALID_SCENE", `${path} contains an invalid XML character.`);
    }
  }
  return value;
}
function id(value, path) {
  const s = text(value, 80, path);
  if (!/^[a-zA-Z0-9_.:-]+$/.test(s)) fail("INVALID_SCENE", `${path} must be a non-empty ASCII identifier.`);
  return s;
}
function list(value, max, path) {
  if (!Array.isArray(value)) fail("INVALID_SCENE", `${path} must be an array.`);
  if (value.length > max) fail("INPUT_TOO_LARGE", `${path} exceeds its element limit.`);
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) fail("INVALID_SCENE", `${path} must be a plain array.`);
  }
  return Array.from({ length: value.length }, (_, i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) fail("INVALID_SCENE", `${path} cannot be sparse or contain accessors.`);
    return descriptor.value;
  });
}
function choice(value, values, path) {
  if (typeof value !== "string" || !values.includes(value)) fail("INVALID_SCENE", `${path} is unsupported.`);
  return value;
}
function boolean(value, path) {
  if (typeof value !== "boolean") fail("INVALID_SCENE", `${path} must be a boolean.`);
  return value;
}
function color(value, path, allowNone = false) {
  const s = text(value, 7, path);
  if (s === "none" && allowNone) return s;
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) fail("INVALID_SCENE", `${path} must be a hex color${allowNone ? " or none" : ""}.`);
  return (s.length === 4 ? "#" + [...s.slice(1)].map((c) => c + c).join("") : s).toLowerCase();
}
function font(r, out, path) {
  if (r.fontSize !== void 0) out.fontSize = number(r.fontSize, 1, 512, `${path}.fontSize`);
  if (r.fontColor !== void 0) out.fontColor = color(r.fontColor, `${path}.fontColor`);
  if (r.fontFamily !== void 0) {
    const family = text(r.fontFamily, 80, `${path}.fontFamily`);
    if (!/^[a-zA-Z0-9 _.,-]+$/.test(family)) fail("INVALID_SCENE", `${path}.fontFamily contains unsupported characters.`);
    out.fontFamily = family;
  }
  if (r.bold !== void 0) out.bold = boolean(r.bold, `${path}.bold`);
  if (r.align !== void 0) out.align = choice(r.align, ["left", "center", "right"], `${path}.align`);
}
function box(r, path) {
  return {
    id: id(r.id, `${path}.id`),
    x: number(r.x, -1e5, 1e5, `${path}.x`),
    y: number(r.y, -1e5, 1e5, `${path}.y`),
    width: number(r.width, 1e-3, 1e5, `${path}.width`),
    height: number(r.height, 1e-3, 1e5, `${path}.height`)
  };
}
function validateScene(input) {
  const r = object(input, ["width", "height", "nodes", "edges", "texts"], "scene");
  const width = number(r.width, 1, 1e5, "scene.width"), height = number(r.height, 1, 1e5, "scene.height");
  const rawNodes = list(r.nodes, 2e3, "nodes");
  const rawEdges = r.edges === void 0 ? [] : list(r.edges, 2e3, "edges");
  const rawTexts = r.texts === void 0 ? [] : list(r.texts, 2e3, "texts");
  if (rawNodes.length + rawEdges.length + rawTexts.length > 2e3) fail("INPUT_TOO_LARGE", "A scene may contain at most 2,000 elements.");
  const nodes = rawNodes.map((value, i) => {
    const path = `nodes[${i}]`;
    const item = object(value, [...BOX_KEYS, ...FONT_KEYS, "label", "shape", "fill", "stroke", "strokeWidth", "opacity"], path);
    const node = box(item, path);
    if (item.label !== void 0) node.label = text(item.label, 8192, `${path}.label`);
    if (item.shape !== void 0) node.shape = choice(item.shape, ["rectangle", "rounded-rectangle", "ellipse", "diamond", "cylinder"], `${path}.shape`);
    if (item.fill !== void 0) node.fill = color(item.fill, `${path}.fill`, true);
    if (item.stroke !== void 0) node.stroke = color(item.stroke, `${path}.stroke`, true);
    if (item.strokeWidth !== void 0) node.strokeWidth = number(item.strokeWidth, 0, 100, `${path}.strokeWidth`);
    if (item.opacity !== void 0) node.opacity = number(item.opacity, 0, 1, `${path}.opacity`);
    font(item, node, path);
    return node;
  });
  const texts = rawTexts.map((value, i) => {
    const path = `texts[${i}]`;
    const item = object(value, [...BOX_KEYS, ...FONT_KEYS, "text"], path);
    const label2 = { ...box(item, path), text: text(item.text, 8192, `${path}.text`) };
    font(item, label2, path);
    return label2;
  });
  const edges = rawEdges.map((value, i) => {
    const path = `edges[${i}]`;
    const item = object(value, ["id", "source", "target", "points", "label", "routing", "stroke", "strokeWidth", "startArrow", "endArrow", ...FONT_KEYS], path);
    const edge = { id: id(item.id, `${path}.id`) };
    if (item.source !== void 0) edge.source = id(item.source, `${path}.source`);
    if (item.target !== void 0) edge.target = id(item.target, `${path}.target`);
    if (item.label !== void 0) edge.label = text(item.label, 8192, `${path}.label`);
    if (item.points !== void 0) {
      edge.points = list(item.points, 128, `${path}.points`).map((p, j) => {
        const point = object(p, ["x", "y"], `${path}.points[${j}]`);
        return { x: number(point.x, -1e5, 1e5, `${path}.points.x`), y: number(point.y, -1e5, 1e5, `${path}.points.y`) };
      });
      if (edge.points.length < 2) fail("INVALID_SCENE", `${path}.points needs at least two endpoints.`);
    }
    if ((!edge.source || !edge.target) && !edge.points) fail("INVALID_SCENE", `${path} needs endpoint points for unbound ends.`);
    if (item.routing !== void 0) edge.routing = choice(item.routing, ["orthogonal", "straight"], `${path}.routing`);
    if (item.stroke !== void 0) edge.stroke = color(item.stroke, `${path}.stroke`, true);
    if (item.strokeWidth !== void 0) edge.strokeWidth = number(item.strokeWidth, 0, 100, `${path}.strokeWidth`);
    if (item.startArrow !== void 0) edge.startArrow = boolean(item.startArrow, `${path}.startArrow`);
    if (item.endArrow !== void 0) edge.endArrow = boolean(item.endArrow, `${path}.endArrow`);
    font(item, edge, path);
    return edge;
  });
  const ids = /* @__PURE__ */ new Set();
  for (const item of [...nodes, ...texts, ...edges]) {
    if (ids.has(item.id)) fail("DUPLICATE_ID", "Element IDs must be unique across nodes, texts and edges.");
    ids.add(item.id);
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) for (const end of [edge.source, edge.target]) {
    if (end !== void 0 && !nodeIds.has(end)) fail("UNKNOWN_REFERENCE", "An edge endpoint must reference an existing node.");
  }
  return { width, height, nodes, edges, texts };
}
var xml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
var label = (s) => xml(s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]).replace(/\r\n|\r|\n/g, "<br>"));
var f = (n) => String(Number(n.toFixed(3)));
var cellId = (s) => `cell_${s}`;
function dark(fill) {
  if (!/^#[0-9a-f]{6}$/.test(fill)) return false;
  const v = parseInt(fill.slice(1), 16);
  return 0.299 * (v >> 16) + 0.587 * (v >> 8 & 255) + 0.114 * (v & 255) < 127.5;
}
function fontStyle(item, defaultColor, defaultAlign) {
  return `fontSize=${f(item.fontSize ?? 16)};fontColor=${item.fontColor ?? defaultColor};fontFamily=${item.fontFamily ?? "Arial"};fontStyle=${item.bold ? 1 : 0};align=${item.align ?? defaultAlign};verticalAlign=middle;`;
}
function port(node, end, toward, prefix) {
  const sides = [
    { gap: node.y - toward.y, x: void 0, y: 0 },
    { gap: toward.x - node.x - node.width, x: 1, y: void 0 },
    { gap: toward.y - node.y - node.height, x: void 0, y: 1 },
    { gap: node.x - toward.x, x: 0, y: void 0 }
  ];
  let side = sides.reduce((best, candidate) => candidate.gap > best.gap ? candidate : best);
  if (side.gap <= 0) {
    const distances = [Math.abs(end.y - node.y), Math.abs(end.x - node.x - node.width), Math.abs(end.y - node.y - node.height), Math.abs(end.x - node.x)];
    side = sides[distances.indexOf(Math.min(...distances))];
  }
  const along = (v, start, size) => Math.max(0.15, Math.min(0.85, (v - start) / size));
  return `${prefix}X=${f(side.x ?? along(end.x, node.x, node.width))};${prefix}Y=${f(side.y ?? along(end.y, node.y, node.height))};${prefix}Dx=0;${prefix}Dy=0;${prefix}Perimeter=1;`;
}
function serialize(input, options, wrapped) {
  let opts;
  try {
    opts = object(options, ["pageName", "maxElements", "maxOutputBytes"], "options");
  } catch {
    fail("INVALID_OPTIONS", "Export options must be a plain object with supported fields.");
  }
  const pageName = opts.pageName === void 0 ? "Page-1" : text(opts.pageName, 256, "pageName");
  const maxElements = opts.maxElements ?? 2e3, maxOutputBytes = opts.maxOutputBytes ?? 4194304;
  if (typeof maxElements !== "number" || !Number.isInteger(maxElements) || maxElements < 0 || maxElements > 2e3 || typeof maxOutputBytes !== "number" || !Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 4194304) {
    fail("INVALID_OPTIONS", "Element/output limits may only lower their hard ceilings.");
  }
  const scene = validateScene(input);
  if (scene.nodes.length + scene.edges.length + scene.texts.length > maxElements) fail("INPUT_TOO_LARGE", "The scene exceeds maxElements.");
  const chunks = [];
  const encoder = new TextEncoder();
  let bytes = 0;
  const append = (chunk) => {
    bytes += encoder.encode(chunk).byteLength;
    if (bytes > maxOutputBytes) fail("OUTPUT_TOO_LARGE", "The generated XML exceeds maxOutputBytes.");
    chunks.push(chunk);
  };
  if (wrapped) append(`<mxfile host="scene-to-drawio" compressed="false"><diagram id="page-1" name="${xml(pageName)}">`);
  append(`<mxGraphModel grid="1" gridSize="10" guides="1" connect="1" arrows="1" page="1" pageScale="1" pageWidth="${f(scene.width)}" pageHeight="${f(scene.height)}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>`);
  const shapeStyles = { rectangle: "rounded=0;", "rounded-rectangle": "rounded=1;", ellipse: "ellipse;perimeter=ellipsePerimeter;", diamond: "rhombus;perimeter=rhombusPerimeter;", cylinder: "shape=cylinder3;boundedLbl=1;backgroundOutline=1;" };
  const geometry = (item) => `<mxGeometry x="${f(item.x)}" y="${f(item.y)}" width="${f(item.width)}" height="${f(item.height)}" as="geometry"/>`;
  for (const node of scene.nodes) {
    const shape = node.shape ?? "rectangle";
    const style = `${shapeStyles[shape]}${shape === "cylinder" ? `size=${f(node.height / 6)};` : ""}html=1;whiteSpace=wrap;fillColor=${node.fill ?? "#ffffff"};strokeColor=${node.stroke ?? "#64748b"};strokeWidth=${f(node.strokeWidth ?? 2)};opacity=${f((node.opacity ?? 1) * 100)};${fontStyle(node, dark(node.fill ?? "#ffffff") ? "#ffffff" : "#17211d", "center")}`;
    append(`<mxCell id="${cellId(node.id)}" value="${label(node.label ?? "")}" style="${style}" vertex="1" parent="1">${geometry(node)}</mxCell>`);
  }
  for (const t of scene.texts) {
    const style = `text;html=1;whiteSpace=wrap;fillColor=none;strokeColor=none;${fontStyle(t, "#17211d", "left")}`;
    append(`<mxCell id="${cellId(t.id)}" value="${label(t.text)}" style="${style}" vertex="1" parent="1">${geometry(t)}</mxCell>`);
  }
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const center = (n) => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 });
  for (const edge of scene.edges) {
    const source = edge.source === void 0 ? void 0 : nodes.get(edge.source);
    const target = edge.target === void 0 ? void 0 : nodes.get(edge.target);
    const points = edge.points ?? [center(source), center(target)];
    const start = points[0], end = points[points.length - 1];
    const autoLoop = source === target && source !== void 0 && edge.points === void 0;
    const ports = autoLoop ? "" : (source ? port(source, start, points[1], "exit") : "") + (target ? port(target, end, points[points.length - 2], "entry") : "");
    const style = `edgeStyle=${edge.routing === "straight" ? "none" : "orthogonalEdgeStyle"};rounded=0;orthogonalLoop=1;jettySize=auto;html=1;whiteSpace=wrap;${ports}strokeColor=${edge.stroke ?? "#64748b"};strokeWidth=${f(edge.strokeWidth ?? 2)};startArrow=${edge.startArrow ? "classic" : "none"};endArrow=${edge.endArrow === false ? "none" : "classic"};${fontStyle(edge, "#17211d", "center")}`;
    append(`<mxCell id="${cellId(edge.id)}" value="${label(edge.label ?? "")}" style="${style}" edge="1" parent="1"${source ? ` source="${cellId(source.id)}"` : ""}${target ? ` target="${cellId(target.id)}"` : ""}><mxGeometry relative="1" as="geometry">`);
    if (!source) append(`<mxPoint x="${f(start.x)}" y="${f(start.y)}" as="sourcePoint"/>`);
    if (!target) append(`<mxPoint x="${f(end.x)}" y="${f(end.y)}" as="targetPoint"/>`);
    if (points.length > 2) {
      append('<Array as="points">');
      for (const p of points.slice(1, -1)) append(`<mxPoint x="${f(p.x)}" y="${f(p.y)}"/>`);
      append("</Array>");
    }
    append("</mxGeometry></mxCell>");
  }
  append("</root></mxGraphModel>");
  if (wrapped) append("</diagram></mxfile>");
  return chunks.join("");
}
function toDrawioXml(scene, options = {}) {
  return serialize(scene, options, true);
}
function toDrawioModel(scene, options = {}) {
  return serialize(scene, options, false);
}
export {
  SceneExportError,
  toDrawioModel,
  toDrawioXml,
  validateScene
};
