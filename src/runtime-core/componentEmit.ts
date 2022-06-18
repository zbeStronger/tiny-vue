import { toHandlerKey } from "../utils/index";

export function emit(instacne, event, ...args) {
  //   console.log("emit", event);
  const { props } = instacne;
  // tpp
  // 先写一个特定的行为--> 冲构成通用的行为

  const handlerName = toHandlerKey(event);
  const handler = props[handlerName];
  handler && handler(...args);
}
