import { shallowReadOnly } from "../reactivity/reactive";
import { isObject } from "../utils/index";

export function initProps(instance, rawProps) {
  const props = (isObject(rawProps) && shallowReadOnly(rawProps)) || {};
  instance.props = props;
}
