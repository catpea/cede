import { Signal } from "./Signal.js";
import { State } from "./State.js";

// The properties of a tree are different from state
// it is a tree, it is less reactive
// it is a structured container for signals
// it is not a good idea to change structure of the tree when running, a tree is a naming scheme for variables, no one changes variable names at runtime.
export class Tree {
  #state;
  #data = {};

  constructor(domain) {
    this.#state = new State(domain);
  }

  // drill a nested object into a root object
  mk(path, data = null) {
    return this.upsertTree(path, data);
  }

  // read .data of an .obj
  read(path) {
    const node = this.lookupTree(path);
    if (node) return node.signal;
  }

  write(path, value) {
    const node = this.lookupTree(path);
    if(!node) throw new Error(`Path not found. Create the path with mk prior to use. (${path})`)

    if(node){
      if(node.signal instanceof Signal){
        node.signal.value = value;
      }else{
        node.value = value;
      }
      return node.signal;
    }
  }

  // -- //
  ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }

  lookupTree(path ) {
    let hadExtension = false;
    return path .replace(/^[/]+|[/]+$/, "") .split(/[/]/) .reduce((acc, key, currentIndex, array) => {

        if (hadExtension) {
          console.info( acc.value[key] )
          return acc.value[key];
        } else if (acc?.[key]) {
          const hasExtension = key.includes(".");
          if (hasExtension) {
            hadExtension = true;
            console.log('Extension returning', acc[key].signal)
            return acc[key].signal;
          } else {
            console.log('Plain returning', acc[key])
            return acc[key];
          }
        }

      }, this.#data);
  }

  upsertTree(path, data = {}) {
    let hadExtension = false;
    return path .replace(/^[/]+|[/]+$/, "") .split(/[/]/) .reduce((acc, key, currentIndex, array) => {
        const remaining = array.slice(currentIndex + 1);

        console.info(key, acc)

        if (!acc?.[key]) {
          const hasExtension = key.includes(".");
          const hasRemaining = remaining.length;

          if (hadExtension) {

            const id = this.#uuid();
            const value = hasRemaining ? { hadExtension } : data;
            const signal = this.#state.set(id, value);
            acc.value[key] = signal;
            return signal;

          } else if (hasExtension) {
            hadExtension = true;
            // create a .signal node
            const id = this.#uuid();
            const ext = this.ext(key);
            const signal = this.#state.set(id, ext == "arr" ? [] : {});
            acc[key] = { id, ext, signal };
            return acc[key].signal;

          } else {
            acc[key] = { node: true };
            return acc[key];
          }
        }else{

          if (hadExtension) {
            console.info( acc.value[key] )
            return acc.value[key];
          } else if (acc?.[key]) {
            const hasExtension = key.includes(".");
            if (hasExtension) {
              hadExtension = true;
              console.log('Extension returning', acc[key].signal)
              return acc[key].signal;
            } else {
              console.log('Plain returning', acc[key])
              return acc[key];
            }
          }


        }
      }, this.#data);
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
