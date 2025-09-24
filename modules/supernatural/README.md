# supernatural
Reactive Array and Object based on Proxy and Signal


## Arr Concept
```JavaScript

const arr = new Arr([1, 2, 3], {/*options*/});

arr.subscribe(v=>{
  console.log('signal notify!', v)
}, false); /* false means no initial notify */


console.log('Initial array:', arr);

console.log('\nTesting push...');
arr.push(4);

console.log('\nTesting index assignment...');
arr[0] = 10;

console.log('\nTesting reverse...');
arr.reverse();

console.log('\nTesting length modification...');
arr.length = 2;

console.log('\nFinal array:', arr);

```

## Obj Concept

```JavaScript

const obj = new Obj({ name: 'Test', value: 42 }, {/*options*/});
console.log('Initial object:', obj);

console.log('\nTesting property assignment...');
obj.name = 'Updated';

console.log('\nTesting new property...');
obj.newProp = 'Hello';

console.log('Final object:', obj)

```
