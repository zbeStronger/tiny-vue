import { isString } from "../../utils";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  helperNameMap,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";

export function generate(ast) {
  const context: any = createCodegenContext();
  const { push } = context;
  genFunctionPreamble(ast, context);
  const functionName = "render";
  const args = ["_ctx"];
  const signature = args.join(", ");
  push(` function ${functionName}(${signature}){`);
  push("return ");
  genNode(ast.codegenNode, context);
  push("}");
  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast: any, context) {
  const { push } = context;
  const aliasHelper = (s) => `${helperNameMap[s]}:_${helperNameMap[s]}`;

  if (ast.helpers.length > 0) {
    const VueBinging = "Vue";
    push(`const {${ast.helpers.map(aliasHelper).join(" , ")}} = ${VueBinging}`);
  }
  push("\n");
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
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpresss(node, context);
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
  push(`'${node.content}' `);
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

function genElement(node, context) {
  const { push, helper } = context;
  const { tag, children, props } = node;
  push(`${helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([tag, props, children]), context);
  push(")");
}
function genCompoundExpresss(node: any, context: any) {
  const { children } = node;
  const { push } = context;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
  }
}
function genNullable(args: any[]) {
  return args.map((arg) => arg || "null");
}
function genNodeList(nodes, context) {
  const { push } = context;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
      push(node);
    } else {
      genNode(node, context);
    }
    if (i < nodes.length - 1) {
      push(",");
    }
  }
}
