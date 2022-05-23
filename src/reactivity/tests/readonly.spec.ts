import { readonly, isReadOnly, isProxy } from "../reactive";
describe("readonly", () => {
  it("happy path", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);
    expect(isReadOnly(wrapped)).toBe(true);
    expect(isProxy(wrapped)).toBe(true);
  });
  it("warn then call set", () => {
    console.warn = jest.fn();
    const user = readonly({
      age: 10,
    });
    user.age = 11;
    expect(console.warn).toBeCalled();
  });

  test("nested reactive", () => {
    const original = {
      nested: { foo: 1 },
      arr: [{ bar: 3 }],
    };
    const observed = readonly(original);
    expect(isReadOnly(observed.nested)).toBe(true);
    expect(isReadOnly(observed.arr)).toBe(true);
    expect(isReadOnly(observed.arr[0])).toBe(true);
  });
});
