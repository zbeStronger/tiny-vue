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
    next: null,
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
  if (typeof setupRes === "function") {
    // 如果返回的是 function 的话，那么绑定到 render 上
    // 认为是 render 逻辑
    // setup(){ return ()=>(h("div")) }
    instance.render = setupRes;
  } else if (typeof setupRes === "object") {
    // 返回的是一个对象的话
    // 先存到 setupState 上
    // 先使用 @vue/reactivity 里面的 proxyRefs
    // 后面我们自己构建
    // proxyRefs 的作用就是把 setupResult 对象做一层代理
    // 方便用户直接访问 ref 类型的值
    // 比如 setupResult 里面有个 count 是个 ref 类型的对象，用户使用的时候就可以直接使用 count 了，而不需要在 count.value
    // 这里也就是官网里面说到的自动结构 Ref 类型
    instance.setupState = proxyRefs(setupRes);
  }
  finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
  // 给 instance 设置 render

  // 先取到用户设置的 component options
  const Component = instance.type;

  if (!instance.render) {
    // 如果 compile 有值 并且当组件没有 render 函数，那么就需要把 template 编译成 render 函数
    if (compiler && !Component.render) {
      if (Component.template) {
        // 这里就是 runtime 模块和 compile 模块结合点
        const template = Component.template;
        Component.render = compiler(template);
      }
    }

    instance.render = Component.render;
  }

  // applyOptions()
}
// 在setup中获取实例对象
export function getCurrentInstance(): any {
  return currentInstance;
}

function setCurrentInstance(instacne) {
  currentInstance = instacne;
}
let compiler;
export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler;
}
