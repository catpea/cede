Unlike Arr and Obj, Str and Num Are Not Possible

The best we could do is:

const firstName = new Str('Alice');
firstName.subscribe(v => console.log('WOW!!!', v), false);
firstName.value = 'Alicia'; // Triggers: WOW!!! Alicia

Which is already covered by:

const firstName = new Signal('Alice');
firstName.subscribe(v => console.log('WOW!!!', v), false);
firstName.value = 'Alicia'; // Triggers: WOW!!! Alicia

Strings are primitives in JavaScript.

The problem is: firstName = 'Alicia'

This reassigns the variable itself, not the string's internal value.

In JavaScript, you can't intercept variable reassignment.

---

The following is the best that can be done, and it just replicates the Signal functionality.

---

// Mock Signal class for demo (replace with your actual Signal)
class Signal {
  static Symbol = Symbol('signal');

  constructor(value, options = {}) {
    this.value = value;
    this.subscribers = new Set();
    this.options = options;
  }

  subscribe(callback, autorun = true) {
    if (autorun && this.value !== undefined && this.value !== null) {
      callback(this.value);
    }
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach(callback => callback(this.value));
  }
}

// Mock Watcher class for demo (replace with your actual Watcher)
class Watcher {
  static watch(context, members, subscriberFn = () => {}) {
    const watcherConfigs = members.map(member => {
      if (typeof member === 'object' && member.name && member.after) {
        return {
          test: member.name,
          after: member.after
        };
      }
      return null;
    }).filter(Boolean);

    return new Proxy(context, {
      set(target, prop, value, receiver) {
        const config = watcherConfigs.find(c => c.test(prop));

        if (config) {
          const result = Reflect.set(target, prop, value, receiver);
          if (config.after) {
            config.after();
          }
          subscriberFn(prop);
          return result;
        }

        return Reflect.set(target, prop, value, receiver);
      }
    });
  }
}

// Approach 1: Reactive String Class with valueOf/toString override
export class Str {
  constructor(value = '', options = {}) {
    this._value = String(value);
    this[Signal.Symbol] = new Signal(this._value, options);

    const members = [
      {
        name: (prop) => prop === '_value',
        after: () => {
          this[Signal.Symbol].value = this._value;
          this[Signal.Symbol].notify();
        }
      }
    ];

    return Watcher.watch(this, members);
  }

  // Make it behave like a string in most contexts
  valueOf() {
    return this._value;
  }

  toString() {
    return this._value;
  }

  // String.prototype methods that return new strings
  charAt(index) {
    return this._value.charAt(index);
  }

  charCodeAt(index) {
    return this._value.charCodeAt(index);
  }

  concat(...args) {
    return new Str(this._value.concat(...args));
  }

  includes(searchString, position) {
    return this._value.includes(searchString, position);
  }

  indexOf(searchValue, fromIndex) {
    return this._value.indexOf(searchValue, fromIndex);
  }

  lastIndexOf(searchValue, fromIndex) {
    return this._value.lastIndexOf(searchValue, fromIndex);
  }

  match(regexp) {
    return this._value.match(regexp);
  }

  repeat(count) {
    return new Str(this._value.repeat(count));
  }

  replace(searchValue, replaceValue) {
    return new Str(this._value.replace(searchValue, replaceValue));
  }

  search(regexp) {
    return this._value.search(regexp);
  }

  slice(start, end) {
    return new Str(this._value.slice(start, end));
  }

  split(separator, limit) {
    return this._value.split(separator, limit);
  }

  substring(start, end) {
    return new Str(this._value.substring(start, end));
  }

  toLowerCase() {
    return new Str(this._value.toLowerCase());
  }

  toUpperCase() {
    return new Str(this._value.toUpperCase());
  }

  trim() {
    return new Str(this._value.trim());
  }

  // Getter/setter for value
  get value() {
    return this._value;
  }

  set value(newValue) {
    this._value = String(newValue);
  }

  // Length property
  get length() {
    return this._value.length;
  }

  // Subscribe method
  subscribe(...args) {
    return this[Signal.Symbol].subscribe(...args);
  }

  // Make it work with template literals and string coercion
  [Symbol.toPrimitive](hint) {
    return this._value;
  }

  // Make it iterable like a string
  [Symbol.iterator]() {
    return this._value[Symbol.iterator]();
  }
}

// Approach 2: Factory function that returns a reactive string wrapper
export function ReactiveString(initialValue = '', options = {}) {
  let value = String(initialValue);
  const signal = new Signal(value, options);

  const handler = {
    get(target, prop, receiver) {
      // Handle subscription method
      if (prop === 'subscribe') {
        return (...args) => signal.subscribe(...args);
      }

      // Handle valueOf/toString for string coercion
      if (prop === 'valueOf' || prop === 'toString' || prop === Symbol.toPrimitive) {
        return () => value;
      }

      // Handle string methods
      if (typeof String.prototype[prop] === 'function') {
        return function(...args) {
          const result = String.prototype[prop].apply(value, args);
          return result;
        };
      }

      // Handle length
      if (prop === 'length') {
        return value.length;
      }

      // Handle numeric indices
      if (typeof prop === 'string' && /^\\d+$/.test(prop)) {
        return value[prop];
      }

      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, newValue, receiver) {
      if (prop === 'value' || prop === Symbol.toPrimitive) {
        value = String(newValue);
        signal.value = value;
        signal.notify();
        return true;
      }
      return Reflect.set(target, prop, newValue, receiver);
    }
  };

  // Create a function that acts like a string
  const strFunc = function() {
    return value;
  };

  return new Proxy(strFunc, handler);
}

// Usage Examples
console.log('=== Str Class Example ===');
const firstName = new Str('Alice');

console.log('Initial value:', firstName.toString()); // 'Alice'
console.log('Length:', firstName.length); // 5
console.log('Char at 0:', firstName.charAt(0)); // 'A'

// Subscribe to changes
const unsubscribe = firstName.subscribe(v => {
  console.log('WOW!!!', v);
}, false); // false = no initial notification

console.log('\\nChanging value...');
firstName.value = 'Alicia';

console.log('\\nString coercion test:');
console.log('Template literal: `Hello ${firstName}`:', `Hello ${firstName}`);
console.log('String concatenation: "Hi " + firstName:', "Hi " + firstName);

console.log('\\n=== ReactiveString Function Example ===');
const lastName = ReactiveString('Smith');

lastName.subscribe(v => {
  console.log('Last name changed to:', v);
}, false);

// This approach requires using .value for assignment
lastName.value = 'Johnson';

console.log('\\nFinal values:');
console.log('firstName:', firstName.toString());
console.log('lastName:', lastName.toString());

// Cleanup
unsubscribe();
