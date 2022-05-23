import { reactive, isReactive, isProxy } from "../reactive";
describe("reactive", () => {
  it("happy path", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isProxy(original)).toBe(false);
  });
  //嵌套
  test("nested reactive", () => {
    const original = {
      nested: { foo: 1 },
      arr: [{ bar: 3 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.arr)).toBe(true);
    expect(isReactive(observed.arr[0])).toBe(true);
  });
});
