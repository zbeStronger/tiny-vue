import { readonlyHandlers, baseHandlers } from "./baseHandler";

export const enum ReactiveFlags {
  IS_REATIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadOnly",
}
export function reactive(target) {
  return createActiveObject(target, baseHandlers);
}

export function readonly(target) {
  return createActiveObject(target, readonlyHandlers);
}
// 创建响应式对象
function createActiveObject(target, handlers) {
  return new Proxy(target, handlers);
}

export function isReactive(value) {
  // 响应式对象会触发get操作
  return !!value[ReactiveFlags.IS_REATIVE];
}

export function isReadOnly(value) {
  // 响应式对象会触发get操作
  return !!value[ReactiveFlags.IS_READONLY];
}
