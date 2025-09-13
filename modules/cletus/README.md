# Cletus

A zero-dependency test runner for JavaScript that you can trust. The name Cletus comes from Greek, meaning "called forth" or "summoned" - exactly what this library does with your tests.

## Why Cletus Exists

In a world where software dependencies can be compromised and supply chains attacked, Cletus takes a different approach: **no dependencies**. Every line of code is readable, understandable, and auditable. Simple is safe because you can read the entire source code in a few minutes and know exactly what runs in your application.

Trust is earned through transparency. Cletus is small enough to review, simple enough to understand, and powerful enough to test your code effectively.

## Installation

```bash
npm install cletus
```

Or simply copy the single `cletus.js` file into your project. It's that simple.

## Getting Started in the Browser

Cletus works beautifully in the browser without any build tools or bundlers. Create an HTML file and start testing:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Tests</title>
</head>
<body>
  <h1>Test Results</h1>
  <pre id="output"></pre>

  <script type="module">
    import { test, describe, it, waitForCompletion } from './cletus.js';

    // Write your tests
    test('addition works', () => {
      const result = 2 + 2;
      if (result !== 4) {
        throw new Error(`Expected 4 but got ${result}`);
      }
    });

    describe('String operations', () => {
      it('concatenates strings', () => {
        const greeting = 'Hello' + ' ' + 'World';
        if (greeting !== 'Hello World') {
          throw new Error('String concatenation failed');
        }
      });
    });

    // Wait for tests to complete and display results
    const results = await waitForCompletion();
    document.getElementById('output').textContent =
      `Passed: ${results.summary.passed}\n` +
      `Failed: ${results.summary.failed}\n` +
      `Total: ${results.summary.total}`;
  </script>
</body>
</html>
```

Open this HTML file in any modern browser and see your tests run immediately. No server required, no build step needed.

## Writing Tests

### Basic Tests

Tests pass when they don't throw errors. It's that simple:

```javascript
import { test } from './cletus.js';

test('objects can be created', () => {
  const obj = { name: 'Alice', age: 30 };
  if (!obj.name) {
    throw new Error('Object creation failed');
  }
});
```

### Using Assertions

While Cletus doesn't include an assertion library (keeping it dependency-free), you can use the browser's built-in `console.assert`:

```javascript
test('using console.assert', () => {
  const value = 10;
  console.assert(value > 5, 'Value should be greater than 5');
  console.assert(value < 20, 'Value should be less than 20');
});
```

Or create simple helper functions:

```javascript
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

test('with helper function', () => {
  assertEqual(5 * 5, 25, 'Multiplication should work');
});
```

### Asynchronous Tests

Modern JavaScript is asynchronous. Cletus handles async tests naturally:

```javascript
test('fetch data from API', async () => {
  const response = await fetch('/api/data');
  const data = await response.json();

  if (!data.success) {
    throw new Error('API returned unsuccessful response');
  }
});

test('using promises directly', () => {
  return fetch('/api/status')
    .then(response => response.json())
    .then(data => {
      if (data.status !== 'healthy') {
        throw new Error('Service is not healthy');
      }
    });
});
```

### Organizing Tests

Group related tests together for better organization:

```javascript
import { describe, it } from './cletus.js';

describe('Calculator', () => {
  it('adds numbers', () => {
    if (1 + 1 !== 2) throw new Error('Addition failed');
  });

  it('multiplies numbers', () => {
    if (3 * 4 !== 12) throw new Error('Multiplication failed');
  });

  describe('Division', () => {
    it('divides numbers', () => {
      if (10 / 2 !== 5) throw new Error('Division failed');
    });

    it('handles division by zero', () => {
      const result = 10 / 0;
      if (!isFinite(result)) throw new Error('Should handle infinity');
    });
  });
});
```

## Detecting When Tests Complete

Cletus provides multiple ways to know when your tests are done:

### Promise-based (Recommended for Modern Code)

```javascript
import { test, waitForCompletion } from './cletus.js';

test('example 1', () => { /* ... */ });
test('example 2', () => { /* ... */ });

// Wait for all tests to complete
const results = await waitForCompletion();
console.log(`All done! ${results.summary.passed} tests passed`);
```

### Callback-based

```javascript
import { test, onComplete } from './cletus.js';

test('example 1', () => { /* ... */ });
test('example 2', () => { /* ... */ });

onComplete((results) => {
  console.log('Tests finished!', results.summary);
});
```

### Getting Results Programmatically

Perfect for building custom test reporters or integrating with other tools:

```javascript
import { test, getResults, getSummary } from './cletus.js';

test('my test', () => { /* ... */ });

// Later, get the results
setTimeout(() => {
  const results = getResults();  // Full results with all output
  const summary = getSummary();  // Just the statistics

  // Build your own custom report
  console.log(JSON.stringify(results, null, 2));
}, 100);
```

## Test Options

### Skipping Tests

Temporarily disable tests without deleting them:

```javascript
test('not ready yet', { skip: true }, () => {
  // This won't run
  throw new Error('This test is skipped');
});
```

### Todo Tests

Mark tests for future implementation:

```javascript
test('future feature', { todo: true }, () => {
  // This runs but won't fail your test suite
  throw new Error('Not implemented');
});
```

## Subtests

Create tests within tests for better organization:

```javascript
test('user management', async (t) => {
  const user = { name: 'Alice', email: 'alice@example.com' };

  await t.test('can create user', () => {
    if (!user.name) throw new Error('User needs a name');
  });

  await t.test('has valid email', () => {
    if (!user.email.includes('@')) {
      throw new Error('Invalid email format');
    }
  });
});
```

## Running Multiple Test Suites

The `reset()` function allows you to run multiple independent test suites:

```javascript
import { test, waitForCompletion, reset } from './cletus.js';

// First test suite
test('suite 1 test', () => { /* ... */ });
await waitForCompletion();

// Reset and run another suite
reset();
test('suite 2 test', () => { /* ... */ });
await waitForCompletion();
```

## Node.js Compatibility

While Cletus is designed with the browser in mind, it works perfectly in Node.js too. The same code runs in both environments without modification. Use it in Node.js for server-side testing, CLI tools, or anywhere else JavaScript runs:

```bash
node my-tests.js
```

The API is identical, and the zero-dependency philosophy means it works with any Node.js version that supports ES modules.

## Simple Examples for Learning

### Testing a Shopping Cart

```javascript
describe('Shopping Cart', () => {
  it('starts empty', () => {
    const cart = [];
    if (cart.length !== 0) {
      throw new Error('Cart should start empty');
    }
  });

  it('can add items', () => {
    const cart = [];
    cart.push({ item: 'apple', price: 1.00 });

    if (cart.length !== 1) {
      throw new Error('Cart should have one item');
    }
  });

  it('calculates total', () => {
    const cart = [
      { item: 'apple', price: 1.00 },
      { item: 'banana', price: 0.50 }
    ];

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    if (total !== 1.50) {
      throw new Error(`Expected total 1.50 but got ${total}`);
    }
  });
});
```

### Testing DOM Manipulation

```javascript
describe('DOM operations', () => {
  it('can create elements', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello';

    if (div.textContent !== 'Hello') {
      throw new Error('Failed to set text content');
    }
  });

  it('can find elements', () => {
    document.body.innerHTML = '<div id="test">Test</div>';
    const element = document.getElementById('test');

    if (!element) {
      throw new Error('Could not find element');
    }
  });
});
```

## Philosophy

Cletus follows these principles:

1. **Zero Dependencies**: No supply chain vulnerabilities, no hidden code
2. **Readability**: Every line is clear and purposeful
3. **Simplicity**: Do one thing well - run tests
4. **Transparency**: Small enough to audit in minutes
5. **Trust Through Clarity**: You can understand everything it does

## The Power of Simple

In an era of complex build tools and massive dependency trees, Cletus proves that testing can be simple. When your test runner is just a few hundred lines of readable JavaScript, you don't need to trust strangers on the internet. You can read it, understand it, and know exactly what code runs in your application.

Simple is safe. Simple is powerful. Simple is trustworthy.

## Contributing

Cletus is open source and we welcome contributions. The entire codebase is in a single file, making it easy to understand and modify. Whether you're fixing a bug or improving documentation, your help makes Cletus better for everyone.

## License

MIT

---

Named after the Greek word meaning "called forth," Cletus summons your tests into action with transparency and simplicity. In a world of growing complexity, sometimes the most powerful tool is the one you can hold in your hand and understand completely.
