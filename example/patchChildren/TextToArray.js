import { ref, h } from "../../lib/guide-tiny-vue.esm.js";
const nextChildren = [h("div", {}, "a"), h("div", {}, "ab")];
const prevChildren = "oldText";
const TextToArray = {
  name: "TextToArray",
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

export default TextToArray;
