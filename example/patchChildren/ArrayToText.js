import { ref, h } from "../../lib/guide-tiny-vue.esm.js";
const nextChildren = "newChildren";
const prevChildren = [h("div", {}, "A"), h("div", {}, "B")];
const ArrayToText = {
  name: "ArrayToText",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;

    return {
      isChange,
    };
  },
  render() {
    const self = this;
    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren);
  },
};

export default ArrayToText;
