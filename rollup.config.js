import pkg from "./package.json";
import typescipt from "@rollup/plugin-typescript";
export default {
  input: "./src/index.ts",
  output: [
    //1、commonjs
    //2、esm
    {
      fomat: "cjs",
      file: pkg.main,
    },
    {
      format: "es",
      file: pkg.module,
    },
  ],
  plugins: [typescipt()],
};
