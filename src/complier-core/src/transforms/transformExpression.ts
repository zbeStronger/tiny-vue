import { NodeTypes } from "../ast";

export function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpress(node.content);
  }
}
function processExpress(node: any) {
  node.content = `_ctx.${node.content}`;
  return node;
}
