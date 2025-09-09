import { Signal } from "./Signal.js";
import { State } from "./State.js";

export class Tree {
  #state;
  #data = {};

  constructor(domain) {
    this.#state = new State(domain);
  }

  mk(path, data = null) {
    return this.upsertTree(path, data);
  }

  read(path) {
    const node = this.lookupTree(path);
    if (node) return node.signal;
  }

  write(path, value) {
    const node = this.lookupTree(path);
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
    upsertTree(path, data = {}) {
      const segments = path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
      let node = this.#data;
      let signal = null;

      for (let i = 0; i < segments.length; i++) {
        const key = segments[i];
        const isLast = i === segments.length - 1;
        const ext = this.ext(key);

        // Only handle .arr and .obj extensions, everything else is treated as plain object or signal
        if (ext === "arr") {
          if (!node[key]) {
            const id = this.#uuid();
            const arrSignal = this.#state.set(id, []);
            node[key] = { id, ext, signal: arrSignal };
          }
          node = node[key];
          if (!isLast && /^\d+$/.test(segments[i + 1])) {
            i++;
            const idx = parseInt(segments[i], 10);
            if (!node.signal.value[idx]) node.signal.value[idx] = {};
            node = node.signal.value[idx];
          }
        } else if (ext === "obj") {
          if (!node[key]) {
            const id = this.#uuid();
            const objSignal = this.#state.set(id, {});
            node[key] = { id, ext, signal: objSignal };
          }
          node = node[key];
        } else {
          if (isLast) {
            // Final leaf: create signal if not present
            if (!node[key]) {
              const id = this.#uuid();
              signal = this.#state.set(id, data);
              node[key] = { id, ext: null, signal };
            } else if (!node[key].signal) {
              // Patch in signal if not present
              const id = this.#uuid();
              signal = this.#state.set(id, data);
              node[key].signal = signal;
            } else {
              // Use existing signal
              signal = node[key].signal;
              // Optionally update value if you want to overwrite
              // signal.value = data;
            }
            return node[key].signal;
          } else {
            if (!node[key]) node[key] = {};
            node = node[key];
          }
        }
      }
      // Defensive: If we exit the loop, return the signal if present
      return node?.signal;
    }


  lookupTree(path) {
    const segments = path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
    let node = this.#data;
    for (let i = 0; i < segments.length; i++) {
      const key = segments[i];
      const ext = this.ext(key);

      if (node && node[key]) {
        node = node[key];
        if (node.signal && ext === "arr" && i + 1 < segments.length && /^\d+$/.test(segments[i + 1])) {
          // Next segment is array index, descend into signal.value
          node = node.signal.value;
          i++;
          node = node[parseInt(segments[i], 10)];
        }
      } else {
        return undefined;
      }
    }
    return node;
  }

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
