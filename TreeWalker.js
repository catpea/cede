export class TreeWalker {
  // Public visitor — override or assign a function: (key, value, parent, path) => replacement|undefined
  visitor = (key, value, parent, path) => {
    // if (key === 'signal' && value && typeof value.toJSON === 'function') {
    //   return value.toJSON();
    // }
    return undefined;
  };

  // Public entry point
  walk(value) {
    return this.#walkInternal(value, new WeakMap(), []);
  }

  // Private helpers
  #isPrimitive(value) {
    return value === null || typeof value !== 'object';
  }

  #callVisitor(key, value, parent, path) {
    try {
      return this.visitor(key, value, parent, path);
    } catch (err) {
      // If visitor errors, treat as no replacement
      console.error(err);
      return undefined;
    }
  }

  #visitAndMaybeRecurse(key, value, parent, path, seen) {
    const replacement = this.#callVisitor(key, value, parent, path);
    if (replacement !== undefined) return replacement;
    return this.#walkInternal(value, seen, path);
  }

  #walkInternal(value, seen, path) {
    if (this.#isPrimitive(value)) return value;
    if (seen.has(value)) return seen.get(value);

    // Arrays
    if (Array.isArray(value)) {
      const arr = [];
      seen.set(value, arr);
      for (let i = 0; i < value.length; i++) {
        arr[i] = this.#visitAndMaybeRecurse(i, value[i], value, path.concat(String(i)), seen);
      }
      return arr;
    }

    // Map
    if (value instanceof Map) {
      const m = new Map();
      seen.set(value, m);
      let index = 0;
      for (const [k, v] of value.entries()) {
        // Visit the key itself (in case it's an object that needs walking)
        const newKey = this.#walkInternal(k, seen, path.concat(`[[MapKey:${index}]]`));
        // Visit the value with a descriptive key for the visitor
        const newVal = this.#visitAndMaybeRecurse(
          `[[MapEntry:${String(k)}]]`,
          v,
          value,
          path.concat(`[[MapValue:${index}]]`),
          seen
        );
        m.set(newKey, newVal);
        index++;
      }
      return m;
    }

    // Set
    if (value instanceof Set) {
      const s = new Set();
      seen.set(value, s);
      let index = 0;
      for (const v of value.values()) {
        const newVal = this.#visitAndMaybeRecurse(
          `[[SetItem:${index}]]`,
          v,
          value,
          path.concat(`[[SetItem:${index}]]`),
          seen
        );
        s.add(newVal);
        index++;
      }
      return s;
    }

    // Plain object
    const out = {};
    seen.set(value, out);
    for (const key of Object.keys(value)) {
      out[key] = this.#visitAndMaybeRecurse(key, value[key], value, path.concat(key), seen);
    }
    return out;
  }
}
