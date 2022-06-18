import { h, renderSlots } from "../../lib/guide-tiny-vue.esm.js";
export const Foo = {
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
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
