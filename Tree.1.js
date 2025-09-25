import { uuid } from "./utilities.js";

import { Signal } from "./Signal.js";
import { State } from "./State.js";

import { Arborist } from "./Arborist.js";
import { TreeWalker } from "./TreeWalker.js";
// import { TreeNavigator } from "./TreeNavigator.js";
// import { TreeGenerator } from "./TreeGenerator.js";

export class Tree {
  #domain;
  state;
  #data;

  #disposables;

  constructor(domain, debug = false) {
    this.#disposables = new Set();

    this.#domain = domain;

    this.state = new State(domain);
    this.#data = this.state.set(uuid(), {}, { structural:true } )
    this.arborist = new Arborist(this.#data, this.state, { debug });




    this.treeGenerator = new TreeGenerator(this.#data, this.state, { debug });
    this.treeNavigator = new TreeNavigator(this.#data, { debug });

  }

  dispose() {
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear();
  }

  addDisposable(...disposables) {
    disposables.flat(Infinity).forEach((d) => this.#disposables.add(d));
  }

  clear() {
    localStorage.removeItem(this.#domain);
    this.state.clear();
    this.data = {};
  }

  // Commands //

  read(path) {
    return this.arborist.read(path);
  }

  create(path, data = null) {

    const signalified = this.signalify(data, 'BARE!');

    console.dir('signalified');
    console.dir(signalified);

    return this.arborist.write(path, signalified);

  }

  restore(path, data = null) {
    return this.treeGenerator.write(path, this.signalize(data));
  }

  write(path, value) {
    const node = this.treeNavigator.read(path);
    if (!node) throw new Error(`Path not found. Create the path with mk prior to use. (${path})`);

    if (node.signal instanceof Signal) {
      node.signal.value = value;
    } else {
      node.value = value;
    }
    return node.signal;
  }

  // Utilities //

  ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }

  get data() {
    return this.#data;
  }
  dump() {
    console.log(this.#data);
  }

  isFile(node) {
    return node && node.ext && node.signal && typeof node.signal.toJSON === "function";
  }

  hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }

  isPrimitive(value) {
    return (
      value === null || // Check for null
      (typeof value !== "object" && typeof value !== "function") // Check for non-object and non-function types
    );
  }


  // Serialization Toolkit //

  // convert POJO to signal tree
  // options.persistence = false;
  // options.synchronization = false;

  signalify(input, bare) {
    const walker = new TreeWalker({ walkReplacements: false, depthFirst: true });
    walker.visitor = (key, node, parent, path, isLeaf, isRoot) => {


      if(bare && isRoot) return; // return bare root for signal creation elsewhere

      const options = {};
      if (!isLeaf) options.structural = true;
      return this.state.set(uuid(), node, options);

    };
    const response = walker.walk(input);
    // console.log('RRR', input);
    // console.log('RRR', response);
    return response;
  }

  // convert key:val to signals
  signalize(key, data) {
    if (key === null || key === undefined) throw new Error(` Key must not be undefined. Received "${key}"`);
    if (!data) throw new Error(`Data is required. Received "${data}"`);
    let signalValue;
    for (const [propertyName, propertyValue] of Object.entries(data)) {
      if (this.isPrimitive(propertyValue)) {
        signalValue = propertyValue;
      } else if (Array.isArray(propertyValue)) {
        signalValue = [];
        for (const element of propertyValue) {
          signalValue.push(signalize(element.key, element.val));
        }
      } else {
        // isObject
        signalValue = {};
        for (const property of propertyValue) {
          signalValue[property] = signalize(property.key, property.val);
        }
      }
    }
    const [name, domain] = key.split(/--/);
    const signal = new Signal(signalValue, { name, domain, persistence: true, synchronization: true });
    return signal;
  }

  designalize() {
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if (this.isFile(node)) return node.signal.toJSON();
    };
    return walker.walk(this.#data);
  }

  flatten() {
    const flattened = [];
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if (this.hasExtension(key)) flattened.push(["restore", path.join("/"), node]);
    };
    walker.walk(this.designalize());
    return flattened;
  }

  toJSON() {
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if (node.ext) return { id: node.id, signal: node.signal };
    };
    const tree = walker.walk(this.#data);
    return tree;
  }

  stringify() {
    return JSON.stringify(this, null, 2);
  }

  save() {
    const content = this.stringify();
    return content;
  }

  persist() {
    const content = this.stringify();
    localStorage.setItem(this.#domain, content);
    return content;
  }

  hydrated() {
    const dehydrated = localStorage.getItem(this.#domain);
    // console.log('dehydrated:', dehydrated);
    if (dehydrated !== null) return JSON.parse(dehydrated);
  }

  load(data) {
    if (!data) data = this.hydrated();
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if (node && typeof node === "object" && "id" in node) {
        return {
          id: node.id,
          replacedAt: new Date().toISOString(),
          originalPath: path.join("/"),
          ext: this.ext(key),
          signal: this.state.get(node.id),
        };
      }
      return undefined;
    };
    this.#data = walker.walk(data);
  }
}
