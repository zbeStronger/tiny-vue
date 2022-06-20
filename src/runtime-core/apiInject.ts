import { getCurrentInstance } from "./component";
export function provide(key, value) {
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    let { provides } = currentInstance;
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides;
    // 当前组件init ，也就是第一次调用provide
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}
export function inject(key) {
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
