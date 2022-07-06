export * from "./runtime-dom";
export * from "./reactivity";
import { baseCompile } from "./complier-core/src";
import * as runtimeDom from "./runtime-dom";
import { registerRuntimeCompiler } from "./runtime-dom";
function compileToFunction(template, options = {}) {
  const { code } = baseCompile(template);

  // 调用 compile 得到的代码在给封装到函数内，
  // 这里会依赖 runtimeDom 的一些函数，所以在这里通过参数的形式注入进去
  const render = new Function("Vue", code)(runtimeDom);
  console.log("-----------------", render);
  return render;
}

registerRuntimeCompiler(compileToFunction);
