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

    console.log('SEGMENTS:', segments );

    // Build nested structure
    const finalTarget = segments.reduce((current, { key, isArray }, index) => {

      console.log('CURRENT:', key, current );


      // Skip the last segment as it's the final destination
      // if (index === segments.length - 1) return current;

      if (!(key in current)) {

        // const nextSegment = segments[index + 1];

        current[key] = isArray ? options.arrayFactory() : options.objectFactory();

      }

      return current[key];

    }, workingTarget);

    console.log({workingTarget, finalTarget})
    return finalTarget;
  }

  /**
   * Parses path string into structured segments
   * @private
   */
  static parsePath(pathExpression) {
    return pathExpression
      .split(this.PATH_DELIMITER)
      .filter(segment => segment.length > 0)
      .map(segment => ({
        key: segment.split('.')[0],
        isArray: segment.endsWith(this.ARRAY_SUFFIX),
        originalSegment: segment
      }));
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
  static descend(initial, path) {
    return this.create(initial, path);
  }
}
