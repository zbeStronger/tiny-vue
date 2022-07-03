import { NodeTypes, TagType } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return creatRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
  const nodes: any[] = [];
  while (!isEnd(context, ancestors)) {
    let node;
    const source = context.source;
    if (source.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (source[0] === "<") {
      if (/[a-z]/i.test(source[1])) {
        //   console.log("Element");
        node = parseElement(context, ancestors);
      }
    }
    if (!node) {
      node = parseText(context);
    }
    nodes.push(node);
  }

  return nodes;
}

function isEnd(context, ancestors) {
  // 1、source有值
  // 2、遇到结束标签
  const source = context.source;
  if (source.startsWith("</")) {
    for (let i = 0; i < ancestors.length; i++) {
      const tag = ancestors[i].tag;
      if (source.slice(2, 2 + tag.length) === tag) {
        return true;
      }
    }
  }
  // if (parentTag && source.startsWith(`</${parentTag}>`)) {
  //   return true;
  // }

  return !source;
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
  const rawCotent = parseTextData(context, rawContentLength);
  const content = rawCotent.trim();
  advanceBy(context, closeDelimiter.length);
  //   console.log(context);
  return {
    type: NodeTypes.INTERPOLATION,
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
function parseElement(context, ancestors) {
  const element: any = parseTag(context, TagType.START);

  ancestors.push(element);
  const children = parseChildren(context, ancestors);
  ancestors.pop();
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.END);
  } else {
    throw new Error(`缺失结束标签：${element.tag}`);
  }

  element.children = children;

  return element;
}
function startsWithEndTagOpen(source: string, tag: string) {
  return (
    startsWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}
function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
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

function parseText(context: any) {
  let endIndex = context.source.length;
  let endTokens = ["<", "{{"];
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  const content = parseTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content,
  };
}
function parseTextData(context, length) {
  const content = context.source.slice(0, length);
  advanceBy(context, content.length);
  return content;
}
