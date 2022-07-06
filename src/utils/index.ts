export * from "./toDisplayString";
export const extend = Object.assign;
export function isObject(val) {
  return val !== null && typeof val === "object";
}
export const isString = (value) => typeof value === "string";
export const hasChanged = (val, newVal) => {
  return !Object.is(val, newVal);
};

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};
