import {
  h,
  renderSlots,
  createTextVNode,
} from "../../lib/guide-tiny-vue.esm.js";
export const Foo = {
  name: "foo",
  setup(props, { emit }) {
    // console.log(props);
    const emitAdd = () => {
      emit("add");
      return;
    };
    return {
      emitAdd,
    };
  },
  render() {
    // console.log(this.$slots);
    const age = 10;
    const btn = h("button", { onClick: this.emitAdd }, "emitAdd");
    const foo = h("p", {}, "foo");
    const text = createTextVNode("text节点");
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age }),
      foo,
      text,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
