import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

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

// Generate DOM-style patch operations
function patchDOM(oldArray, newArray, changes) {
  const operations = [];

  // Process removals (in reverse order to maintain indices)
  const removalIndices = [];
  for (let i = 0; i < oldArray.length; i++) {
    if (changes.removed.includes(oldArray[i])) {
      removalIndices.push(i);
    }
  }
  removalIndices.reverse().forEach(index => {
    operations.push({ op: 'removeChild', index });
  });

  // Process additions and moves
  for (let i = 0; i < newArray.length; i++) {
    const item = newArray[i];
    const oldIndex = oldArray.indexOf(item);

    if (changes.added.includes(item)) {
      // New item - append or insert
      if (i === newArray.length - 1) {
        operations.push({ op: 'appendChild', value: item });
      } else {
        operations.push({ op: 'insertBefore', index: i, value: item });
      }
    }
  }

  return operations;
}

// Generate JS-style patch operations
function patchJS(oldArray, newArray, changes) {
  const operations = [];

  // Build a minimal set of splice operations
  let offset = 0;

  // Track items to remove
  for (let i = 0; i < oldArray.length; i++) {
    if (changes.removed.includes(oldArray[i])) {
      operations.push({
        op: 'splice',
        start: i - offset,
        deleteCount: 1
      });
      offset++;
    }
  }

  // Track items to add
  for (let i = 0; i < newArray.length; i++) {
    const item = newArray[i];
    if (changes.added.includes(item)) {
      operations.push({
        op: 'splice',
        start: i,
        deleteCount: 0,
        value: item
      });
    }
  }

  return operations;
}

export class Arr extends Array {
  constructor(data, options) {
    data ? super(...data) : super();

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


  subscribe(subscriber, options = {}) {
    // Short circuit - no diffing needed
    if (options.diff === undefined) {
      return this[Signal.Symbol].subscribe(subscriber);
    }

    // Each subscriber gets its own previousState in closure
    let previousState = [ ];

    // Wrapper that computes changes before calling subscriber
    const changeComputer = (value) => {

      console.log('aaa changeComputer', previousState, value)

      // Compute the changes
      const changes = diff(previousState, value);

      // Generate patch operations based on format
      let patch = undefined;
      if (options.diff === 'DOM') {
        patch = patchDOM(previousState, value, changes);
      } else if (options.diff === 'JS') {
        patch = patchJS(previousState, value, changes);
      }

      // Update previous state for next comparison
      previousState = [...value];

      // Call subscriber with value, patch, and changes
      subscriber(value, patch, changes);
    };

    // Subscribe to signal with our wrapper
    const unsubscribe = this[Signal.Symbol].subscribe(changeComputer);
    return unsubscribe;
  }


}
