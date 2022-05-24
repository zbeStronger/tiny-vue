import { computed } from "../computed";
import { effect } from "../effect";
import { reactive } from "../reactive";

describe("computed", () => {
  it("happy path", () => {
    const user = reactive({ age: 1 });
    const age = computed(() => {
      return user.age;
    });
    expect(age.value).toBe(1);
  });
  it("should compute lazily", () => {
    const value = reactive({ foo: 1 });
    const getter = jest.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);
    expect(getter).not.toHaveBeenCalled();
    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);
    value.foo = 2;
    expect(getter).toHaveBeenCalledTimes(1);

    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it("effect nesting", () => {
    const obj = reactive({ foo: 1 });
    const user = computed(() => obj.foo + 1);
    let dummy;
    effect(() => {
      dummy = user.value;
    });
    expect(user.value).toBe(2);
    expect(dummy).toBe(2);
    obj.foo++;
    expect(user.value).toBe(3);
    expect(dummy).toBe(3);
  });
});
