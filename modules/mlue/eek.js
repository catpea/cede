function generateId() {
  const randomChars = (length = 8) => Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `${randomChars()}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}-${randomChars(12)}`;
}

// Track current derivation context for automatic dependency tracking
let currentDerivation = null;

export class Pulse { // pulse is a Signal without .map, .filter, etc functions, it is a "pure" signal.
  #id;
  #name;
  #value;
  #subscribers;
  #disposables;
  #dependencies; // Track which signals depend on this one

  constructor(value, name = null) {
    this.#id = generateId();
    this.#name = name;
    this.#value = value;
    this.#subscribers = new Set();
    this.#disposables = new Set();
    this.#dependencies = new Set();
  }

  get id() { return this.#id; }
  get name() { return this.#name || this.#id; }

  get value() {
    // Auto-track dependencies when accessed during derivation
    if (currentDerivation) {
      this.#dependencies.add(currentDerivation);
      currentDerivation.sources.add(this);
    }
    return this.#value;
  }

  set value(newValue) {
    if (newValue == this.#value) return; // IMPORTANT FEATURE: if value is the same, exit early
    this.#value = newValue;
    this.notify(); // all observers
  }

  subscribe(subscriber) {
    if (this.#value != null) subscriber(this.#value); // IMPORTANT FEATURE: instant notification
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber); // IMPORTANT FEATURE: return unsubscribe function
  }

  notify() {
    for (const subscriber of this.#subscribers) subscriber(this.#value);
  }

  clear() {
    // shutdown procedure
    this.#subscribers.clear(); // destroy subscribers
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear(); // execute and clear disposables
    this.#dependencies.clear();
  }

  // add related trash that makes sense to clean when the signal is shutdown
  collect(...input) {
    [input].flat(Infinity).forEach((disposable) => this.#disposables.add(disposable));
  }

  // Enhanced Symbol.toPrimitive for derivation tracking
  [Symbol.toPrimitive](hint) {
    // When used in arithmetic operations during derivation, track dependency
    if (currentDerivation) {
      this.#dependencies.add(currentDerivation);
      currentDerivation.sources.add(this);
    }

    if (hint === "string") {
      return this.#name || this.#id;
    } else if (hint === "number") {
      // Return the numeric value for arithmetic operations
      return typeof this.#value === 'number' ? this.#value : 0;
    }
    return this.#value; // default case - return the actual value
  }

  // Allow signals to be used directly in template literals
  toString() {
    return String(this.#value);
  }

  // Allow signals to be used in numeric contexts
  valueOf() {
    if (currentDerivation) {
      this.#dependencies.add(currentDerivation);
      currentDerivation.sources.add(this);
    }
    return this.#value;
  }
}

export class Signal extends Pulse {
  constructor(value, name = null) {
    super(value, name);
  }

  filter(fn) { return filter(this, fn); }
  map(fn) { return map(this, fn); }
  combineLatest(...signals) { return combineLatest(this, ...signals); }
}

// Derived Signal class for computed values
export class DerivedSignal extends Signal {
  #computation;
  #sources;
  #subscriptions;

  constructor(computation, name = null) {
    super(undefined, name);
    this.#computation = computation;
    this.#sources = new Set();
    this.#subscriptions = [];
    this.sources = this.#sources; // Expose for dependency tracking

    // Initial computation to establish dependencies
    this.recompute();

    // Subscribe to all dependencies
    this.#setupSubscriptions();
  }

  recompute() {
    // Set up derivation context
    const previousDerivation = currentDerivation;
    currentDerivation = this;

    // Clear old sources
    this.#sources.clear();

    try {
      // Run computation - this will track dependencies automatically
      const result = this.#computation();
      super.value = result; // Use parent's setter to notify subscribers
    } finally {
      // Restore previous context
      currentDerivation = previousDerivation;
    }
  }

  #setupSubscriptions() {
    // Clean up old subscriptions
    this.#subscriptions.forEach(unsub => unsub());
    this.#subscriptions = [];

    // Subscribe to all sources
    for (const source of this.#sources) {
      const unsub = source.subscribe(() => this.recompute());
      this.#subscriptions.push(unsub);
      this.collect(unsub);
    }
  }

  // Override value setter to prevent manual updates
  set value(_) {
    throw new Error('Cannot manually set value of a derived signal');
  }
}

// Signal Factory with Proxy magic
class SignalFactory {
  #signals = new Map();

  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && prop !== 'inspect' && prop !== 'valueOf') {
          // Create a new signal with the property name
          const signalName = `${prop}-${generateId().split('-')[0]}`;
          const signal = new Signal(undefined, signalName);
          target.#signals.set(prop, signal);
          return signal;
        }
        return target[prop];
      }
    });
  }

  // Get all created signals
  getAll() {
    return Array.from(this.#signals.values());
  }

  // Clear all signals
  clearAll() {
    this.#signals.forEach(signal => signal.clear());
    this.#signals.clear();
  }
}

// Enhanced derived function that uses Symbol.toPrimitive
export function derived(computation, name = null) {
  return new DerivedSignal(computation, name);
}

// Helper to create multiple derived signals at once
export function createComputeds(definitions) {
  const computeds = {};
  for (const [name, computation] of Object.entries(definitions)) {
    computeds[name] = derived(computation, name);
  }
  return computeds;
}

// Original helper functions
export function filter(parent, test) {
  const child = new Signal();
  const subscription = parent.subscribe((v) => { if (test(v)) { child.value = v; } });
  child.collect(subscription);
  return child;
}

export function map(parent, mapFn) {
  const child = new Signal();
  const subscription = parent.subscribe((v) => (child.value = mapFn(v)));
  child.collect(subscription);
  return child;
}

export function combineLatest(...parents) {
  const child = new Signal();
  const updateCombinedValue = () => {
    const values = [...parents.map((signal) => signal.value)];
    const nullish = values.some((value) => value == null);
    if (!nullish) child.value = values;
  };
  const subscriptions = parents.map((signal) => signal.subscribe(updateCombinedValue));
  child.collect(subscriptions);
  return child;
}

export function fromBus(bus, eventName) {
  const child = new Signal();
  const handler = (data) => (child.value = data);
  const unsubscribeFromBus = bus.on(eventName, handler);
  child.collect(unsubscribeFromBus);
  return child;
}

export function fromEvent(el, eventType, options = {}) {
  const child = new Signal();
  const handler = (event) => (child.value = event);
  el.addEventListener(eventType, handler, options);
  child.collect(() => el.removeEventListener(eventType, handler, options));
  return child;
}

// SUBSCRIPTIONS = NOTE: to* functions return subscriptions not signals
export function toInnerTextOf(signal, el) {
  const subscription = signal.subscribe((v) => (el.innerText = v));
  return subscription;
}

export function toSignal(source, destination) {
  const subscription = source.subscribe((v) => (destination.value = v));
  return subscription;
}

export function toEvent(source, bus, eventName) {
  const subscription = source.subscribe(v => bus.emit(eventName, v));
  return subscription;
}

export function fromBetweenEvents(startElement, startEvent, endElement, endEvent) {
  const child = new Signal();
  let hasActivated = false;
  const handleDown = () => { hasActivated = true; child.value = true; };
  const handleUp = () => {
    if(hasActivated) {
      child.value = false;
      hasActivated = false;
    }
  };
  // Add event listeners
  startElement.addEventListener(startEvent, handleDown);
  endElement.addEventListener(endEvent, handleUp);
  // Cleanup function to remove event listeners
  const cleanup = () => {
    startElement.removeEventListener(startEvent, handleDown);
    endElement.removeEventListener(endEvent, handleUp);
  };
  child.collect(cleanup);
  return child;
}

// Export the signal factory instance
export const signalFactory = new SignalFactory();

// Batch updates for performance
let updateQueue = [];
let isUpdating = false;

export function batch(fn) {
  if (isUpdating) {
    fn();
    return;
  }

  isUpdating = true;
  try {
    fn();
    // Process all queued updates
    while (updateQueue.length > 0) {
      const update = updateQueue.shift();
      update();
    }
  } finally {
    isUpdating = false;
  }
}

// Effect function for side effects
export function effect(fn, dependencies = []) {
  const effectSignal = derived(() => {
    fn();
    return null; // Effects don't produce values
  });

  return () => effectSignal.clear(); // Return cleanup function
}

// Example usage:
/*
// Create named signals using the proxy factory
const { width, height, depth } = signalFactory;

// Set initial values
width.value = 10;
height.value = 20;
depth.value = 5;

// Create derived signals using Symbol.toPrimitive
// The signals automatically convert to numbers in arithmetic operations
const area = derived(() => width * height);
const volume = derived(() => width * height * depth);
const diagonal = derived(() => Math.sqrt(width * width + height * height));

// Complex derivations with multiple signals
const summary = derived(() => {
  return `Box: ${width}x${height}x${depth}, Volume: ${volume}`;
});

// Subscribe to changes
area.subscribe(val => console.log('Area changed:', val));
volume.subscribe(val => console.log('Volume changed:', val));

// Updates automatically propagate
width.value = 15; // This will trigger updates to area, volume, diagonal, and summary

// Create multiple computeds at once
const computeds = createComputeds({
  doubleWidth: () => width * 2,
  halfHeight: () => height / 2,
  isLarge: () => volume > 1000
});

// Batch updates for performance
batch(() => {
  width.value = 25;
  height.value = 30;
  depth.value = 10;
}); // All dependent signals update once

// Clean up when done
width.clear();
height.clear();
signalFactory.clearAll();
*/
