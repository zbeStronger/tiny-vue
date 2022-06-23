import { shallowReadOnly } from "../reactivity/reactive";
import { proxyRefs } from "../reactivity/ref";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
let currentInstance = null;

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    children: {},
    isMounted: false,
    subTree: null,
    emit: () => {},
  };

  component.emit = emit.bind(null, component) as any;

  return component;
}

export function setupComponent(instance) {
  //TODO
  //initProps
  initProps(instance, instance.vnode.props);
  //initSlots
  initSlots(instance, instance.vnode.children);
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  const Compoent = instance.type;
  //ctx
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = Compoent;
  if (setup) {
    setCurrentInstance(instance);
    const setupRes = setup(shallowReadOnly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupRes);
  }
}
function handleSetupResult(instance, setupRes: any) {
  if (typeof setupRes === "object") {
    instance.setupState = proxyRefs(setupRes);
  }
  finishComponentSetup(instance);
}
function finishComponentSetup(instance: any) {
  const Compoent = instance.type;
  if (Compoent.render) {
    instance.render = Compoent.render;
  }
}
// 在setup中获取实例对象
export function getCurrentInstance(): any {
  return currentInstance;
}

function setCurrentInstance(instacne) {
  currentInstance = instacne;
}
