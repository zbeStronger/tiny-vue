import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
  createRootCodegen(root);
  root.helpers = [...context.helpers.keys()];
}
function traverseNode(node: any, context) {
  const children = node.children;
  const nodeTransforms = context.nodeTransforms;
  nodeTransforms.forEach((fn) => {
    fn(node);
  });

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
      traverseChildren(children, context);
      break;
    case NodeTypes.ELEMENT:
      traverseChildren(children, context);
      break;
    default:
      break;
  }
}
function traverseChildren(children, context) {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    traverseNode(node, context);
  }
}
function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1);
    },
  };
  return context;
}
function createRootCodegen(root: any) {
  root.codegenNode = root.children[0];
}
