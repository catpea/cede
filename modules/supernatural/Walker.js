/**
 * Walker - A utility for traversing and transforming JavaScript data structures
 *
 * Supports walking through:
 * - Primitive values (strings, numbers, booleans, null, undefined)
 * - Objects (plain objects)
 * - Arrays
 * - Maps
 * - Sets
 *
 * Features:
 * - Circular reference detection
 * - Customizable visitor pattern
 * - Depth-first or breadth-first traversal
 * - Optional walking of replacement values
 */
export class Walker {
  /**
   * Creates a new Walker instance
   *
   * @param {Object} options - Configuration options
   * @param {boolean} [options.depthFirst=false] - If true, visits children before parents (post-order traversal)
   * @param {boolean} [options.walkReplacements=false] - If true, recursively walks values returned by the visitor
   */
  constructor(options = {}) {
    // Store configuration with defaults
    this.depthFirst = options.depthFirst === true;
    this.walkReplacements = options.walkReplacements === true;
  }

  /**
   * Visitor function that gets called for each node in the tree
   * Override this method to implement custom transformation logic
   *
   * @param {string|number|symbol} key - The property key or index of the current node
   * @param {*} value - The current node's value
   * @param {*} parent - The parent container (object/array/Map/Set) or null for root
   * @param {Array<string>} path - Array of keys representing the path from root to current node
   * @param {boolean} isLeaf - True if the node has no children (primitives or empty containers)
   * @param {boolean} isRoot - True if this is the root node
   * @returns {*} Return undefined to keep original value, or any other value as replacement
   */
  visitor(key, value, parent, path, isLeaf, isRoot) {
    // Default implementation - no transformation
    return undefined;
  }

  /**
   * Main entry point - walks the provided data structure
   *
   * @param {*} data - The data structure to walk
   * @returns {*} The transformed data structure
   */
  walk(data) {
    // WeakMap tracks visited objects to handle circular references
    // Using WeakMap allows garbage collection of objects after walking
    const visited = new WeakMap();

    // Start walking from the root with appropriate parameters
    return this._processNode(
      null,           // key (null for root)
      data,           // value
      null,           // parent (null for root)
      [],             // path (empty for root)
      visited,        // visited tracker
      true            // isRoot flag
    );
  }

  /**
   * Process a single node in the tree
   * This is the core method that orchestrates the walking logic
   *
   * @private
   * @param {*} key - Node's key in its parent
   * @param {*} value - Node's value
   * @param {*} parent - Node's parent container
   * @param {Array<string>} path - Path from root to this node
   * @param {WeakMap} visited - Tracks visited objects for circular reference detection
   * @param {boolean} isRoot - Whether this is the root node
   * @returns {*} The processed value
   */
  _processNode(key, value, parent, path, visited, isRoot = false) {
    // Determine if this node is a leaf (has no children)
    const isLeaf = this._isLeaf(value);

    // Choose traversal strategy based on depthFirst option
    if (this.depthFirst) {
      // Depth-first: process children first, then visit this node
      const processedValue = this._walkValue(value, path, visited);

      // After processing children, check if result is now a leaf
      const processedIsLeaf = this._isLeaf(processedValue);

      // Call visitor with the processed value
      const replacement = this._callVisitor(
        key,
        processedValue,
        parent,
        path,
        processedIsLeaf,
        isRoot
      );

      // If visitor returned a replacement, optionally walk it
      if (replacement !== undefined) {
        return this.walkReplacements
          ? this._walkValue(replacement, path, visited)
          : replacement;
      }

      return processedValue;
    } else {
      // Breadth-first: visit this node first, then process children
      const replacement = this._callVisitor(
        key,
        value,
        parent,
        path,
        isLeaf,
        isRoot
      );

      // If visitor returned a replacement, optionally walk it
      if (replacement !== undefined) {
        return this.walkReplacements
          ? this._walkValue(replacement, path, visited)
          : replacement;
      }

      // No replacement, walk the original value
      return this._walkValue(value, path, visited);
    }
  }

  /**
   * Walk through a value's children if it's a container
   *
   * @private
   * @param {*} value - The value to walk
   * @param {Array<string>} path - Current path in the tree
   * @param {WeakMap} visited - Circular reference tracker
   * @returns {*} The walked value
   */
  _walkValue(value, path, visited) {
    // Primitives are returned as-is
    if (this._isPrimitive(value)) {
      return value;
    }

    // Check for circular references
    // If we've seen this object before, return the processed version
    if (visited.has(value)) {
      return visited.get(value);
    }

    // Handle different container types
    if (Array.isArray(value)) {
      return this._walkArray(value, path, visited);
    } else if (value instanceof Map) {
      return this._walkMap(value, path, visited);
    } else if (value instanceof Set) {
      return this._walkSet(value, path, visited);
    } else {
      return this._walkObject(value, path, visited);
    }
  }

  /**
   * Walk through an array's elements
   *
   * @private
   * @param {Array} array - The array to walk
   * @param {Array<string>} path - Current path
   * @param {WeakMap} visited - Circular reference tracker
   * @returns {Array} New array with walked elements
   */
  _walkArray(array, path, visited) {
    // Create new array and mark original as visited immediately
    // This prevents infinite recursion on circular references
    const result = [];
    visited.set(array, result);

    // Process each element
    for (let i = 0; i < array.length; i++) {
      const elementPath = [...path, String(i)];
      result[i] = this._processNode(
        i,                  // key (index)
        array[i],          // value
        array,             // parent
        elementPath,       // path
        visited,           // visited tracker
        false              // not root
      );
    }

    return result;
  }

  /**
   * Walk through a Map's entries
   *
   * @private
   * @param {Map} map - The Map to walk
   * @param {Array<string>} path - Current path
   * @param {WeakMap} visited - Circular reference tracker
   * @returns {Map} New Map with walked entries
   */
  _walkMap(map, path, visited) {
    // Create new Map and mark original as visited
    const result = new Map();
    visited.set(map, result);

    let index = 0;
    for (const [mapKey, mapValue] of map) {
      // Map keys can be objects too, so we need to walk them
      // Use a special path notation for map keys
      const keyPath = [...path, `[MapKey:${index}]`];
      const processedKey = this._walkValue(mapKey, keyPath, visited);

      // Process the map value with a descriptive path
      const valuePath = [...path, `[MapValue:${String(mapKey)}]`];
      const processedValue = this._processNode(
        `[MapEntry:${String(mapKey)}]`,  // synthetic key for visitor
        mapValue,                         // value
        map,                              // parent
        valuePath,                        // path
        visited,                          // visited tracker
        false                             // not root
      );

      result.set(processedKey, processedValue);
      index++;
    }

    return result;
  }

  /**
   * Walk through a Set's values
   *
   * @private
   * @param {Set} set - The Set to walk
   * @param {Array<string>} path - Current path
   * @param {WeakMap} visited - Circular reference tracker
   * @returns {Set} New Set with walked values
   */
  _walkSet(set, path, visited) {
    // Create new Set and mark original as visited
    const result = new Set();
    visited.set(set, result);

    let index = 0;
    for (const setValue of set) {
      const valuePath = [...path, `[SetItem:${index}]`];
      const processedValue = this._processNode(
        `[SetItem:${index}]`,  // synthetic key for visitor
        setValue,              // value
        set,                   // parent
        valuePath,             // path
        visited,               // visited tracker
        false                  // not root
      );

      result.add(processedValue);
      index++;
    }

    return result;
  }

  /**
   * Walk through an object's properties
   *
   * @private
   * @param {Object} obj - The object to walk
   * @param {Array<string>} path - Current path
   * @param {WeakMap} visited - Circular reference tracker
   * @returns {Object} New object with walked properties
   */
  _walkObject(obj, path, visited) {
    // Create new object and mark original as visited
    const result = {};
    visited.set(obj, result);

    // Process all enumerable own properties
    // Using Object.keys ensures we only get own enumerable properties
    for (const key of Object.keys(obj)) {
      const propPath = [...path, key];
      result[key] = this._processNode(
        key,           // key
        obj[key],      // value
        obj,           // parent
        propPath,      // path
        visited,       // visited tracker
        false          // not root
      );
    }

    return result;
  }

  /**
   * Safely call the visitor function with error handling
   *
   * @private
   * @param {*} key - Node's key
   * @param {*} value - Node's value
   * @param {*} parent - Node's parent
   * @param {Array<string>} path - Path to node
   * @param {boolean} isLeaf - Whether node is a leaf
   * @param {boolean} isRoot - Whether node is root
   * @returns {*} Visitor's return value or undefined on error
   */
  _callVisitor(key, value, parent, path, isLeaf, isRoot) {
    try {
      return this.visitor(key, value, parent, path, isLeaf, isRoot);
    } catch (error) {
      // Log error but don't stop walking
      // This ensures one bad visitor call doesn't break the entire walk
      console.error('Visitor function error:', error);
      return undefined;
    }
  }

  /**
   * Check if a value is a primitive (not an object)
   *
   * @private
   * @param {*} value - Value to check
   * @returns {boolean} True if value is primitive
   */
  _isPrimitive(value) {
    // null is typeof 'object', so we check it explicitly
    // All other primitives are non-objects
    return value === null || typeof value !== 'object';
  }

  /**
   * Check if a value is a leaf node (has no children)
   *
   * @private
   * @param {*} value - Value to check
   * @returns {boolean} True if value is a leaf node
   */
  _isLeaf(value) {
    // All primitives are leaves
    if (this._isPrimitive(value)) {
      return true;
    }

    // Check if containers are empty
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (value instanceof Map || value instanceof Set) {
      return value.size === 0;
    }

    // For plain objects, check if they have any own properties
    return Object.keys(value).length === 0;
  }
}

// Example usage:
/*
const walker = new Walker({
  depthFirst: true,
  walkReplacements: true
});

// Custom visitor that removes null values and empty containers
walker.visitor = (key, value, parent, path, isLeaf, isRoot) => {
  if (isRoot) {
    console.log('Processing root:', value);
  }

  if (isLeaf && value === null) {
    return undefined; // Remove nulls
  }

  if (isLeaf && typeof value === 'object' && Object.keys(value).length === 0) {
    return undefined; // Remove empty objects/arrays
  }

  return undefined; // Keep original value
};

const data = {
  name: 'test',
  value: null,
  nested: {
    empty: {},
    items: [1, null, 3]
  }
};

const result = walker.walk(data);
*/
