const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
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
    $props: (i) => i.props,
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
        next: null,
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

function shouldUpdateComponent(prevNode, nextVNode) {
    const { props: prevProps } = prevNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

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

const queue = new Set();
let isFulshing = false;
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(fn) {
    queue.add(fn);
    queueFlush();
}
function queueFlush() {
    if (isFulshing)
        return;
    isFulshing = true;
    nextTick(flushJobs);
}
function flushJobs() {
    queue.forEach((job) => job());
    isFulshing = false;
}

function createRenderer(options) {
    const { createElement: hostCreateElemnt, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setTextElement: hostSetElementText, } = options;
    function render(vnode, container, parentComponent) {
        patch(null, vnode, container, null, parentComponent);
    }
    //n1--旧的
    //n2--新的
    function patch(n1, n2, container = null, anchor = null, parentComponent = null) {
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
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element
                    processElement(n1, n2, container, anchor, parentComponent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    //处理组件
                    processComponent(n1, n2, container, anchor, parentComponent);
                }
        }
    }
    function processComponent(n1, n2, container, anchor, parentComponent) {
        if (!n1) {
            mountComponent(n2, container, anchor, parentComponent);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function processElement(n1, n2, container, anchor, parentComponent) {
        if (!n1) {
            mountElement(n2, container, anchor, parentComponent);
        }
        else {
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
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                //1把老的清空，2然后设置新的
                unMountChildren(n1.children);
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                hostSetElementText(container, "");
                mountChildren(c2, container, anchor, parentComponent);
            }
            else {
                // array diff
                patchKeyedChildren(c1, c2, container, anchor, parentComponent);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
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
            }
            else {
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
            }
            else {
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
        }
        else if (i > e2 && i <= e1) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
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
                }
                else {
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
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - newStart] = i + 1;
                    patch(prevChild, c2[newIndex], container, null, parentComponent);
                    patched++;
                }
            }
            //最长递增子序列 （获得的是待处理newChild里的下标，代表不需要处理的节点）
            //最长递增子序列不需要连续
            const increasingNewIndexSequence = (moved && getSequence(newIndexToOldIndexMap)) || [];
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
                    }
                    else {
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
    function mountComponent(initialVNode, container, anchor, parentComponent) {
        // 虚拟节点上挂载instance实例，用于组件更新
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            // 初始化
            if (!instance.isMounted) {
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, anchor, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
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
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    function updateComponentPreRender(instacne, nextVNode) {
        instacne.vnode = nextVNode;
        instacne.next = null;
        instacne.props = nextVNode.props;
    }
    function mountElement(vnode, container, anchor, parentComponent) {
        // document.createElement(vnode.type)
        const el = (vnode.el = hostCreateElemnt(vnode.type));
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
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
    function processFragment(n1, n2, container, anchor, parentComponent) {
        mountChildren(n2.children, container, anchor, parentComponent);
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
function getSequence(arr) {
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
                }
                else {
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
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setTextElement,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, ref, renderSlots };
