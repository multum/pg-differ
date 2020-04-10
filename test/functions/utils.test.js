'use strict';
const utils = require('../../lib/utils');

describe(`utils`, () => {
  it.each([
    ['foo', { bar: [3, 2, 1] }],
    ['foo.bar', [3, 2, 1]],
    ['foo.bar[0]', 3],
    ['[1][0]', 4],
    ['baz[0]', undefined],
  ])('utils.get("%s")', (path, expected) => {
    expect(
      utils.get(path, {
        foo: { bar: [3, 2, 1] },
        baz: null,
        1: [4],
      })
    ).toEqual(expected);
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
  ])('utils.findWhere() [%#]', (array, expected, mustBeFound) => {
    const i = expect(utils.findWhere(expected, array));
    mustBeFound ? i.toEqual(expected) : i.toBeUndefined();
  });

  it.each([
    [{ foo: 1, bar: 2 }, ['bar'], { foo: 1 }],
    [{ foo: 1, bar: 2, baz: 3 }, ['foo', 'bar'], { baz: 3 }],
  ])('utils.omit() [%#]', (object, keys, expected) => {
    expect(utils.omit(keys, object)).toEqual(expected);
  });
});
