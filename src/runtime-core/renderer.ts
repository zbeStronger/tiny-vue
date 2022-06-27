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
    remove: hostRemove,
    setTextElement: hostSetElementText,
  } = options;
  function render(vnode, container, parentComponent) {
    patch(null, vnode, container, null, parentComponent);
  }
  //n1--旧的
  //n2--新的
  function patch(
    n1,
    n2,
    container = null,
    anchor = null,
    parentComponent = null
  ) {
    const { shapeFlag, type } = n2;
    // Fragment --> 只渲染children
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理element
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          //处理组件
          processComponent(n1, n2, container, anchor, parentComponent);
        }
    }
  }
  function processComponent(n1, n2, container: any, anchor, parentComponent) {
    mountComponent(n2, container, anchor, parentComponent);
  }
  function processElement(n1, n2, container: any, anchor, parentComponent) {
    if (!n1) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, anchor, parentComponent);
    }
  }
  const EMPTY_OBJ = {};
  function patchElement(n1, n2, container, anchor, parentComponent) {
    console.log(n1);
    console.log(n2);
    console.log(container);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    patchChildren(n1, n2, el, anchor, parentComponent);
    patchProps(el, oldProps, newProps);
  }
  function patchChildren(n1, n2, container, anchor, parentComponent) {
    const prevShapeFlag = n1.shapeFlag;
    const { shapeFlag } = n2;
    const c1 = n1.children;
    const c2 = n2.children;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //1把老的清空，2然后设置新的
        unMountChildren(n1.children);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "");
        mountChildren(c2, container, anchor, parentComponent);
      } else {
        // array diff
        patchKeyedChildren(c1, c2, container, anchor, parentComponent);
      }
    }
  }
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentAnchor,
    parentComponent
  ) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    function isSameVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }
    // 左侧
    while (i <= e1 && i <= e2) {
      const prevChild = c1[i];
      const nextChild = c2[i];
      if (isSameVNodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      } else {
        break;
      }
      i++;
    }
    // 右侧
    while (i <= e1 && i <= e2) {
      const prevChild = c1[e1];
      const nextChild = c2[e2];
      if (isSameVNodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 新的多，要创建
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, anchor, parentComponent);
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 中间对比
      let s1 = i;
      let s2 = i;
      const toBePatched = e2 - s2 + 1;
      let patched = 0;
      const keyTonewIndexMap = new Map();
      let newIdx;
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyTonewIndexMap.set(nextChild.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          break;
        }
        if (prevChild.key !== null) {
          newIdx = keyTonewIndexMap.get(prevChild.key);
        } else {
          for (let j = s2; j < e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIdx = j;
              break;
            }
          }
        }
        if (newIdx === undefined) {
          hostRemove(prevChild.el);
        } else {
          patch(prevChild, c2[newIdx], container, null, parentComponent);
          patched++;
        }
      }
    }
  }

  function unMountChildren(children) {
    for (let i; i < children.length - 1; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
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

  function mountComponent(
    initialVNode: any,
    container: any,
    anchor,
    parentComponent
  ) {
    const instance = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode,
    container: any,
    anchor
  ) {
    effect(() => {
      // 初始化
      if (!instance.isMounted) {
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));
        patch(null, subTree, container, anchor, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        //更新
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const preSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(preSubTree, subTree, container, anchor, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      }
    });
  }

  function mountElement(vnode: any, container: any, anchor, parentComponent) {
    // document.createElement(vnode.type)
    const el = (vnode.el = hostCreateElemnt(vnode.type));
    const { children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, anchor, parentComponent);
    }
    const { props } = vnode;
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val);
    }
    // container.append(el);
    hostInsert(el, container, anchor);
  }

  function mountChildren(children, container, anchor, parentComponent) {
    for (const vnode of children) {
      patch(null, vnode, container, anchor, parentComponent);
    }
  }
  function processFragment(n1, n2, container: any, anchor, parentComponent) {
    mountChildren(n2.children, container, anchor, parentComponent);
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
