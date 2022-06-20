import { h, getCurrentInstance } from "../../lib/guide-tiny-vue.esm.js";
export const Foo = {
  name: "Foo",
  setup() {
    const currentInstance = getCurrentInstance();
    console.log(currentInstance);
  },
  render() {
    return h("div", {}, "haha");
  },
};
