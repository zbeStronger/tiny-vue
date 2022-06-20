import { isObject } from "../utils/index";
import { ShapeFlags } from "../utils/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";
export function createRenderer(options) {
  const {
    createElement: hostCreateElemnt,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;
  function render(vnode, container, parentCompent) {
    patch(vnode, container, parentCompent);
  }

  function patch(vnode, container, parentCompent) {
    const { shapeFlag, type } = vnode;
    // Fragment --> 只渲染children
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentCompent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理element
          processElement(vnode, container, parentCompent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          //处理组件
          processComponent(vnode, container, parentCompent);
        }
    }
  }
  function processComponent(vnode: any, container: any, parentCompent) {
    mountComponent(vnode, container, parentCompent);
  }
  function processElement(vnode: any, container: any, parentCompent) {
    mountElement(vnode, container, parentCompent);
  }

  function mountComponent(initialVNode: any, container: any, parentCompent) {
    const instance = createComponentInstance(initialVNode, parentCompent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance: any, initialVNode, container: any) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode --> patch
    // vnode-->element --> mountElement
    patch(subTree, container, instance);
    initialVNode.el = subTree.el;
  }

  function mountElement(vnode: any, container: any, parentCompent) {
    // document.createElement(vnode.type)
    const el = (vnode.el = hostCreateElemnt(vnode.type));
    const { children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentCompent);
    }
    const { props } = vnode;
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, val);
    }
    // container.append(el);
    hostInsert(el, container);
  }

  function mountChildren(children, container, parentCompent) {
    for (const vnode of children) {
      patch(vnode, container, parentCompent);
    }
  }
  function processFragment(vnode: any, container: any, parentCompent) {
    mountChildren(vnode.children, container, parentCompent);
  }
  function processText(vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }
  return {
    createApp: createAppAPI(render),
  };
}
