import { h, createTextVNode } from "../../lib/guide-tiny-vue.esm.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "app",
  // .vue
  // <template></template>
  // render
  render() {
    const app = h("div", {}, "App");
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [
          h("p", {}, "header" + age),
          createTextVNode("hello"),
        ],
        footer: (props) => h("p", {}, "footer"),
      }
    );
    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};
