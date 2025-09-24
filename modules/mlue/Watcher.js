export default class Watcher {
  /**
   * Creates a proxy that watches specified members and triggers a callback
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
          fn: null
        });
        if (typeof context[member] === 'function') {
          originalMethods[member] = context[member];
        }
      } else if (member instanceof RegExp) {
        // Regular expression pattern
        watcherConfigs.push({
          test: (prop) => member.test(String(prop)),
          fn: null
        });
      } else if (typeof member === 'object' && member !== null) {
        // Object configuration
        const config = {
          test: null,
          fn: member.fn || null
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
    // This is needed for RegExp and function matchers
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
          // Bind to the target so 'this' inside iterator is the original array
          return target[Symbol.iterator].bind(target);
        }

        const value = Reflect.get(target, prop, receiver);
        const config = getWatcherConfig(prop);

        // If this is a watched method
        if (config && typeof value === 'function') {
          return function(...args) {
            // Execute pre-callback function if provided
            if (config.fn) {
              config.fn();
            }

            // Call the original method with correct context
            const original = originalMethods[prop] || value;
            const result = original.apply(target, args);

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
          // Execute pre-callback function if provided
          if (config.fn) {
            config.fn();
          }

          // Set the value first
          const result = Reflect.set(target, prop, value, receiver);

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

// Example usage:
/*
class ReactiveArray extends Array {
  constructor(...a) {
    super(...a);
    const members = [
      // String members
      'push', 'pop', 'shift', 'unshift', 'splice', 'sort',

      // RegExp for numeric indexes
      /^\d+$/,

      // Object with string name and pre-callback function
      {
        name: 'reverse',
        fn: () => console.log('Pre-callback: reverse is being called')
      },

      // Object with function name checker and pre-callback
      {
        name: (prop) => prop === 'length',
        fn: () => console.log('Pre-callback: length is being modified')
      },

      // Object with RegExp name and pre-callback
      {
        name: /^custom/,
        fn: () => console.log('Pre-callback: custom method called')
      }
    ];

    return Watcher.watch(this, members, member => {
      console.log(`[Watcher] ${member} was accessed/modified`);
      // Announce changes in your own way
    });
  }
}

// Test it
const arr = new ReactiveArray(1, 2, 3);
arr.push(4);           // Triggers watcher for 'push'
arr[0] = 10;           // Triggers watcher for index '0' (matches /^\d+$/)
arr.reverse();         // Triggers pre-callback and watcher
arr.length = 2;        // Triggers pre-callback and watcher for 'length'
*/
