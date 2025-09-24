export function generateId() {
  const randomChars = (length = 8) =>
    Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  return `${randomChars()}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}-${randomChars(12)}`;
}

export default class Revision {
  #queue = new Set(); // Queue to hold scheduled functions
  #isFlushing = false; // Flag to indicate if flushing is in progress
  #reference;
  #uuid = generateId(); // Unique identifier for the revision
  #rev = 0; // Revision number
  hint; // Hint for the current state

  #subscribers; // Set of subscribers for notifications

  constructor(reference, rev=0) {
    this.#subscribers = new Set();
    this.#rev = rev;
    this.#reference = reference;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "number") {
      return this.#rev; // Return revision number for numeric context
    }
    if (hint === "default") {
      return [this.#rev, this.#uuid].join('-'); // Default string representation
    }
    return null;
  }

  #schedule(fn) {
    this.#queue.add(fn); // Add function to the queue

    // If not currently flushing, initiate the flush process
    if (!this.#isFlushing) {
      this.#isFlushing = true; // Set flushing flag
      queueMicrotask(this.flush.bind(this)); // Schedule flush
    }
  }

  flush() {
    for (const fn of this.#queue) {
      fn.bind(this)(); // Execute each function in the queue
    }
    this.#queue.clear(); // Clear the queue after execution
    this.#isFlushing = false; // Reset flushing flag
    // console.log('QUEUESTATE:', ...this.#queue); // Log current queue for debugging
  }

  get value() {
    return [this.#rev, this.#uuid]; // Return current revision state
  }

  #inc() {
    ++this.#rev; // Increment revision number
    this.#uuid = generateId(); // Generate a new unique ID
    this.hint = this.value; // Update hint with current value
    this.notify(); // Notify all subscribers of the change
    // console.log('RAN!', this.hint)
  }

  inc() {
    this.#schedule(this.#inc); // Schedule increment operation
    // console.log('QUEUESTATE:', ...this.#queue); // Log current queue for debugging
    return [this.#rev, this.#uuid];
  }

  subscribe(subscriber) {
    subscriber([this.#rev, this.#uuid], this.#reference); // Notify new subscriber immediately
    this.#subscribers.add(subscriber); // Add subscriber to the set
    return () => this.#subscribers.delete(subscriber); // Return unsubscribe function
  }

  notify() {
    for (const subscriber of this.#subscribers) {
      subscriber([this.#rev, this.#uuid], this.#reference); // Notify each subscriber of the current state
    }
  }

  clear() {
    this.#subscribers.clear(); // Clear all subscribers
  }
}
