import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return creatRoot(parseChildren(context));
}
function parseChildren(context) {
  const nodes: any[] = [];
  const node = parseInterpolation(context);
  nodes.push(node);
  return nodes;
}
function parseInterpolation(context) {
  // {{message}}
  if (context.source.startsWith("{{")) {
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
