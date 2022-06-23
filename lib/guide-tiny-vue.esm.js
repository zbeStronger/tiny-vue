const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    if (typeof children === "string") {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ARRAY_CHILDREN */;
    }
    // 组件类型 + children（object）= slots
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag = vnode.shapeFlag | 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
function isObject(val) {
    return val !== null && typeof val === "object";
}
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

let activeEffect;
let targetMap = new Map();
let shouldTrack = false;
// effect栈
const effectStack = [];
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        // 区分是否stop
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            // 执行fn会触发track逻辑，此时shouldTrack = false， 不会进行收集依赖
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        // effect嵌套处理，不处理的话内层effect会覆盖外层effect，导致外层副作用函数收集不到
        effectStack.push(this);
        const res = this._fn();
        effectStack.pop();
        if (effectStack.length > 0) {
            activeEffect = effectStack[effectStack.length - 1];
        }
        //reset
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop)
                this.onStop();
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
}
function isTracking() {
    return activeEffect !== undefined && !!shouldTrack;
}
function trackEffects(deps) {
    if (deps.has(activeEffect))
        return;
    deps.add(activeEffect);
    // 收集所有的effect
    activeEffect.deps.push(deps);
}
function triggerEffects(deps) {
    for (const effect of deps) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
    }
    trackEffects(deps);
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let deps = depsMap.get(key);
    triggerEffects(deps);
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    _effect.run();
    return runner;
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadOnlyGet = createGetter(true, true);
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REATIVE */) {
            return !isReadOnly;
        }
        else if (key === "__v_isReadOnly" /* IS_READONLY */) {
            return isReadOnly;
        }
        const res = Reflect.get(target, key);
        //浅只读
        if (shallow) {
            return res;
        }
        // 深响应
        if (isObject(res)) {
            if (isReadOnly) {
                return readonly(res);
            }
            else {
                return reactive(res);
            }
        }
        //  依赖收集
        if (!isReadOnly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter(isReadOnly = false) {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        //  触发依赖
        if (!isReadOnly) {
            trigger(target, key);
        }
        return res;
    };
}
const baseHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set: function (target, key, value) {
        console.warn(`key:${key} set失败， target是只读的`);
        return true;
    },
};
const shallowReadOnlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadOnlyGet,
});

function reactive(target) {
    return createActiveObject(target, baseHandlers);
}
function readonly(target) {
    return createActiveObject(target, readonlyHandlers);
}
// 创建响应式对象
function createActiveObject(target, handlers) {
    return new Proxy(target, handlers);
}
function shallowReadOnly(target) {
    return createActiveObject(target, shallowReadOnlyHandlers);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        // 存一个不是proxy对象的初始值，用来set时去做对比是否有修改
        this._rawValue = value;
        // 如果value是对象，用reactive处理
        this._value = convert(value);
        this._dep = new Set();
    }
    get value() {
        if (isTracking())
            trackEffects(this._dep);
        return this._value;
    }
    set value(newVal) {
        if (!hasChanged(this._rawValue, newVal))
            return;
        this._rawValue = newVal;
        this._value = convert(newVal);
        triggerEffects(this._dep);
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(val) {
    return !!val.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key) {
            const res = Reflect.get(target, key);
            return unRef(res);
        },
        set(target, key, value) {
            const val = Reflect.get(target, key);
            if (isRef(val) && !isRef(value)) {
                return (target[key].value = value);
            }
            else if (isRef(value)) {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function emit(instacne, event, ...args) {
    //   console.log("emit", event);
    const { props } = instacne;
    // tpp
    // 先写一个特定的行为--> 冲构成通用的行为
    const handlerName = toHandlerKey(event);
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    const props = (isObject(rawProps) && shallowReadOnly(rawProps)) || {};
    instance.props = props;
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get(target, key) {
        const instance = target._;
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        if (key in props) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instacne, children) {
    const { vnode } = instacne;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instacne.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

let currentInstance = null;
function createComponentInstance(vnode, parent) {
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
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    //TODO
    //initProps
    initProps(instance, instance.vnode.props);
    //initSlots
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
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
function handleSetupResult(instance, setupRes) {
    if (typeof setupRes === "object") {
        instance.setupState = proxyRefs(setupRes);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Compoent = instance.type;
    if (Compoent.render) {
        instance.render = Compoent.render;
    }
}
// 在setup中获取实例对象
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instacne) {
    currentInstance = instacne;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent && currentInstance.parent.provides;
        // 当前组件init ，也就是第一次调用provide
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key) {
    const currentInstance = getCurrentInstance();
    const { provides } = currentInstance;
    if (currentInstance) {
        if (key in provides) {
            return provides[key];
        }
    }
}
// export function inject(key) {
//   const currentInstance = getCurrentInstance();
//   if (currentInstance) {
//     return getParentProvides(currentInstance, key);
//   }
// }
// function getParentProvides(instacne, key) {
//   if (instacne.parent.provides[key]) {
//     return instacne.parent.provides[key];
//   } else {
//     return getParentProvides(instacne.parent, key);
//   }
// }

// import { render } from "./renderer";
function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先转换成vnode
                //component-->vnode
                //所有逻辑操作都会基于vnode做处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}
// rootComponent根组件 rootContainer根容器

function createRenderer(options) {
    const { createElement: hostCreateElemnt, patchProp: hostPatchProp, insert: hostInsert, } = options;
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
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element
                    processElement(n1, n2, container, parentCompent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    //处理组件
                    processComponent(n1, n2, container, parentCompent);
                }
        }
    }
    function processComponent(n1, n2, container, parentCompent) {
        mountComponent(n2, container, parentCompent);
    }
    function processElement(n1, n2, container, parentCompent) {
        if (!n1) {
            mountElement(n2, container, parentCompent);
        }
        else {
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
    function patchProps(el, oldProps, newProps) {
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
    function mountComponent(initialVNode, container, parentCompent) {
        const instance = createComponentInstance(initialVNode, parentCompent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            // 初始化
            if (!instance.isMounted) {
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
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
    function mountElement(vnode, container, parentCompent) {
        // document.createElement(vnode.type)
        const el = (vnode.el = hostCreateElemnt(vnode.type));
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
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
    function processFragment(n1, n2, container, parentCompent) {
        mountChildren(n2.children, container, parentCompent);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    return {
        createApp: createAppAPI(render),
    };
}

//创建元素
function createElement(type) {
    return document.createElement(type);
}
//设置属性
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        el.setAttribute(key, nextVal);
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal == null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
//插入元素
function insert(el, container) {
    container.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, ref, renderSlots };