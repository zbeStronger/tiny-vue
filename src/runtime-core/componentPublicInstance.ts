const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
};
export const PublicInstanceProxyHandlers = {
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
