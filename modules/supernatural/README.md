# supernatural

**Reactive Array and Object based on Proxy and Signal**

A lightweight, powerful reactive system for JavaScript that makes arrays and objects automatically notify subscribers when they change. Built with modern JavaScript Proxy API and a sophisticated Signal implementation featuring persistence, synchronization, and conflict resolution.

## Features

- **🚀 Zero Dependencies** - Pure JavaScript with no external requirements
- **⚡ High Performance** - Efficient proxy-based change detection
- **💾 Persistence** - Automatic localStorage integration with cross-tab synchronization
- **🔄 Conflict Resolution** - Built-in revision control for concurrent modifications
- **📦 Scheduling** - Batched updates using microtasks for optimal performance
- **🧹 Memory Management** - Proper disposal patterns prevent memory leaks

## Installation

```bash
npm i supernatural
```

## Quick Start

### Reactive Arrays (Arr)

Create arrays that automatically notify when modified:

```javascript
import { Arr } from 'supernatural';

const arr = new Arr([1, 2, 3], {
  domain: 'my-app',
  name: 'todo-list',
  persistence: true,      // Survives page refresh
  synchronization: true   // Syncs across browser tabs
});

arr.subscribe(v => {
  console.log('Array changed!', v);
}, false); // false means no initial notification

console.log('Initial array:', arr);

console.log('\\nTesting push...');
arr.push(4);                    // Triggers notification

console.log('\\nTesting index assignment...');
arr[0] = 10;                    // Triggers notification

console.log('\\nTesting reverse...');
arr.reverse();                  // Triggers notification

console.log('\\nTesting length modification...');
arr.length = 2;                 // Triggers notification

console.log('\\nFinal array:', arr);
```

**Output:**
```
Initial array: [1, 2, 3]

Testing push...
Array changed! [1, 2, 3, 4]

Testing index assignment...
Array changed! [10, 2, 3, 4]

Testing reverse...
Array changed! [4, 3, 2, 10]

Testing length modification...
Array changed! [4, 3]

Final array: [4, 3]
```

### Reactive Objects (Obj)

Create objects that automatically notify when properties change:

```javascript
import { Obj } from 'supernatural';

const obj = new Obj({ name: 'Test', value: 42 }, {
  domain: 'my-app',
  name: 'user-profile',
  persistence: true
});

obj.subscribe(v => {
  console.log('Object changed!', v);
}, false);

console.log('Initial object:', obj);

console.log('\\nTesting property assignment...');
obj.name = 'Updated';           // Triggers notification

console.log('\\nTesting new property...');
obj.newProp = 'Hello';          // Triggers notification

console.log('\\nFinal object:', obj);
```

**Output:**
```
Initial object: { name: 'Test', value: 42 }

Testing property assignment...
Object changed! { name: 'Updated', value: 42 }

Testing new property...
Object changed! { name: 'Updated', value: 42, newProp: 'Hello' }

Final object: { name: 'Updated', value: 42, newProp: 'Hello' }
```

## Advanced Usage

### Signal Configuration Options

```javascript
const options = {
  domain: 'my-app',           // Namespace for localStorage
  name: 'my-data',            // Unique identifier
  persistence: true,          // Enable localStorage persistence
  synchronization: true,      // Enable cross-tab synchronization
  scheduling: true,           // Enable microtask batching
  conflicting: 16,           // Number of conflict revisions to keep
  structural: false          // Serialize only keys (not values)
};

const reactiveArray = new Arr([1, 2, 3], options);
```

### Multiple Subscribers

```javascript
const arr = new Arr([10, 20, 30]);

// Different components can react to the same data
arr.subscribe(v => updateUI(v));
arr.subscribe(v => logChanges(v));
arr.subscribe(v => syncToServer(v));

arr.push(40); // All three subscribers are notified
```

### Disposal and Memory Management

```javascript
const arr = new Arr([1, 2, 3]);

const unsubscribe = arr.subscribe(v => console.log(v));

// Clean up when done
unsubscribe();

// Or dispose the entire signal
arr[Signal.Symbol].dispose();
```

## Architecture

### Core Components

1. **Signal** - Advanced reactive primitive with persistence and conflict resolution
2. **Watcher** - Proxy-based property/method interception system
3. **Arr** - Reactive Array implementation
4. **Obj** - Reactive Object implementation

### How It Works

```
Property Change → Watcher Proxy → Signal Notification → Subscribers
```

The system uses JavaScript Proxy to intercept property access and method calls, then triggers Signal notifications to subscribers. The Signal system handles persistence, scheduling, and synchronization automatically.

## Str and Num Limitation

Unlike `Arr` and `Obj`, **reactive strings and numbers (`Str` and `Num`) are not possible** due to JavaScript's primitive nature.

### Why This Doesn't Work

```javascript
// This is what we'd want (but can't have):
const firstName = new Str('Alice');
firstName.subscribe(v => console.log('Changed!', v), false);
firstName = 'Alicia'; // ❌ This reassigns the variable, not the value
```

### The Problem

**Strings and numbers are primitives in JavaScript.** The expression `firstName = 'Alicia'` reassigns the variable itself, not the string's internal value. JavaScript provides no mechanism to intercept variable reassignment.

### The Solution: Use Signal Directly

Instead of attempting reactive primitives, use the Signal class directly:

```javascript
import { Signal } from 'supernatural';

// ✅ This works perfectly:
const firstName = new Signal('Alice');
firstName.subscribe(v => console.log('WOW!!!', v), false);
firstName.value = 'Alicia'; // Triggers: WOW!!! Alicia

// ✅ For numbers:
const counter = new Signal(0);
counter.subscribe(v => console.log('Count:', v), false);
counter.value = 42; // Triggers: Count: 42
```

### Why This Design Choice Makes Sense

1. **Consistency** - `.value` assignment works the same for all primitive types
2. **Clarity** - It's obvious you're working with a reactive wrapper
3. **Functionality** - You get all Signal features (persistence, synchronization, etc.)
4. **Performance** - No overhead trying to make primitives behave like objects

## Browser Compatibility

- Modern browsers with Proxy support (ES2015+)
- Chrome 49+, Firefox 18+, Safari 10+
- Node.js 6.0+

## Contributing

Issues and pull requests welcome at [https://github.com/catpea/supernatural](https://github.com/catpea/supernatural)

## Philosophy

**Supernatural** embraces JavaScript's nature rather than fighting it. We provide reactive superpowers for reference types (arrays, objects) while acknowledging that primitives work best with explicit Signal wrappers. This leads to cleaner, more predictable code that works with the language rather than against it.
