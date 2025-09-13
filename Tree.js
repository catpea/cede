import { Signal } from "./Signal.js";
import { State } from "./State.js";

import { TreeWalker } from "./TreeWalker.js";
import { TreeNavigator } from "./TreeNavigator.js";
import { TreeGenerator } from "./TreeGenerator.js";

export class Tree {
  #domain;
  #state;
  #data = {};

  constructor(domain, debug = false) {
    this.#domain = domain;
    this.#state = new State(domain);
    this.treeGenerator = new TreeGenerator(this.#data, this.#state, { debug });
    this.treeNavigator = new TreeNavigator(this.#data, { debug });
  }

  mk(path, data = null) {
    return this.treeGenerator.write(path, data);
  }

  read(path) {
    return this.treeNavigator.read(path);
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

  ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }

  toJSON() {
    const walker = new TreeWalker();
    // Optionally override visitor:
    walker.visitor = (key, node, parent, path) => {

      if (node.ext) return { id: node.id, __signal: node.signal.toJSON() };
      // if (node.ext) return { pointer: this.#domain +'-'+ node.id };

      // const hasExtension = Object.hasOwn(node, "ext");
      // if (hasExtension) return { id: node.id };

      // if (key === 'signal' && node && typeof node.toJSON === 'function') return node.toJSON();

      return undefined;
    };

    const result = walker.walk( this.#data );
    return result;
  }

  stringify() {
    return JSON.stringify(this, null, 2);
  }

  save() {
    const content = this.stringify();
    localStorage.setItem(this.#domain, content);
    return content;
  }

  hydrated() {
    const dehydrated = localStorage.getItem(this.#domain);
    console.log('dehydrated:', dehydrated);
    if (dehydrated !== null) return JSON.parse(dehydrated);
  }
  load(data) {
    if (!data) data = this.hydrated();

    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      // Check if node is an object with an 'id' property

       console.log('###', key, node, path.includes('__signal')) ;
      if (node && typeof node === "object" && path.includes('__signal')) {
      }

      if (node && typeof node === "object" && "id" in node) {
        // Return replacement - this replaces the ENTIRE node
        return {
          id: node.id,
          replacedAt: new Date().toISOString(),
          originalPath: path.join("/"),
          ext: this.ext(key),

          // TODO use __signal based on dat in )))signal create a nested signal object

          signal: this.#state.get(node.id),
        };
      }
      return undefined;
    };
    this.#data = walker.walk(data);
  }

  dump() {
    console.log(this.#data);
  }
  hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }
  #uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).substr(2);
    }
  }
}
