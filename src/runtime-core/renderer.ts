import { effect } from "../reactivity/effect";
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
    patch(null, vnode, container, parentCompent);
  }
  //n1--旧的
  //n2--新的
  function patch(n1, n2, container, parentCompent) {
    const { shapeFlag, type } = n2;
    // Fragment --> 只渲染children
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentCompent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理element
          processElement(n1, n2, container, parentCompent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          //处理组件
          processComponent(n1, n2, container, parentCompent);
        }
    }
  }
  function processComponent(n1, n2, container: any, parentCompent) {
    mountComponent(n2, container, parentCompent);
  }
  function processElement(n1, n2, container: any, parentCompent) {
    if (!n1) {
      mountElement(n2, container, parentCompent);
    } else {
      patchElement(n1, n2, container);
    }
  }
  const EMPTY_OBJ = {};
  function patchElement(n1, n2, container) {
    console.log(n1);
    console.log(n2);
    console.log(container);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);
  }
  function patchProps(el, oldProps: any, newProps: any) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prewProp = oldProps[key];
        const nextProp = newProps[key];
        if (prewProp !== nextProp) {
          hostPatchProp(el, key, prewProp, nextProp);
        }
      }
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            const prewProp = oldProps[key];
            hostPatchProp(el, key, prewProp, null);
          }
        }
      }
    }
  }

  function mountComponent(initialVNode: any, container: any, parentCompent) {
    const instance = createComponentInstance(initialVNode, parentCompent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance: any, initialVNode, container: any) {
    effect(() => {
      // 初始化
      if (!instance.isMounted) {
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));
        patch(null, subTree, container, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        //更新
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const preSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(preSubTree, subTree, container, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      }
    });
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
      hostPatchProp(el, key, null, val);
    }
    // container.append(el);
    hostInsert(el, container);
  }

  function mountChildren(children, container, parentCompent) {
    for (const vnode of children) {
      patch(null, vnode, container, parentCompent);
    }
  }
  function processFragment(n1, n2, container: any, parentCompent) {
    mountChildren(n2.children, container, parentCompent);
  }
  function processText(n1, n2, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }
  return {
    createApp: createAppAPI(render),
  };
}
