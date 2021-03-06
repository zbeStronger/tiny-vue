// import { render } from "./renderer";
import { createVNode } from "./vnode";
export function createAppAPI(render) {
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
