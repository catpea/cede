/**
 * Cletus - Elegant Test Runner for Node.js and Browser
 * ES2025 Compatible Implementation
 *
 * A lightweight test runner that works everywhere, providing
 * a simple API for writing and organizing tests.
 */

// Global test context that tracks all test state
const context = {
  suites: [],                  // All test suites
  current: null,               // Currently executing suite
  results: {                   // Test results counter
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0
  },
  depth: 0,                    // Current nesting depth for output
  queue: [],                   // Queue of tests waiting to run
  running: false,              // Is the test runner currently processing
  completionHandlers: [],      // Functions to call when all tests finish
  completed: false             // Have all tests completed
};

/**
 * TestContext provides the 't' parameter in tests,
 * allowing for subtests and other test-specific operations
 */
class TestContext {
  constructor(name, depth = 0) {
    this.name = name;
    this.depth = depth;
    this.subtests = [];
    this.abortController = new AbortController();
  }

  // Create a subtest within this test
  async test(name, options, fn) {
    // Handle the common case where options are omitted
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    const subtest = new TestContext(name, this.depth + 1);
    this.subtests.push(subtest);

    try {
      await runTest(name, options, fn, subtest);
    } catch (error) {
      // Subtest errors are already handled by runTest
    }

    return subtest;
  }

  // Cancel this test and all its subtests
  abort() {
    this.abortController.abort();
    this.subtests.forEach(st => st.abort());
  }
}

/**
 * Reporter collects all test output and results
 * This allows for JSON output and programmatic access to results
 */
class Reporter {
  constructor() {
    this.output = [];                        // All log messages
    this.startTime = performance.now();     // Track total duration
  }

  // Log a message and store it in our output array
  log(message, type = 'info') {
    const entry = {
      message,
      type,                                  // 'pass', 'fail', 'skip', 'todo', 'error', 'suite', 'summary'
      timestamp: performance.now() - this.startTime,
      depth: context.depth
    };
    this.output.push(entry);

    // Also output to console for immediate feedback
    console.log(message);
  }

  // Get complete results including all output
  getResults() {
    return {
      output: this.output,
      summary: { ...context.results },
      duration: performance.now() - this.startTime
    };
  }

  // Get just the summary statistics
  getSummary() {
    const { passed, failed, skipped, todo } = context.results;
    const total = passed + failed + skipped + todo;

    return {
      total,
      passed,
      failed,
      skipped,
      todo,
      success: failed === 0
    };
  }
}

// Create a global reporter instance
const reporter = new Reporter();

/**
 * Core test execution function
 * Handles running a single test with all its options
 */
async function runTest(name, options, fn, testContext = null) {
  const indent = '  '.repeat(context.depth);

  // Handle the shorthand where options are omitted
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }

  // Handle skipped tests - don't run them
  if (options.skip) {
    reporter.log(`${indent}○ ${name} [skipped]`, 'skip');
    context.results.skipped++;
    return;
  }

  // Handle todo tests - run but don't fail
  if (options.todo) {
    try {
      await executeTest(fn, testContext);
      reporter.log(`${indent}○ ${name} [todo]`, 'todo');
    } catch {
      // Todo tests don't fail even if they throw
      reporter.log(`${indent}○ ${name} [todo]`, 'todo');
    }
    context.results.todo++;
    return;
  }

  // Run a normal test
  try {
    const startTime = performance.now();
    await executeTest(fn, testContext);
    const duration = Math.round(performance.now() - startTime);

    reporter.log(`${indent}✓ ${name} (${duration}ms)`, 'pass');
    context.results.passed++;
  } catch (error) {
    reporter.log(`${indent}✗ ${name}`, 'fail');
    if (error.message) {
      reporter.log(`${indent}  ${error.message}`, 'error');
    }
    context.results.failed++;
    throw error;
  }
}

/**
 * Execute the actual test function
 * Handles async, promise, and callback styles
 */
async function executeTest(fn, testContext) {
  // Create a test context if one wasn't provided
  const ctx = testContext || new TestContext('', context.depth);

  // Check if this is a callback-style test
  // (has 2 parameters: t and done)
  if (fn.length > 1) {
    return new Promise((resolve, reject) => {
      // Create the 'done' callback
      const done = (error) => {
        if (error) reject(error);
        else resolve();
      };

      try {
        fn(ctx, done);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Run the test function (async or sync)
  const result = fn(ctx);

  // If it returns a promise, wait for it
  if (result && typeof result.then === 'function') {
    await result;
  }

  // Wait for all subtests to complete
  if (ctx.subtests.length > 0) {
    await Promise.all(ctx.subtests.map(st => st.promise));
  }
}

/**
 * Process the queue of pending tests
 * This runs tests one at a time to maintain order
 */
async function processQueue() {
  // Don't start if already running
  if (context.running) return;
  context.running = true;

  // Process all queued tests
  while (context.queue.length > 0) {
    const task = context.queue.shift();
    try {
      await task();
    } catch (error) {
      // Error already logged by runTest
    }
  }

  context.running = false;

  // Check if we're done with all tests
  if (context.queue.length === 0) {
    // Wait a bit to make sure no more tests are queued
    setTimeout(() => {
      if (context.queue.length === 0 && !context.completed) {
        context.completed = true;
        reportSummary();
        notifyCompletion();
      }
    }, 10);
  }
}

/**
 * Add a task to the queue and start processing
 * Uses microtasks for scheduling (works everywhere)
 */
function queueTask(fn) {
  context.queue.push(fn);
  // Use Promise.resolve().then() instead of setImmediate for universal compatibility
  Promise.resolve().then(() => processQueue());
}

/**
 * Notify all registered completion handlers that tests are done
 */
function notifyCompletion() {
  const results = reporter.getResults();
  context.completionHandlers.forEach(handler => {
    try {
      handler(results);
    } catch (error) {
      console.error('Error in completion handler:', error);
    }
  });
}

/**
 * Print the final test summary
 */
function reportSummary() {
  const summary = reporter.getSummary();
  const { passed, failed, skipped, todo, total } = summary;

  if (total > 0) {
    reporter.log('\n' + '─'.repeat(40), 'separator');

    // Build the summary message
    const parts = [`Tests: ${passed} passed`];
    if (failed > 0) parts.push(`${failed} failed`);
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (todo > 0) parts.push(`${todo} todo`);
    parts.push(`${total} total`);

    reporter.log(parts.join(', '), 'summary');
  }
}

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Create a test suite to group related tests
 * @param {string} name - Suite name
 * @param {function} fn - Function containing tests
 */
function suite(name, fn) {
  const previousDepth = context.depth;
  const previousSuite = context.current;

  reporter.log(`${'  '.repeat(context.depth)}${name}`, 'suite');
  context.depth++;
  context.current = { name, tests: [] };
  context.suites.push(context.current);

  try {
    fn();
  } finally {
    // Restore previous context
    context.depth = previousDepth;
    context.current = previousSuite;
  }
}

/**
 * Define a test
 * @param {string} name - Test name
 * @param {object} options - Optional: { skip: true } or { todo: true }
 * @param {function} fn - Test function
 */
function test(name, options, fn) {
  // Queue the test for execution
  queueTask(() => runTest(name, options, fn));
}

// Create aliases for common testing conventions
const describe = suite;  // Mocha/Jest style
const it = test;         // Mocha/Jest style

/**
 * Get the complete test results
 * @returns {object} Full results including output and summary
 */
function getResults() {
  return reporter.getResults();
}

/**
 * Get just the summary statistics
 * @returns {object} Summary with passed/failed/skipped/todo counts
 */
function getSummary() {
  return reporter.getSummary();
}

/**
 * Register a callback to be called when all tests complete
 * @param {function} handler - Function to call with results
 */
function onComplete(handler) {
  if (context.completed) {
    // Tests already finished, call handler immediately
    handler(reporter.getResults());
  } else {
    context.completionHandlers.push(handler);
  }
}

/**
 * Wait for all tests to complete (returns a Promise)
 * @returns {Promise} Resolves with test results when done
 */
function waitForCompletion() {
  return new Promise((resolve) => {
    onComplete(resolve);
  });
}

/**
 * Reset the test runner to run a new set of tests
 * Useful when running multiple test files
 */
function reset() {
  context.suites = [];
  context.current = null;
  context.results = { passed: 0, failed: 0, skipped: 0, todo: 0 };
  context.depth = 0;
  context.queue = [];
  context.running = false;
  context.completionHandlers = [];
  context.completed = false;
  reporter.output = [];
  reporter.startTime = performance.now();
}

// ============================================
// EXPORTS
// ============================================

// Bundle all exports
const exports = {
  suite,
  test,
  describe,
  it,
  getResults,
  getSummary,
  onComplete,
  waitForCompletion,
  reset
};

// Support CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
}

// Support browser global
if (typeof window !== 'undefined') {
  window.cletus = exports;
}

// Support ES modules
export {
  suite,
  test,
  describe,
  it,
  getResults,
  getSummary,
  onComplete,
  waitForCompletion,
  reset
};
