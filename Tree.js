import { Signal } from "./Signal.js";
import { State } from "./State.js";
import { TreeNavigator } from "./TreeNavigator.js";
import { TreeGenerator } from "./TreeGenerator.js";

export class Tree {
  #state;
  #data = {};

  constructor(domain) {
    this.#state = new State(domain);
    this.treeGenerator = new TreeGenerator(this.#data, this.#state, { debug: true });
    this.treeNavigator = new TreeNavigator(this.#data, { debug: true });
  }

  mk(path, data = null) {
    return this.treeGenerator.write(path, data);
    // return this.upsertTree(path, data);
  }

  read(path) {
    const node = this.treeNavigator.read(path);
    if (node) return node ;
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

  // New upsertTree
  // upsertTree(path, data = {}) {
  //   const segments = path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
  //   let node = this.#data;
  //   let parent = null;
  //   let key = null;

  //   for (let i = 0; i < segments.length; i++) {
  //     key = segments[i];
  //     const isLast = i === segments.length - 1;
  //     const ext = this.ext(key);
  //     const hasExt = !!ext;

  //     // For .arr or .obj, treat differently
  //     if (hasExt) {
  //       // If .arr, ensure node[key] is an array signal
  //       if (ext === "arr") {
  //         if (!node[key]) {
  //           const id = this.#uuid();
  //           const signal = this.#state.set(id, []);
  //           node[key] = { id, ext, signal };
  //         }
  //         // For array indices, descend into signal.value (the array)
  //         if (!isLast && /^\d+$/.test(segments[i + 1])) {
  //           // Next is array index, descend
  //           node = node[key].signal.value;
  //           i++;
  //           const idx = parseInt(segments[i], 10);
  //           if (!node[idx]) node[idx] = {};
  //           parent = node;
  //           node = node[idx];
  //           continue;
  //         }
  //         parent = node;
  //         node = node[key];
  //       } else if (ext === "obj") {
  //         if (!node[key]) {
  //           const id = this.#uuid();
  //           const signal = this.#state.set(id, {});
  //           node[key] = { id, ext, signal };
  //         }
  //         parent = node;
  //         node = node[key];
  //       } else {
  //         // Other extensions: treat as leaf signal
  //         if (!node[key]) {
  //           const id = this.#uuid();
  //           const signal = this.#state.set(id, isLast ? data : {});
  //           node[key] = { id, ext, signal };
  //         }
  //         parent = node;
  //         node = node[key];
  //       }
  //     } else {
  //       // Plain key, not extension
  //       if (!node[key]) node[key] = {};
  //       parent = node;
  //       node = node[key];
  //     }
  //   }

  //   // At leaf: If node is signal container, update value if present
  //   if (node.signal instanceof Signal && data !== undefined) {
  //     // Only update if data is not undefined
  //     node.signal.value = data;
  //     return node.signal;
  //   }
  //   // If node is just plain object, return as is
  //   return node;
  // }

  // New upsertTree: always returns the Signal at the leaf


  dump() {
    console.log(this.#data);
  }

  #uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).substr(2);
    }
  }
}
