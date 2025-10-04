import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

export class Arr extends Array {
  #previousState;

  constructor(data, options) {
    data ? super(...data) : super();

    // Store initial state for diffing
    this.#previousState = [...this];

    this[Signal.Symbol] = new Signal(this, options);

    const members = [
      // RegExp for numeric indexes
      {
        name: /^\d+$/,
        after: () => this[Signal.Symbol].notify()
      },
      {
        name: (prop) => ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'length'].includes(prop),
        after: () => this[Signal.Symbol].notify()
      },
    ];

    return Watcher.watch(this, members);
  }


  subscribe(subscriber, options) {

    let previousState = [];

    // Wrapper that computes changes before calling subscriber
    const changeComputer = (value) => {
      // Compute the diff
      const changes = diff(this.#previousState, value);

      // Update previous state for next comparison
      previousState = [...value];

      // Call subscriber with value and changes
      subscriber(value, changes);
    };

    // Subscribe to signal with our wrapper
    const unsubscribe = this[Signal.Symbol].subscribe(changeComputer, options);

    return unsubscribe;
  }
}

  // Helper to diff two arrays
function diff(oldArray, newArray) {
    const added = [];
    const removed = [];
    const moved = [];

    // Find removed items
    for (let i = 0; i < oldArray.length; i++) {
      if (!newArray.includes(oldArray[i])) {
        removed.push(oldArray[i]);
      }
    }

    // Find added items
    for (let i = 0; i < newArray.length; i++) {
      if (!oldArray.includes(newArray[i])) {
        added.push(newArray[i]);
      }
    }

    // Find moved items (exist in both but at different indices)
    for (let i = 0; i < newArray.length; i++) {
      const item = newArray[i];
      const oldIndex = oldArray.indexOf(item);
      const newIndex = i;

      if (oldIndex !== -1 && oldIndex !== newIndex && !added.includes(item)) {
        moved.push({
          item,
          from: oldIndex,
          to: newIndex
        });
      }
    }

    return { added, removed, moved };
  }

// // Usage Example
// console.log('=== Arr with Change Tracking ===\n');

// const arr = new Arr([1, 2, 3]);

// arr.subscribe((value, {added, removed, moved}) => {
//   console.log('Array:', [...value]);
//   if (added.length) console.log('  Added:', added);
//   if (removed.length) console.log('  Removed:', removed);
//   if (moved.length) console.log('  Moved:', moved);
//   console.log('');
// }, false);

// console.log('Initial array:', [...arr]);

// console.log('\n--- Testing push(4) ---');
// arr.push(4);

// console.log('--- Testing arr[0] = 99 (replace) ---');
// arr[0] = 99;

// console.log('--- Testing pop() ---');
// arr.pop();

// console.log('--- Testing unshift(0) ---');
// arr.unshift(0);

// console.log('--- Testing reverse() ---');
// arr.reverse();

// console.log('--- Testing splice(1, 1, 100) ---');
// arr.splice(1, 1, 100);

// console.log('--- Testing sort() ---');
// arr.sort((a, b) => a - b);

// console.log('Final array:', [...arr]);
