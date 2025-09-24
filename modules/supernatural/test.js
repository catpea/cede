import util from 'node:util';
import test from 'node:test';
import { strict as assert } from 'node:assert';

import { Obj } from './Obj.js';
import { Arr } from './Arr.js';
import { Builder } from './Builder.js';


test('synchronous passing test', (t) => {
  // This test passes because it does not throw an exception.

  const root = new Obj();

  Builder.create(root, '/a/b.arr/0/d/e/f/g', {
    // immutable: true,
    arrayFactory: () => new Arr(null, {}),
    objectFactory: () => new Obj(null, {})
  });

  console.log(util.inspect(root, { colors: true, showHidden: true, depth: null }));

  assert.strictEqual(1, 1);
});
