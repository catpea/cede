import util from 'node:util';
import test from 'node:test';
import { strict as assert } from 'node:assert';

import { Obj } from './Obj.js';
import { Arr } from './Arr.js';
import { Builder } from './Builder.js';
import { Walker } from './Walker.js';



// test('walker test', (t) => {
//   const data = { color: "#ff0000", percent: 0 , user: {name:'alice'}};

//     const flattened = [];

//     const walker = new Walker();
//     walker.visitor = (key, node, parent, path, isLeaf, isRoot) => {
//       if (isLeaf) flattened.push([path.join("/"), node]);
//     };

//     walker.walk(data);

//     console.log( flattened )

// });

test('synchronous passing test', (t) => {
  const root = new Obj();
  const array = Builder.create(root, '/my-app/user/gradient.arr');

  array.subscribe(v=>console.log(v))

  Builder.create(root, '/my-app/user/gradient.arr/0');
  console.log(util.inspect(root, { colors: true, showHidden: true, depth: null }));


  assert.strictEqual(1, 1);
});
