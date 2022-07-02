import { NodeTypes, TagType } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return creatRoot(parseChildren(context));
}
function parseChildren(context) {
  let node;
  const nodes: any[] = [];
  const source = context.source;
  if (source.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (source[1]) {
    if (/[a-z]/i.test(source[1])) {
      //   console.log("Element");
      node = parseElement(context);
    }
  }

  nodes.push(node);
  return nodes;
}
function parseInterpolation(context) {
  // {{message}}
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );
  advanceBy(context, openDelimiter.length);
  const rawContentLength = closeIndex - openDelimiter.length;
  const rawCotent = context.source.slice(0, rawContentLength);
  const content = rawCotent.trim();
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}
function createParserContext(content: string) {
  return {
    source: content,
  };
}
function creatRoot(children) {
  return {
    children,
  };
}
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}
function parseElement(context): any {
  //1、 解析
  //2、 删除已处理的
  const element = parseTag(context, TagType.START);
  parseTag(context, TagType.END);
  return element;
}

function parseTag(context: any, type: TagType) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  if (type === TagType.END) return;
  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
  };
}
