import { createRenderer } from "../runtime-core";
//创建元素
function createElement(type) {
  return document.createElement(type);
}
//设置属性
function patchProp(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    el.setAttribute(key, nextVal);
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal == null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}
//插入元素
function insert(el, container, anchor) {
  // container.append(el);
  container.insertBefore(el, anchor || null);
}
function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}
function setTextElement(el, text) {
  el.textContent = text;
}
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setTextElement,
});

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
