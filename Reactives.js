import {Signal} from './Signal.js';

export default class Watcher {
  /**
   * Creates a proxy that watches specified members and triggers callbacks
   * @param {Object} context - The object to watch
   * @param {Array<string|RegExp|Object>} members - Array of property/method names, RegExp patterns, or config objects to watch
   * @param {Function} subscriberFn - Callback function (member) => {}
   * @returns {Proxy} - Proxied version of the context object
   */
  static watch(context, members, subscriberFn) {
    // Process members into a normalized format
    const watcherConfigs = [];
    const originalMethods = {};

    members.forEach(member => {
      if (typeof member === 'string') {
        // Simple string member
        watcherConfigs.push({
          test: (prop) => prop === member,
          before: null,
          after: null,
          map: null,
        });
        if (typeof context[member] === 'function') {
          originalMethods[member] = context[member];
        }
      } else if (member instanceof RegExp) {
        // Regular expression pattern
        watcherConfigs.push({
          test: (prop) => member.test(String(prop)),
          before: null,
          after: null,
          map: null
        });
      } else if (typeof member === 'object' && member !== null) {


        // Object configuration
        const config = {
          test: null,
          before: member.before || member.fn || null, // Support legacy 'fn' as 'before'
          after: member.after || null,
          map: member.map || null
        };

        if (typeof member.name === 'string') {
          // Object with string name
          config.test = (prop) => prop === member.name;
          if (typeof context[member.name] === 'function') {
            originalMethods[member.name] = context[member.name];
          }
        } else if (member.name instanceof RegExp) {
          // Object with RegExp name
          config.test = (prop) => member.name.test(String(prop));
        } else if (typeof member.name === 'function') {
          // Object with function name checker
          config.test = member.name;
        }

        if (config.test) {
          watcherConfigs.push(config);
        }
      }
    });

    // Helper function to check if a property is watched and get its config
    const getWatcherConfig = (prop) => {
      for (const config of watcherConfigs) {
        if (config.test(prop)) {
          return config;
        }
      }
      return null;
    };

    // Store original methods for all properties that might match patterns
    for (const prop in context) {
      if (typeof context[prop] === 'function' && !originalMethods[prop]) {
        const config = getWatcherConfig(prop);
        if (config) {
          originalMethods[prop] = context[prop];
        }
      }
    }

    return new Proxy(context, {
      get(target, prop, receiver) {

        // Ensure iteration works by returning the original iterator function
        if (prop === Symbol.iterator) {
          return target[Symbol.iterator].bind(target);
        }

        const value = Reflect.get(target, prop, receiver);
        const config = getWatcherConfig(prop);

        // If this is a watched method
        if (config && typeof value === 'function') {

          return function(...args) {
            // Execute before-callback function if provided
            if (config.before) {
              config.before();
            }

            if (config.map) {
              args = config.map(args);
            }

            // Call the original method with correct context
            const original = originalMethods[prop] || value;
            const result = original.apply(target, args);

            // Execute after-callback function if provided
            if (config.after) {
              config.after();
            }

            // Trigger subscriber
            subscriberFn(prop);

            return result;
          };
        }

        return value;
      },

      set(target, prop, value, receiver) {
        const config = getWatcherConfig(prop);

        // If this is a watched property
        if (config) {
          // Execute before-callback function if provided
          if (config.before) {
            config.before(value);
          }

          if (config.map) {
            value = config.map(value);
          }

          // Set the value first
          const result = Reflect.set(target, prop, value, receiver);

          // Execute after-callback function if provided
          if (config.after) {
            config.after(value);
          }

          // Trigger subscriber
          subscriberFn(prop);

          return result;
        }

        // For non-watched properties, just set normally
        return Reflect.set(target, prop, value, receiver);
      }
    });
  }
}

// Enhanced ReactiveArray example with before/after callbacks

export class ReactiveArray extends Array {
  #signal;
  constructor(...a) {
    super(...a);
    this.#signal = new Signal(this);
    const members = [
      // RegExp for numeric indexes
      /^\d+$/,
      {
        name: (prop) => ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'length'].includes(prop),
        after: () => this.#signal.notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this.#signal.subscribe(...etc); }
}

// Example
// const arr = new ReactiveArray(1, 2, 3);
// arr.subscribe(v=>{
//   console.log('### signal notify!', v)
// }, false); /* false means no initial notify */






export class ReactiveObject {
  #signal;
  constructor(...a) {
    super(...a);
    this.#signal = new Signal(this);
    const members = [
      // Watch all property assignments
      {
        name: (prop) => typeof prop === 'string' && !prop.startsWith('_'),
        after: () => this.#signal.notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this.#signal.subscribe(...etc); }
}



// Enhanced ReactiveObject example
// class ReactiveObject2 {

//   #signal = new Signal();

//   subscribe(...etc){ return this.#signal.subscribe(...etc); }
//   get value(){ return this.#signal.value;}
//   set value(v){ return this.#signal.value = v;}

//   constructor(initialData = {}) {
//     // Copy initial data
//     Object.assign(this, initialData);

//     const members = [
//       // Watch all property assignments
//       {
//         name: (prop) => typeof prop === 'string' && !prop.startsWith('_'),
//         before: () => console.log('Before-callback: property about to change'),
//         after: () => console.log('After-callback: property has changed')
//       },

//       // Watch specific methods with different callbacks
//       {
//         name: 'toString',
//         before: () => console.log('Before-callback: converting to string')
//       },

//       // Watch computed properties
//       {
//         name: (prop) => prop.startsWith('computed'),
//         after: () => console.log('After-callback: computed property accessed')
//       }
//     ];

//     return Watcher.watch(this, members, member => {
//       console.log(`[ObjectWatcher] ${member} was accessed/modified`);


//     });
//   }

//   // Method that will be watched
//   updateData(key, value) {
//     this[key] = value;
//   }

//   // Computed property example
//   get computedValue() {
//     return Object.keys(this).length;
//   }
// }






// // Usage examples:
// console.log('=== ReactiveArray Example ===');
// const arr = new ReactiveArray(1, 2, 3);
// arr.subscribe(v=>{
//   console.log('### signal notify!', v)
// }, false); /* false means no initial notify */


// console.log('Initial array:', arr);

// console.log('\nTesting push...');
// arr.push(4);

// console.log('\nTesting index assignment...');
// arr[0] = 10;

// console.log('\nTesting reverse...');
// arr.reverse();

// console.log('\nTesting length modification...');
// arr.length = 2;

// console.log('\nTesting custom method...');
// arr.customMethod();

// console.log('\n=== ReactiveObject Example ===');
// const obj = new ReactiveObject({ name: 'Test', value: 42 });
// console.log('Initial object:', obj);

// console.log('\nTesting property assignment...');
// obj.name = 'Updated';

// console.log('\nTesting new property...');
// obj.newProp = 'Hello';

// console.log('\nTesting method call...');
// obj.updateData('key', 'value');

// console.log('\nTesting computed property...');
// console.log('Computed value:', obj.computedValue);

// console.log('\nFinal array:', arr);
// console.log('Final object:', obj)
