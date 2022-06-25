import { ref, h } from "../../lib/guide-tiny-vue.esm.js";
const nextChildren = "newText";
const prevChildren = "oldText";
const TextToText = {
  name: "TextToText",
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

export default TextToText;
