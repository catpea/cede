import { Builder, Obj, Arr, Signal } from "./modules/supernatural/index.js";

export class Lifecycle {
  #subscriberCategories = new Map();
  #terminatables = new Map(); // Track which subscriptions need .terminate()
  #scheduleQueue = new Set();
  #schedulePending = false;

  subscribe(category, subscribable, subscriber, options) {
    this.#ensureSubscribeCategory(category);

    const unsubscribe = subscribable.subscribe(subscriber);
    this.#subscriberCategories.get(category).add(unsubscribe);

    // Track if this subscription needs termination
    if (options?.terminate && subscribable.terminate) {
      this.#terminatables.set(unsubscribe, subscribable);
    }

    return unsubscribe;
  }

  // Helper to check if category has active subscriptions
  hasSubscriptions(category) {
    return this.#subscriberCategories.get(category)?.size > 0;
  }

  // Helper to get subscription count
  getSubscriptionCount(category) {
    if (category) {
      return this.#subscriberCategories.get(category)?.size || 0;
    }
    let total = 0;
    for (const subs of this.#subscriberCategories.values()) {
      total += subs.size;
    }
    return total;
  }

  unsubscribeAll() {
    // Unsubscribe all categories
    for (const [cat, subscriptions] of this.#subscriberCategories) {
      for (const unsubscribe of subscriptions) {
        unsubscribe();

        // Check if this subscription needs termination
        const subscribable = this.#terminatables.get(unsubscribe);
        if (subscribable) {
          subscribable.terminate();
          this.#terminatables.delete(unsubscribe);
        }
      }
      subscriptions.clear();
    }
    this.#subscriberCategories.clear();
    this.#terminatables.clear();
  }

  unsubscribe(category) {
    if (!category) return this.unsubscribeAll();

    // Unsubscribe specific category
    const subscriptions = this.#subscriberCategories.get(category);
    if (subscriptions) {
      for (const unsubscribe of subscriptions) {
        unsubscribe();

        // Check if this subscription needs termination
        const subscribable = this.#terminatables.get(unsubscribe);
        if (subscribable) {
          subscribable.terminate();
          this.#terminatables.delete(unsubscribe);
        }
      }
      subscriptions.clear();
    }
  }

  #ensureSubscribeCategory(category) {
    if (!this.#subscriberCategories.has(category)) {
      this.#subscriberCategories.set(category, new Set());
    }
  }

  schedule(method) {
    this.#scheduleQueue.add(method);

    if (!this.#schedulePending) {
      this.#schedulePending = true;
      queueMicrotask(() => {
        for (const method of this.#scheduleQueue) {
          method.bind(this)();
        }
        this.#scheduleQueue.clear();
        this.#schedulePending = false;
      });
    }
  }
}

export class GradientLifecycle extends Lifecycle {
  gradients = [];
  colorStops = [];

  tree;
  el;

  constructor(tree, el){
    super();
    this.tree = tree;
    this.el = el;
  }

  initialize() {
    const gradientSource = this.tree.read("/my-app/user/gradient.arr");

    this.subscribe("main", gradientSource, (gradients) => {
      this.gradients = gradients;
      this.schedule(this.restart);
    });
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    this.unsubscribe("colors");
  }

  start() {
    if (!this.gradients?.length) return;

    this.colorStops = [];
    const colorStopDependencies = [];

    for (const gradient of this.gradients) {
      const color = gradient.color;
      const percent = gradient.percent;
      colorStopDependencies.push(color, percent);
      this.colorStops.push([color, percent]);
    }

    // Create the combined signal
    const combinedSignal = Signal.combineLatest(...colorStopDependencies);

    this.subscribe(
      "colors",
      combinedSignal,
      () => {
        this.schedule(this.render);
      },
      { terminate: true },
    );
  }

  render() {
    const list = this.colorStops.map(([color, percent]) => `${color.value} ${percent.value}%`).join(",");
    this.el.style.background = `linear-gradient(90deg, ${list})`;
  }

  terminate() {
    this.stop();
    this.unsubscribe("main");
    this.unsubscribe(); // all remaining
  }
}
