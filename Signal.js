// ===============
// Signal.js
// ===============

export class Signal {
  #rev = 0;
  #revId = this.#uuid();
  #conflicts = [];

  #id;
  #name
  #domain;

  #value;

  #changeSubscribers;
  #readSubscribers;

  #disposables;

  #schedule;

  constructor(value, config) {
    const defaults = { domain: false, name: "unnamed", schedule: false, onRead: false };

    const options = Object.assign(defaults, config);

    this.#id = options.id ?? this.#uuid();
    this.#domain = options.domain;
    this.#name = options.name;

    this.#schedule = options.schedule; // scheduler support

    if (options.onRead) this.onRead(options.onRead);

    this.#value = value;



    this.#changeSubscribers = new Set();
    this.#readSubscribers = new Set();
    this.#disposables = new Set();

    this.readonly = () => ({
      get value() {
        return this.value;
      },
    });


    const currentValue = localStorage.getItem( this.domain +'-'+ this.name) ;
    if (currentValue === null) {
      localStorage.setItem( this.domain +'-'+ this.name, JSON.stringify({ rev: this.#rev, revId: this.#revId, value: this.#value }) );
    }else{
        this.sync(JSON.parse(currentValue));
    }

  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get domain() {
    return this.#domain;
  }

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

  watch() {
    const watcher = (event) => {
      if (event.key === this.domain +'-'+ this.name) {
        this.sync(JSON.parse(event.newValue));
      }
    };
    window.addEventListener("storage", watcher);
    return () => window.removeEventListener("storage", watcher);
  }

  sync({ rev, revId, value }) {
    if (rev > this.#rev) {
      this.#rev = rev; // set to equal, it is incremented later
      this.value = value;
    } else if (rev == this.#rev && revId > this.#revId) {
      this.value = value;
      this.#conflicts.push({ rev, revId, value });
    } else {
      // ignore because revision is lower than the current
    }
  }

  set value(newValue) {
    if (Object.is(newValue, this.#value)) return;

    this.#value = newValue;
    this.#rev++;
    this.#revId = this.#uuid();

    localStorage.setItem( this.domain +'-'+ this.name, JSON.stringify({ rev: this.#rev, revId: this.#revId, value: this.#value }) );

    this.notify();
  }

  subscribe(subscriber, autorun = true) {
    if (typeof subscriber !== "function")
      throw new Error("Subscriber must be a function");
    if (autorun && this.#value != null) subscriber(this.#value);
    this.#changeSubscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  unsubscribe(subscriber) {
    this.#changeSubscribers.delete(subscriber);
  }

  onRead(subscriber) {
    this.#readSubscribers.add(subscriber);
    return () => this.#readSubscribers.delete(subscriber);
  }

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

  notify() {
    if (this.#schedule) {
      for (const subscriber of this.#changeSubscribers)
        this.scheduler(subscriber);
    } else {
      for (const subscriber of this.#changeSubscribers)
        subscriber(this.#value);
    }
  }

  dispose() {
    this.#readSubscribers.clear();
    this.#changeSubscribers.clear();
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear();
  }

  addDisposable(...input) {
    [input].flat(Infinity).forEach((disposable) =>
      this.#disposables.add(disposable)
    );
  }

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
    const subscriptions = parents.map((signal) =>
      signal.subscribe(updateCombinedValue)
    );
    child.addDisposable(subscriptions);
    return child;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "string") {
      return String(this.value);
    } else if (hint === "number") {
      return Number(this.value);
    }
    return this.value;
  }

  #uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).substr(2);
    }
  }
}
