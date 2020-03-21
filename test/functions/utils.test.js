'use strict';
const utils = require('../../lib/utils');

describe(`utils`, () => {
  const object = { foo: { bar: [3, 2, 1] } };
  it.each([
    ['foo', object.foo],
    ['foo.bar', object.foo.bar],
    ['foo.bar[0]', object.foo.bar[0]],
  ])('utils.get("%s")', (path, expected) => {
    expect(utils.get(path, object)).toEqual(expected);
  });

  it.each([
    [['foo'], false],
    [null, false],
    [{ foo: 0 }, true],
  ])('utils.isObject(%s)', (target, expected) => {
    expect(utils.isObject(target)).toBe(expected);
  });

  it.each([
    [{}, true],
    [[], true],
    [{ foo: undefined }, false],
  ])('utils.isEmpty(%s)', (target, expected) => {
    expect(utils.isEmpty(target)).toBe(expected);
  });

  it.each([
    [[{ foo: 1, bar: [1, 2] }], { foo: 1, bar: [1, 2] }, true],
    [[{ foo: 1, bar: [1, 2] }, { foo: 1 }], { foo: 1, bar: [1, 2] }, true],
    [[{ foo: 1 }, { foo: 2 }], { foo: 1, bar: 1 }, false],
  ])('utils.findWhereEq() [%#]', (array, expected, mustBeFound) => {
    const i = expect(utils.findWhereEq(expected, array));
    mustBeFound ? i.toEqual(expected) : i.toBeUndefined();
  });
});
