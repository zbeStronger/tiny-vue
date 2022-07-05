import { NodeTypes } from "./ast";
import { helperNameMap, TO_DISPLAY_STRING } from "./runtimeHelpers";

export function generate(ast) {
  const context: any = createCodegenContext();
  const { push } = context;
  genFunctionPreamble(ast, context);
  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(", ");
  push(`function ${functionName} (${signature}){`);
  genNode(ast.codegenNode, context);
  push("}");
  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast: any, context) {
  const { push } = context;
  const aliasHelper = (s) => `${helperNameMap[s]} : _${helperNameMap[s]}`;

  if (ast.helpers.length > 0) {
    const VueBinging = "Vue";
    push(`const {${ast.helpers.map(aliasHelper).join(",")}} = ${VueBinging}`);
  }
  push("\n");
  push("return");
}

function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      getText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    default:
      break;
  }
}

function createCodegenContext() {
  const context = {
    code: "",
    helper(key) {
      return `_${helperNameMap[key]}`;
    },
    push(source) {
      context.code += source;
    },
  };
  return context;
}
function getText(node, context) {
  const { push } = context;
  push(`return '${node.content}' `);
}
function genInterpolation(node: any, context: any) {
  const { push, helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(")");
}
function genExpression(node: any, context: any) {
  const { push } = context;
  push(`${node.content}`);
}
