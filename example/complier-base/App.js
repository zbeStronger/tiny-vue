const App = {
  name: "App",
  template: `<div>hi,{{message}}</div>`,
  setup() {
    return {
      message: "tiny-vue",
    };
  },
};

export default App;
