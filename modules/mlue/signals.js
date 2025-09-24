
function generateId() {
  const randomChars = (length = 8) => Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `${randomChars()}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}-${randomChars(12)}`;
}

export class Pulse { // pulse is a Signal withut .map, .filter, etc funcions, it is a "pure" signal.
  #id;
  #value;
  #subscribers;
  #disposables;

  constructor(value) {
    this.#id = generateId();
    this.#value = value;
    this.#subscribers = new Set();
    this.#disposables = new Set();
  }
  get id(){ return this.#id}
  get value() {
    return this.#value;
  }

  set value(newValue) {
    if (newValue == this.#value) return; // IMPORTANT FEATURE: if value is the same, exit early, don't disturb if you don't need to
    this.#value = newValue;
    this.notify(); // all observers
  }

  subscribe(subscriber) {
    if (this.#value != null) subscriber(this.#value); // IMPORTANT FEATURE: instant notification (initialization on subscribe), but don't notify on null/undefined, predicate functions will look simpler, less error prone
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber); // IMPORTANT FEATURE: return unsubscribe function, execute this to stop getting notifications.
  }

  notify() {
    for (const subscriber of this.#subscribers) subscriber(this.#value);
  }

  clear() {
    // shutdown procedure
    this.#subscribers.clear(); // destroy subscribers
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear(); // execute and clear disposables
  }

  // add related trash that makes sense to clean when the signal is shutdown
  collect(...input) {
    [input].flat(Infinity).forEach((disposable) => this.#disposables.add(disposable));
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "string") {
      return this.#id;
    } else if (hint === "number") {
      return 0;
    }
    return this.#id; // default case
  }
}

export class Signal extends Pulse {
  filter(fn) { return filter(this, fn) }
  map(fn) { return map(this, fn) }
  combineLatest(...signals) { return combineLatest(this, ...signals) }
}



export function filter(parent, test) {
  const child = new Signal();
  const subscription = parent.subscribe((v) => { if (test(v)) { child.value = v; } });
  child.collect(subscription);
  return child;
}

export function map(parent, map) {
  const child = new Signal();
  const subscription = parent.subscribe((v) => (child.value = map(v)));
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
  const subscription = source.subscribe(v=> bus.emit(eventName, v) );
  return subscription;
}

export function fromBetweenEvents(startElement, startEvent, endElement, endEvent) {
  const child = new Signal();
  let hasActivated = false;
  const handleDown = () => { hasActivated = true; child.value = true; };
  const handleUp = () => { if(hasActivated){ child.value = false; hasActivated = false; }
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
