import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import type { Node, ObjectExpression } from "@babel/types";
import { VersionMapSchema, type VersionMap } from "./schema.js";

const traverse = (
  (traverseModule as unknown as { default?: typeof traverseModule }).default ?? traverseModule
);

const VERSION_KEY_RE = /^\d+\.\d+(?:\.\d+)?/;

function extractKey(node: Node): string | null {
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "Identifier") return node.name;
  if (node.type === "NumericLiteral") return String(node.value);
  return null;
}

function nodeToValue(node: Node | null | undefined): unknown {
  if (!node) return null;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "TemplateLiteral":
      return node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
    case "ArrayExpression":
      return node.elements.map((el) => nodeToValue(el));
    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type !== "ObjectProperty") continue;
        const key = extractKey(prop.key);
        if (key === null) continue;
        obj[key] = nodeToValue(prop.value as Node);
      }
      return obj;
    }
    default:
      return null;
  }
}

function hasVersionLikeKey(node: ObjectExpression): boolean {
  for (const prop of node.properties) {
    if (prop.type !== "ObjectProperty") continue;
    const key = extractKey(prop.key);
    if (key !== null && VERSION_KEY_RE.test(key)) return true;
  }
  return false;
}

export function tryParseVersionScript(jsContent: string): VersionMap | null {
  let ast;
  try {
    ast = parse(jsContent, { sourceType: "script", errorRecovery: true });
  } catch {
    return null;
  }

  let versionMap: VersionMap | null = null;

  traverse(ast, {
    ObjectExpression(path) {
      if (versionMap) {
        path.stop();
        return;
      }
      if (!hasVersionLikeKey(path.node)) return;
      const parsed = VersionMapSchema.safeParse(nodeToValue(path.node));
      if (parsed.success) {
        versionMap = parsed.data;
        path.stop();
      }
    },
  });

  return versionMap;
}
