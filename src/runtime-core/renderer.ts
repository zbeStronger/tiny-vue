import { isObject } from "../utils/index";
import { ShapeFlags } from "../utils/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  patch(vnode, container);
}

function patch(vnode, container) {
  const { shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.ELEMENT) {
    // 处理element
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    //处理组件
    processComponent(vnode, container);
  }
}
function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}
function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountComponent(initialVNode: any, container: any) {
  const instance = createComponentInstance(initialVNode);
  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container: any) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);
  // vnode --> patch
  // vnode-->element --> mountElement
  patch(subTree, container);
  initialVNode.el = subTree.el;
}

function mountElement(vnode: any, container: any) {
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }
  const { props } = vnode;
  for (const key in props) {
    const val = props[key];
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const isOn = (key: string) => /^on[A-Z]/.test(key);
      if (isOn(key)) {
        el.setAttribute(key, val);
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
      } else {
        el.setAttribute(key, val);
      }
    }
  }
  container.append(el);
}

function mountChildren(children, container) {
  for (const vnode of children) {
    patch(vnode, container);
  }
}
