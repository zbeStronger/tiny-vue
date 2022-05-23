import { isReadOnly, shallowReadOnly } from "../reactive";
describe("readonly", () => {
  test("shallowReadOnly", () => {
    const props = shallowReadOnly({ n: { foo: 1 } });
    expect(isReadOnly(props)).toBe(true);
    expect(isReadOnly(props.n)).toBe(false);
  });
});
