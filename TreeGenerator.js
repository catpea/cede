import { Signal } from "./Signal.js";
import { Logger } from "./Logger.js";

class GeneratorState {
  constructor(state, logger) {
    this.state = state;
    this.logger = logger;
  }
  hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }
  uuid() {
    // if(!globalThis.mockId) globalThis.mockId = 0;
    // return globalThis.mockId++

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).substr(2);
    }
  }
  ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }
}

class PlainState extends GeneratorState {
  name = "plain";
  access(node, key) {
    this.logger.log(">>>PlainState");

    if (!node[key]) {
      node[key] = {};
      if (this.nextState(key) == "ext") {
        const id = this.uuid();
        const ext = this.ext(key);

        const signal = this.state.set(id, ext == "arr" ? [] : {});
        node[key].id = id;
        node[key].ext = ext;
        node[key].signal = signal;
      }
    }

    return node[key];
  }
  nextState(key) {
    return this.hasExtension(key) ? "ext" : "plain";
  }
}

class ExtState extends GeneratorState {
  name = "ext";
  access(node, extensionSignalKey) {
    this.logger.log(">>>ExtState", node.ext, node, extensionSignalKey);
    const extensionSignal = node.signal;

    if (!extensionSignal.value[extensionSignalKey]) {
      const id = this.uuid();
      const ext = this.ext(extensionSignalKey);
      const signal = this.state.set(id, ext == "arr" ? [] : {});
      extensionSignal.value[extensionSignalKey] = signal;
    }

    const response = extensionSignal.value[extensionSignalKey];
    return response;
  }
  nextState() {
    return "signal";
  }
}

class SignalState extends GeneratorState {
  name = "signal";
  access(node, key) {
    this.logger.log(">>>SignalState");

    if (!node.value[key]) {
      const id = this.uuid();
      const signal = this.state.set(id, {});
      // console.log("KKK", node.value);

      if (Array.isArray(node.value)) {
        const index = parseInt(key, 10);
        node.value[index] = signal;
        // console.log("KKK Assign to ", node.value, "at index", index, key, signal);
      } else {
        node.value[key] = signal;
      }
      // console.log("KKK", node.value);
    }

    return node.value[key];
  }
  nextState() {
    return "signal";
  }
}

export class TreeGenerator {
  #data;
  #state;
  #states;

  // -- //

  constructor(data, state, options = {}) {
    this.#data = data;
    this.#state = state;
    this.debug = options.debug || false;
    this.logger = new Logger(this.debug);
    this.#states = Object.fromEntries([PlainState, ExtState, SignalState].map((Class) => new Class(this.#state, this.logger)).map((c) => [c.name, c]));
  }

  write(path, data) {
    this.logger.group(`write: "${path}"`);
    const segments = this.#parsePathSegments(path);
    const state = segments.reduce(this.reducer.bind(this), { node: this.#data, mode: "plain" });

    if(state.node.ext){
    state.node.signal.value = data;
    }else{
      state.node.value = data;
    }

    this.logger.groupEnd();
    return state.node;
  }

  reducer(state, segment, currentIndex, array) {
    // console.log("\n\nREDUCER-----------------------------------------");
    // // console.log(`mode:${state.mode}> cwd:/${array.slice(0, currentIndex).join("/")} #read: ${segment}`);
    // console.log(`mode:${state.mode}> cwd:/${array.map((o, i) => (i == currentIndex - 1 ? `[${o}]` : o)).join("/")} #read: ${segment}`);

    const currentState = this.#states[state.mode];
    const node = currentState.access(state.node, segment);
    const mode = currentState.nextState(segment);

    // console.log(`RETURN`, node, mode);
    return { node, mode };
  }

  // Helper methods for clarity //

  #parsePathSegments(path) {
    return path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
  }
  #isLastSegment(segments, index) {
    return index >= segments.length - 1;
  }
}
