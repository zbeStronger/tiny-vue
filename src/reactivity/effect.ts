import { extend } from "../utils";

let activeEffect: any;
let targetMap = new Map();
let shouldTrack = false;

export class ReactiveEffect {
  private _fn;
  public scheduler: Function | undefined;
  deps = [];
  // 区分是否stop
  active = true;
  onStop?: () => void;
  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    if (!this.active) {
      return this._fn();
    }
    shouldTrack = true;
    activeEffect = this;
    const res = this._fn();
    //reset
    shouldTrack = false;
    return res;
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
}

export function isTracking() {
  return activeEffect !== undefined && !!shouldTrack;
}

export function trackEffects(deps) {
  if (deps.has(activeEffect)) return;
  deps.add(activeEffect);
  // 收集所有的effect
  activeEffect.deps.push(deps);
}

export function triggerEffects(deps) {
  for (const effect of deps) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function track(target, key) {
  if (!isTracking()) return;
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

export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let deps = depsMap.get(key);
  triggerEffects(deps);
}

export function stop(runner) {
  runner.effect.stop();
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn);
  extend(_effect, options);
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  _effect.run();
  return runner;
}
