import {
  ref,
  h,
  nextTick,
  getCurrentInstance,
} from "../../lib/guide-tiny-vue.esm.js";
import { Child } from "./Child.js";
export const App = {
  name: "App",
  setup() {
    const instance = getCurrentInstance();
    const msg = ref("123");
    const count = ref(1);
    window.msg = msg;
    const changeChildProps = () => {
      msg.value = "456";
    };
    const changeCount = () => {
      for (let i = 0; i < 10; i++) {
        count.value = i;
      }
      console.log(instance);

      nextTick(() => {
        console.log(instance);
      });
    };

    return {
      msg,
      changeChildProps,
      count,
      changeCount,
    };
  },
  render() {
    return h("div", {}, [
      h("div", {}, "你好"),
      h("button", { onClick: this.changeChildProps }, "change child props"),
      h(Child, { msg: this.msg }),
      h("button", { onClick: this.changeCount }, "change self count"),
      h("p", {}, "count:" + this.count),
    ]);
  },
};
