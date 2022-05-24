import {
  effect,
  changeShouldTrack,
  ReactiveEffect,
  track,
  trigger,
} from "./effect";
class ComputedRefImpl {
  private _getter;
  private _dirty: boolean = true;
  private _value: any;
  private _effect: any;

  constructor(getter) {
    this._getter = getter;
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        trigger(this, "value");
      }
    });
  }
  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    changeShouldTrack(true);
    track(this, "value");
    changeShouldTrack(false);
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
