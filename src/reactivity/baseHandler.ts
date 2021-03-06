import { extend, isObject } from "../utils/index";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadOnlyGet = createGetter(true, true);

function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REATIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlags.IS_READONLY) {
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
      } else {
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
export const baseHandlers = {
  get,
  set,
};
export const readonlyHandlers = {
  get: readonlyGet,
  set: function (target, key, value) {
    console.warn(`key:${key} set失败， target是只读的`);
    return true;
  },
};
export const shallowReadOnlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadOnlyGet,
});
