import { h } from "../../lib/guide-tiny-vue.esm.js";
import { Foo } from "./Foo.js";
export const App = {
  // .vue
  // <template></template>
  // render
  render() {
    const app = h("div", {}, "App");
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => h("p", {}, "header" + age),
        footer: (props) => h("p", {}, "footer"),
      }
    );
    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};
