import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { Node } from "@babel/types";
import { VersionMapSchema, type VersionMap } from "./schema.js";

const traverse = ((_traverse as any).default ?? _traverse) as typeof _traverse;

function extractKey(key: Node): string {
  if (key.type === "StringLiteral") return key.value;
  if (key.type === "Identifier") return key.name;
  return String((key as any).value);
}

function nodeToValue(node: Node | null | undefined): unknown {
  if (!node) return null;
  switch (node.type) {
    case "StringLiteral":
      return node.value;
    case "NumericLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "TemplateLiteral":
      return node.quasis.map((q) => q.value.raw).join("...");
    case "ArrayExpression":
      return node.elements.map((el) => nodeToValue(el));
    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type !== "ObjectProperty") continue;
        obj[extractKey(prop.key)] = nodeToValue(prop.value as Node);
      }
      return obj;
    }
    case "CallExpression":
    case "UnaryExpression":
      return null;
    default:
      return undefined;
  }
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
    VariableDeclarator(path) {
      const init = path.node.init;
      if (init?.type !== "ObjectExpression") return;
      const firstProp = init.properties[0];
      if (firstProp?.type !== "ObjectProperty") return;
      if (/^\d+\.\d+/.test(extractKey(firstProp.key))) {
        try {
          versionMap = VersionMapSchema.parse(nodeToValue(init));
        } catch {
        }
        if (versionMap) path.stop();
      }
    },
  });

  return versionMap;
}
