import { provide, inject, h } from "../../lib/guide-tiny-vue.esm.js";

const Provider = {
  name: "provider",
  setup() {
    provide("foo", "fooVal");
    provide("var", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(ProviderSecond)]);
  },
};
const ProviderSecond = {
  name: "provider2",
  setup() {
    provide("foo", "1");
    provide("var", "2");
  },
  render() {
    return h("div", {}, [h("p", {}, `ProviderSecond `), h(Consumer)]);
  },
};

const Consumer = {
  name: "consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("var");
    return {
      foo,
      bar,
    };
  },
  render() {
    return h("div", {}, `Consumer: -- ${this.foo}--${this.bar}`);
  },
};

export const App = {
  name: "app",
  setup() {},
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(Provider)]);
  },
};
