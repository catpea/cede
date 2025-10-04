/*
  Please note that the builder just does this:
  const descend = (initial, path) => path.split(/[/]/).reduce((state, segment)=> state[segment.split('.')[0]] = segment.endsWith('.arr')?new Arr():new Obj(), initial);
  descend(root, 'a/b.arr/0/d/e/f/g');
  plus existing path checking.
*/
import { Obj } from './Obj.js';
import { Arr } from './Arr.js';

export class Builder {
  static ARRAY_SUFFIX = '.arr';
  static PATH_DELIMITER = '/';

  /**
   * Creates nested structure from path string
   * @param target - Root object to modify (will be mutated)
   * @param pathExpression - Path like 'a/b.arr/0/c'
   * @param options - Configuration options
   * @returns The root object (for chaining)
   */
  static create( target = {}, pathExpression, options = { immutable: false, arrayFactory: () => new Arr(null, {}), objectFactory: () => new Obj(null, {}) } ) {
    // Input validation
    this.validateInputs(target, pathExpression);

    const workingTarget = options.immutable
      ? structuredClone(target)
      : target;

    const segments = this.parsePath(pathExpression);

    // console.log('SEGMENTS:', segments );

    // Build nested structure
    const finalTarget = segments.reduce((device, { key, isArray, inArray, parent }, index) => {

      const property = Array.isArray(device)?parseInt(key):key;
      const noProperty = !(property in device);

      if (noProperty) {
        device[property] = isArray ? options.arrayFactory() : options.objectFactory();
      }
      return device[property];

    }, workingTarget );

    return finalTarget;
  }

  /**
   * Parses path string (/a/b/c.arr/1/d) into structured segments
   * this.ARRAY_SUFFIX is always .arr
   * @private
   */
  static parsePath(pathExpression) {
    const segments = pathExpression
      .split(this.PATH_DELIMITER)
      .filter(segment => segment.length > 0)
      .map(segment => ({
        key: segment.split('.')[0],
        isArray: segment.endsWith(this.ARRAY_SUFFIX),
        inArray: false, // Default to false
        originalSegment: segment
      }));

    // Update the `inArray` property
    for (let i = 1; i < segments.length; i++) {
      segments[i].parent = segments[i - 1];
      segments[i].inArray = segments[i - 1].isArray;
    }

    return segments;
  }

  /**
   * Validates input parameters
   * @private
   */
  static validateInputs(target, pathExpression) {
    if (target === null || target === undefined) {
      throw new TypeError('Target object cannot be null or undefined');
    }

    if (typeof pathExpression !== 'string' || pathExpression.trim() === '') {
      throw new TypeError('Path expression must be a non-empty string');
    }

    // Validate path format
    const invalidChars = /[^a-zA-Z0-9_\-./]/;
    if (invalidChars.test(pathExpression)) {
      throw new Error(`Invalid characters in path: ${pathExpression}`);
    }
  }

  /**
   * Utility method for common use case
   */
  static dig(initial, path) {
    return this.create(initial, path);
  }
}
