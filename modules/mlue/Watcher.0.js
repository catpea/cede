export default class Watcher {
  /**
   * Creates a proxy that watches specified members and triggers a callback
   * @param {Object} context - The object to watch
   * @param {Array<string>} members - Array of property/method names to watch
   * @param {Function} subscriberFn - Callback function (member) => {}
   * @returns {Proxy} - Proxied version of the context object
   */
  static watch(context, members, subscriberFn) {
    // Create a Set for O(1) lookup performance
    const watchedMembers = new Set(members);

    // Store original methods to avoid infinite loops
    const originalMethods = {};
    members.forEach(member => {
      if (typeof context[member] === 'function') {
        originalMethods[member] = context[member];
      }
    });

    return new Proxy(context, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // If this is a watched method
        if (watchedMembers.has(prop) && typeof value === 'function') {
          return function(...args) {
            // Call the original method with correct context
            const result = originalMethods[prop].apply(target, args);
            subscriberFn(prop)
            return result;
          };
        }

        return value;
      },

      set(target, prop, value, receiver) {
        console.log(prop)
        // If this is a watched property
        if (watchedMembers.has(prop)) {
          // Set the value first
          const result = Reflect.set(target, prop, value, receiver);
          subscriberFn(prop)
          return result;
        }

        // For non-watched properties, just set normally
        return Reflect.set(target, prop, value, receiver);
      }
    });
  }
}
