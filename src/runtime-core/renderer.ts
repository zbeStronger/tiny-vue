import { effect } from "../reactivity/effect";
import { isObject } from "../utils/index";
import { ShapeFlags } from "../utils/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
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
    if (!n1) {
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      updateComponent(n1, n2);
    }
  }
  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
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
    // console.log(n1);
    // console.log(n2);
    // console.log(container);
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
    let e1 = c1.length - 1; // oldEndIndex
    let e2 = l2 - 1; // newEndIndex
    function isSameVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }
    // 左侧,找可复用的前置节点并且打补丁（patch）
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
    // 右侧,找可复用的前置节点并且打补丁（patch）
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
    } else if (i > e2 && i <= e1) {
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 中间对比
      let oldStart = i;
      let newStart = i;
      const toBePatched = e2 - newStart + 1;
      let patched = 0;
      let moved = false; //是否要移动
      let maxNewIndexSoFar = 0; // 当前最大索引值
      const keyTonewIndexMap = new Map();
      const newIndexToOldIndexMap = new Array(toBePatched);
      newIndexToOldIndexMap.fill(0);
      let newIndex;
      // 遍历新的，把差异区间内的子元素，建立映射表
      for (let i = newStart; i <= e2; i++) {
        const nextChild = c2[i];
        keyTonewIndexMap.set(nextChild.key, i);
      }
      // 遍历旧的，去映射表里找，看是否有匹配
      for (let i = oldStart; i <= e1; i++) {
        const prevChild = c1[i];
        // 处理完常规更新，旧children里剩下的都是要删除的
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }
        if (prevChild.key !== null) {
          // 记录能复用的节点的下标
          newIndex = keyTonewIndexMap.get(prevChild.key);
        } else {
          for (let j = newStart; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        //找不到，则删除
        if (newIndex === undefined) {
          hostRemove(prevChild.el);
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          newIndexToOldIndexMap[newIndex - newStart] = i + 1;
          patch(prevChild, c2[newIndex], container, null, parentComponent);
          patched++;
        }
      }
      //最长递增子序列 （获得的是待处理newChild里的下标，代表不需要处理的节点）
      //最长递增子序列不需要连续
      const increasingNewIndexSequence =
        (moved && getSequence(newIndexToOldIndexMap)) || [];
      let j = increasingNewIndexSequence.length - 1;

      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + newStart;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[newIndex + 1].el : null;
        //标记为0的说明要新增
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, anchor, parentComponent);
        }
        if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor);
            console.log("移动位置");
          } else {
            j--;
          }
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
    // 虚拟节点上挂载instance实例，用于组件更新
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode,
    container: any,
    anchor
  ) {
    instance.update = effect(
      () => {
        // 初始化
        if (!instance.isMounted) {
          const { proxy } = instance;
          const subTree = (instance.subTree = instance.render.call(proxy));
          patch(null, subTree, container, anchor, instance);
          initialVNode.el = subTree.el;
          instance.isMounted = true;
        } else {
          console.log("更新");
          //更新
          const { next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }
          const { proxy } = instance;
          const subTree = instance.render.call(proxy);
          const preSubTree = instance.subTree;
          instance.subTree = subTree;
          patch(preSubTree, subTree, container, anchor, instance);
          initialVNode.el = subTree.el;
          instance.isMounted = true;
        }
      },
      {
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }
  function updateComponentPreRender(instacne, nextVNode) {
    instacne.vnode = nextVNode;
    instacne.next = null;
    instacne.props = nextVNode.props;
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

function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
