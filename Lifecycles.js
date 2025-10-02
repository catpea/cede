import { Tree } from "./Tree.js";
import { Signal } from "./modules/supernatural/index.js";

import { DisposableBidirectionalBinder } from "./Disposables.js";



export class ById {
  constructor(elementContext) {
    return new Proxy(this, {
      get(target, propertyName) {
        // Handle string property names only (ignore symbols and other types)
        if (typeof propertyName !== "string") {
          return target[propertyName];
        }
        // Perform querySelector with the property name as ID
        return elementContext.querySelector(`#${propertyName}`);
      },
    });
  }
}

export function moveNodeToIndex(node, newIndex) {
  const parent = node.parentNode;

  if (!parent) {
    console.error("Node has no parent");
    return;
  }

  const children = Array.from(parent.children);
  const currentIndex = children.indexOf(node);

  if (currentIndex === -1) {
    console.error("Node not found in parent children");
    return;
  }

  // If already at the target index, no need to move
  if (currentIndex === newIndex) {
    return;
  }

  // Validate new index
  if (newIndex < 0 || newIndex >= children.length) {
    console.error("Index out of bounds");
    return;
  }

  // Remove the node from DOM
  parent.removeChild(node);

  // Get fresh reference to children after removal
  const updatedChildren = Array.from(parent.children);

  // Calculate the correct insertion point
  let insertIndex = newIndex;
  if (currentIndex < newIndex) {
    // If moving forward, adjust index since we removed an element before it
    insertIndex = newIndex - 1;
  }

  // Insert at the new position
  if (insertIndex >= updatedChildren.length) {
    // Append to end
    parent.appendChild(node);
  } else {
    // Insert before the element at insertIndex
    parent.insertBefore(node, updatedChildren[insertIndex]);
  }
}

function combineLatest(...parents) {
  const child = new Signal();
  const updateCombinedValue = () => {
    const values = parents.map((signal) => signal);
    const nullish = values.some((value) => value == null);
    if (!nullish) child.value = values;
  };
  const subscriptions = parents.map((signal) => signal.subscribe(updateCombinedValue));
  child.addDisposable(subscriptions);
  return child;
}

export class Lifecycle {
  #id;
  #subscriberCategories = new Map();
  #terminatables = new Map(); // Track which subscriptions need .terminate()
  #scheduleQueue = new Set();
  #schedulePending = false;
  #disposables = new Set();
  #parent; // parent lifecycle
  #children = [];

  constructor({ id }) {
    this.#id = id;
  }

  get id() {
    return this.#id;
  }

  subscribe(category, subscribable, signalOptions, subscriber, subscribeOptions) {
    const unsubscribe = subscribable.subscribe(subscriber, signalOptions);

    const terminatable = subscribeOptions?.terminate && subscribable.terminate;

    this.addSubscription(category, unsubscribe, terminatable);
    return unsubscribe;
  }

  addSubscription(category, unsubscribe, terminatable) {
    this.#ensureSubscribeCategory(category);
    this.#subscriberCategories.get(category).add(unsubscribe);
    // Track if this subscription needs termination
    if (terminatable) {
      this.#terminatables.set(unsubscribe, subscribable);
    }
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

  disposeDisposables() {
    this.#disposables.forEach((disposable) => (disposable.dispose ? disposable.dispose() : disposable()));
    this.#disposables.clear();
  }

  addDisposable(...disposables) {
    disposables.flat(Infinity).forEach((d) => this.#disposables.add(d));
  }

  async initialize() {}
  async terminate() {}

  // Add to your Lifecycle class:

  async startAll() {
    const children = this.everyChild();
    for (const child of children) {
      // Call start() if it exists on the child
      if (typeof child.start === 'function') {
        await child.start();
      }
    }
  }

  async stopAll() {
    const children = this.everyChild(true); // leaf-first for proper teardown
    for (const child of children) {
      // Call stop() if it exists on the child
      if (typeof child.stop === 'function') {
        await child.stop();
      }
    }
  }

  async restartAll() {
    await this.stopAll();
    await this.startAll();
  }


  async initializeAll() {
    const children = this.everyChild();
    for (const child of children) {
      await child.initialize();
    }
  }

  async terminateAll() {
    const children = this.everyChild(true);

    for (const child of children) {
      await child.terminate();
    }
  }

  get children() {
    return this.#children;
  }

  // TODO, descend all children of children adding all children to the stack
  everyChild(leafFirst = false) {
    const stack = [this];
    const traverse = (node) => {
      // Add the current node's children to the stack
      for (const child of node.children) {
        if (leafFirst) {
          traverse(child); // Recursively traverse the child's children
          stack.push(child);
        } else {
          stack.push(child);
          traverse(child); // Recursively traverse the child's children
        }
      }
    };
    // Start traversing from the current node
    traverse(this);
    return stack;
  }

  addChild(child) {
    // Check if the child has an id property
    if (!child || !child.id) {
      throw new Error("Child must have an 'id' property.");
    }
    child.setParent(this);
    this.#children.push(child);
    return child;
  }

  deleteChild(id) {
    const index = this.#children.findIndex((child) => child.id === id);
    if (index !== -1) {
      this.#children.splice(index, 1);
    } else {
      throw new Error(`Child with id ${id} not found.`);
    }
  }

  getChild(id) {
    const child = this.#children.find((child) => child.id === id);
    if (!child) {
      throw new Error(`Child with id ${id} not found.`);
    }
    return child;
  }

  terminateChildren() {
    this.#children.forEach((child) => {
      if (typeof child.terminateChildren === "function") {
        child.terminateChildren(); // Recursively call terminateChildren on child
      }
    });
  }

  setParent(v) {
    return (this.#parent = v);
  }
  getParent() {
    return this.#parent;
  }
  get root() {
    return this.getRoot();
  }
  getRoot() {
    return this.#parent ? this.#parent.getRoot() : this;
  }

  // <template> cloning and removeal
  cloneTemplate(category, templateElement) {
    const clone = templateElement.content.cloneNode(true);
    clone.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // don't put text into the root that is not what application templates are for
        node.setAttribute("data-source-template", category);
      }
    });
    return clone;
  }

  removeTemplate(category, container) {
    const matches = container.querySelectorAll(`[data-source-template=${category}]`);
    matches.forEach((match) => container.removeChild(match));
  }
}

export class ApplicationLifecycle extends Lifecycle {
  id;
  #treeRoot;

  constructor({ id, container: rootContainer }) {
    super({ id });
    this.#treeRoot = new Tree("kernel-test", false);
    this.rootContainer = rootContainer;
    this.el = new ById(rootContainer);
  }

  get tree() {
    return this.#treeRoot;
  }

  async initialize() {}

  terminate() {
    this.disposeDisposables();
  }
}

export class TemplateLifecycle extends Lifecycle {
  constructor({ id, template, container }) {
    super({ id });
    this.template = template;
    this.container = container;
  }

  async initialize() {
    this.templateElement = this.root.el[this.template];
    this.templateContainer = this.root.el[this.container];

    const clone = this.cloneTemplate(this.template, this.templateElement);
    this.templateContainer.appendChild(clone);

    this.restart();
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {}

  start() {
    // a template is inert, nothing to do
  }

  terminate() {
    this.stop();
    this.unsubscribe();

    this.removeTemplate(this.template, this.templateContainer);
  }
}

export class RepeaterLifecycle extends Lifecycle {

  constructor({ id, path, template, container }) {

    super({ id });
    this.path = path;
    this.template = template;
    this.container = container;
    this.elementMap = new Map(); // Track elements by their object ID

  }

  async initialize() {

    this.templateElement = this.root.el[this.template];
    this.templateContainerElement = this.root.el[this.container];
    this.reactiveListArr = this.root.tree.read(this.path);

    this.start();

  }

  start() {
    this.subscribe("main", this.reactiveListArr, { diff: 'DOM' }, (value, patch, changes) => this.applyPatch(patch), {}); // Subscribe with DOM patch operations
  }

  applyPatch(patch) {
    patch.forEach(op => {
      if (op.op === 'removeChild') {
        this.removeElement(op.index);
      } else if (op.op === 'appendChild') {
        this.appendElement(op.value);
      } else if (op.op === 'insertBefore') {
        this.insertElement(op.value, op.index);
      }
    });
  }

  removeElement(index) {
    const element = this.templateContainerElement.children[index];
    if (element) {
      const objectId = element.getAttribute('data-identity');
      // Unsubscribe from all bindings for this element
      this.unsubscribe(`inner-${objectId}`);
      // Remove from DOM
      element.remove();
      // Remove from tracking map
      this.elementMap.delete(objectId);
    }
  }

  appendElement(obj) {
    const objectId = obj[Signal.Symbol].id;
    const element = this.createElement(obj, objectId);
    this.templateContainerElement.appendChild(element);
    this.bindElement(element, obj, objectId);
  }

  insertElement(obj, index) {
    const objectId = obj[Signal.Symbol].id;
    const element = this.createElement(obj, objectId);
    const referenceNode = this.templateContainerElement.children[index];
    this.templateContainerElement.insertBefore(element, referenceNode);
    this.bindElement(element, obj, objectId);
  }

  createElement(obj, objectId) {
    const cloned = this.templateElement.content.cloneNode(true);
    const container = document.createElement("div");
    container.appendChild(cloned);
    container.setAttribute("data-identity", objectId);
    this.elementMap.set(objectId, container);
    return container;
  }

  bindElement(element, obj, objectId) {
    const elements = element.querySelectorAll('[data-name]');
    elements.forEach(el => {
      const name = el.dataset.name;
      this.subscribe(
        `inner-${objectId}`, // Namespaced subscription
        obj[name],
        {},
        (v) => el.textContent = obj[name]
      );
    });
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    this.unsubscribe("main");
    this.unsubscribe("inner");
    // Also clean up all inner-* subscriptions
    this.elementMap.forEach((element, objectId) => {
      this.unsubscribe(`inner-${objectId}`);
    });
  }

  terminate() {
    this.stop();
    this.unsubscribe();
    this.removeTemplate(this.template, this.templateContainerElement);
    this.elementMap.clear();
  }
}



export class GradientLifecycle extends Lifecycle {
  gradients = [];
  colorStops = [];

  #treeRoot;
  rootContainer;

  constructor({ id }) {
    super({ id });
  }

  async initialize() {
    const gradientPreview = document.getElementById("gradientPreviewTemplate").content.cloneNode(true);
    this.root.el.gradientDemo.appendChild(gradientPreview);
    this.previewElement = this.root.el.gradientDemo.querySelector("#preview"); // Select The Preview UI

    const gradientSource = this.root.tree.read("/my-app/user/gradient.arr");

    this.subscribe("main", gradientSource, {}, (gradients) => {
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

    this.subscribe( "colors", combinedSignal, {}, () => { this.schedule(this.render); }, { terminate: true }, );
  }

  render() {
    const list = this.colorStops.map(([color, percent]) => `${color.value} ${percent.value}%`).join(",");
    this.previewElement.style.background = `linear-gradient(90deg, ${list})`;
  }

  terminate() {
    this.stop();
    this.unsubscribe("main");
    this.unsubscribe(); // all remaining
  }
}

export class ColorStopControlLifecycle extends Lifecycle {
  constructor({ id }) {
    super({ id });
  }

  async initialize() {
    this.colorStopTemplate = document.getElementById("colorStopTemplate");
    this.componentContainer = document.createElement("div");
    this.root.rootContainer.querySelector(`#gradientDemo`).appendChild(this.componentContainer);

    // app.registerPartial('gradientStopElement', ()=>document.getElementById('colorStopTemplate').content.cloneNode(true),(rootContainer)=>rootContainer.querySelector(`#gradientDemo`))
    this.gradients = this.root.tree.read("/my-app/user/gradient.arr");

    this.subscribe("main", this.gradients, {}, () => {
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

    console.log(` Use colorStopTemplate ${this.colorStopTemplate} to render each of the ${this.gradients?.length} gradients`);

    // this.root.el.gradientDemo.appendChild(gradientPreview);
    // this.previewElement = this.root.el.gradientDemo.querySelector("#preview"); // Select The Preview UI

    this.colorStops = [];
    const colorStopDependencies = [];

    for (const gradient of this.gradients) {
      const id = gradient[Signal.Symbol].id;
      const color = gradient.color;
      const percent = gradient.percent;
      colorStopDependencies.push(color, percent);
      this.colorStops.push([id, color, percent]);
    }

    // Create the combined signal
    const combinedSignal = Signal.combineLatest(...colorStopDependencies);
    this.subscribe( "colors", combinedSignal, {}, () => { this.schedule(this.render); }, { terminate: true }, );

  }

  upsert(id, index) {
    const existing = this.componentContainer.querySelector(`[data-identity="${id}"]`);

    if (existing) {
      moveNodeToIndex(existing, index);
      return existing; // Return the existing element if found
    } else {
      const cloned = this.colorStopTemplate.content.cloneNode(true);
      const container = document.createElement("div"); // Always wrap in a div
      container.appendChild(cloned);
      container.setAttribute("data-identity", id);
      this.componentContainer.appendChild(container); // Append the container to the parent
      return container; // Return the newly created container
    }
  }

  render() {
    // const list = this.colorStops.map(([color, percent]) => `${color.value} ${percent.value}%`).join(",");
    // this.previewElement.style.background = `linear-gradient(90deg, ${list})`;

    for (const [index, [id, color, percent]] of this.colorStops.entries()) {
      const element = this.upsert(id, index);
      const el = new ById(element);

      const disposable1 = new DisposableBidirectionalBinder(color, el.color);
      this.addSubscription("main", () => disposable1.dispose()); // "main" because upsert does not clear this actually

      const disposable2 = new DisposableBidirectionalBinder(percent, el.percent);
      this.addSubscription("main", () => disposable2.dispose()); // "main" because upsert does not clear this actually
    }
  }

  terminate() {
    this.stop();
    this.unsubscribe("main");
    this.unsubscribe(); // all remaining
  }
}
