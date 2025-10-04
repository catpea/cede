/**
 * Recursively flattens nested objects/arrays into dot-notation paths.
 * @param {any} data - The data to flatten
 * @param {string} [path=""] - Current path (internal)
 * @returns {[string, any][]} Array of [path, value] pairs
 */

export function flat(data, path = "", delimiter = "."){
  // Handle primitives and null
  if (data === null || typeof data !== "object" || data instanceof Date) {
    return [[path, data]];
  }

  // Recursively flatten objects and arrays
  return Object.entries(data).flatMap(([key, value]) =>
    flat(value, path ? `${path}${delimiter}${key}` : key, delimiter)
  );
};
