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
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

function emit(instacne, event, ...args) {
    //   console.log("emit", event);
    const { props } = instacne;
    // tpp
    // 先写一个特定的行为--> 冲构成通用的行为
    const handlerName = toHandlerKey(event);
    const handler = props[handlerName];
    handler && handler(...args);
}

let targetMap = new Map();
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
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let deps = depsMap.get(key);
    triggerEffects(deps);
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
    console.log(parent);
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        children: {},
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
        const setupRes = setup(instance.props, { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupRes);
    }
}
function handleSetupResult(instance, setupRes) {
    if (typeof setupRes === "object") {
        instance.setupState = setupRes;
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
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element
                    processElement(vnode, container, parentCompent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    //处理组件
                    processComponent(vnode, container, parentCompent);
                }
        }
    }
    function processComponent(vnode, container, parentCompent) {
        mountComponent(vnode, container, parentCompent);
    }
    function processElement(vnode, container, parentCompent) {
        mountElement(vnode, container, parentCompent);
    }
    function mountComponent(initialVNode, container, parentCompent) {
        const instance = createComponentInstance(initialVNode, parentCompent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // vnode --> patch
        // vnode-->element --> mountElement
        patch(subTree, container, instance);
        initialVNode.el = subTree.el;
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
    function processFragment(vnode, container, parentCompent) {
        mountChildren(vnode.children, container, parentCompent);
    }
    function processText(vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    return {
        createApp: createAppAPI(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, value) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        el.setAttribute(key, value);
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
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

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
