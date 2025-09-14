import { TreeWalker } from "./TreeWalker.js";

export class Signal {
  #rev = 0;
  #revId = this.#uuid();
  #conflicts = [];

  #id;
  #name;
  #domain;

  #value;

  #changeSubscribers;
  #readSubscribers;

  #disposables;
  #structural;
  #storageSeparator;

  #useScheduling;
  #usePersistence;
  #useSynchronization; // autowarch localstorage

  #conflicting;

  constructor(value, config) {

    const defaults = {

      domain: "signal",
      name: "unnamed",

      structural: false, // serialize structural information only
      conflicting: 16,
      storageSeparator: '--',

      persistence: false,
      scheduling: false,
      synchronization: false,
    };

    const options = Object.assign({}, defaults, config);

    this.#id = options.id ?? this.#uuid();

    this.#domain = options.domain;
    this.#name = options.name;

    this.#conflicting = options.conflicting; // how many conflicting revisions are kept on file
    this.#structural = options.structural; // WARNING: when true signal will not serizlize values, just keys
    this.#storageSeparator = options.storageSeparator;

    this.#useScheduling = options.scheduling; // scheduling support
    this.#usePersistence = options.persistence; // persistence support
    this.#useSynchronization = options.synchronization; // synchronization support

    this.#value = value;

    this.#changeSubscribers = new Set();
    this.#readSubscribers = new Set();
    this.#disposables = new Set();


    if (this.#usePersistence) this.initializePersistence();
    if (this.#useSynchronization) this.addDisposable(this.synchronize());
    // WARNING: ORDER MATTERS: this must come after this.addDisposable(this.synchronize());
    if (this.#usePersistence) this.addDisposable( ()=> localStorage.removeItem(this.#domain + this.#storageSeparator + this.#name) )

  }

  // Persistence Layer

  initializePersistence() {


    const currentValue = localStorage.getItem(this.#domain + this.#storageSeparator + this.#name);

    if (currentValue === null) {

      localStorage.setItem(this.#domain + this.#storageSeparator + this.#name, JSON.stringify( this ));

    } else {
      this.sync(JSON.parse(currentValue));
    }

  }

  synchronize() {
    const watcher = (event) => {
      if (event.key === this.#domain + this.#storageSeparator + this.#name) {
        this.sync(JSON.parse(event.newValue));
      }
    };
    window.addEventListener("storage", watcher);
    return () => window.removeEventListener("storage", watcher);
  }

  sync({ rev, revId, value }) {
    // evId tie-break uses string comparison.

    if(rev == this.#rev){
      this.#conflicts.push({ rev, revId, value });
      if (this.#conflicts.length > this.#conflicting) this.#conflicts.splice(0, this.#conflicts.length - this.#conflicting);
    }

    if (rev > this.#rev) {
      this.set(value, rev++); // +1 prevents conflicts
    } else if (rev == this.#rev && revId > this.#revId) {
      this.set(value, rev++);
    } else {
      // ignore because revision is lower than the current
    }
  }

  // Getters / Information

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get domain() {
    return this.#domain;
  }
  get readonly() {
    return Object.freeze({ value: () => this.peek() });
  }

  // Value System

  peek() {
    return this.#value;
  }

  get value() {
    if (this.#readSubscribers.size) {
      for (const subscriber of this.#readSubscribers) {
        subscriber(this.#value);
      }
    }
    return this.#value;
  }

  set value(v) {
    this.set(v)
  }

  set(newValue, rev=null, bump=true){
    if (Object.is(newValue, this.#value)) return;

    this.#value = newValue;

    if(bump){
      this.#rev = rev||this.#rev++;
      this.#revId = this.#uuid();
    }

    if (this.#usePersistence) {

      localStorage.setItem(this.#domain + this.#storageSeparator + this.#name, JSON.stringify( this ));

    }

    this.notify();
  }

  // Detect Writes

  // NOTE: Subscribers stored in Sets persist until unsubscribed/disposing;
  subscribe(subscriber, autorun = true) {
    if (typeof subscriber !== "function") throw new Error("Subscriber must be a function");

    if (autorun && this.#value !== undefined && this.#value !== null) subscriber(this.#value);

    this.#changeSubscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }
  unsubscribe(subscriber) {
    this.#changeSubscribers.delete(subscriber);
  }

  // Detect Reads

  sniff(subscriber) {
    this.#readSubscribers.add(subscriber);
    return () => this.unsniff(subscriber);
  }
  unsniff(subscriber) {
    this.#readSubscribers.delete(subscriber);
  }

  // Notifications

  notify() {
    if (this.#useScheduling) {
      for (const subscriber of this.#changeSubscribers) this.scheduler(subscriber);
    } else {
      for (const subscriber of this.#changeSubscribers) subscriber(this.#value);
    }
  }

  // Scheduler

  #scheduleQueue = new Set();
  #schedulePending = false;

  scheduler(subscriber) {
    this.#scheduleQueue.add(subscriber);
    if (!this.#schedulePending) {
      this.#schedulePending = true;
      queueMicrotask(() => {
        for (const f of this.#scheduleQueue) f(this.#value);
        this.#scheduleQueue.clear();
        this.#schedulePending = false;
      });
    }
  }

  // Garbage Collection

  dispose() {
    this.#readSubscribers.clear();
    this.#changeSubscribers.clear();
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear();
  }

  addDisposable(...disposables) {
    disposables.flat(Infinity).forEach(d => this.#disposables.add(d));
  }

  // Static Functions

  static filter(parent, test) {
    const child = new Signal();
    const subscription = parent.subscribe((v) => {
      if (test(v)) {
        child.value = v;
      }
    });
    child.addDisposable(subscription);
    return child;
  }

  static map(parent, map) {
    const child = new Signal();
    const subscription = parent.subscribe((v) => (child.value = map(v)));
    child.addDisposable(subscription);
    return child;
  }

  static combineLatest(...parents) {
    const child = new Signal();
    const updateCombinedValue = () => {
      const values = parents.map((signal) => signal.value);
      const nullish = values.some((value) => value == null);
      if (!nullish) child.value = values;
    };
    const subscriptions = parents.map((signal) => signal.subscribe(updateCombinedValue));
    child.addDisposable(subscriptions);
    return child;
  }


  #isSignal(obj = this.#value) {
    return obj && typeof obj.toJSON === 'function';
  }
  #isPrimitive(value = this.#value) {
      return (
          value === null || // Check for null
          typeof value !== 'object' && typeof value !== 'function' // Check for non-object and non-function types
      );
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "string") {
      return String(this.value);
    } else if (hint === "number") {
      return Number(this.value);
    }
    return this.value;
  }

  // Helper Functions

  #uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).slice(2);
    }
  }


  toJSON(){
      const key = `${this.#domain}${this.#storageSeparator}${this.#name}`;
      const val =  this.serialize(this.#value);
      // const type = this.#isPrimitive()?'primitive':'???';
      return { key, val, };
  }

  serialize( input = this ) {
    const walker = new TreeWalker({ walkReplacements: false, depthFirst: true });
    walker.visitor = (key, node, parent, path, isLeaf) => {

      if(this.#isSignal(node)){
        return node.toJSON();
      }else{
        if(this.#isPrimitive(node)){
          return node;
        }else{
          const key = `${this.#domain}${this.#storageSeparator}${this.#name}`;
          const type = this.#structural?'structural':'primitive'

          if(this.#structural){
            return { type, key };
          }else{
            const val = this.#value;
            return { type, key, val };
          }
        }
      }

    };
    return walker.walk( input );

  }
}
