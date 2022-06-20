import { h, getCurrentInstance } from "../../lib/guide-tiny-vue.esm.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  // .vue
  // <template></template>
  // render
  setup() {
    const currentInstance = getCurrentInstance();
    console.log(currentInstance);
  },
  render() {
    return h("div", {}, [h(Foo)]);
  },
};
