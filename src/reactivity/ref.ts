import { hasChanged, isObject } from "../utils";
import { trackEffects, triggerEffects, isTracking } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value;
  public _dep;
  private _rawValue;
  public __v_isRef = true;
  constructor(value) {
    // 存一个不是proxy对象的初始值，用来set时去做对比是否有修改
    this._rawValue = value;
    // 如果value是对象，用reactive处理
    this._value = convert(value);
    this._dep = new Set();
  }
  get value() {
    if (isTracking()) trackEffects(this._dep);
    return this._value;
  }
  set value(newVal) {
    if (!hasChanged(this._rawValue, newVal)) return;
    this._rawValue = newVal;
    this._value = convert(newVal);
    triggerEffects(this._dep);
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

export function ref(value) {
  return new RefImpl(value);
}

export function isRef(val) {
  return !!val.__v_isRef;
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}
