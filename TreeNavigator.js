import { Logger } from "./Logger.js";
import { Signal } from "./Signal.js";

class NavigatorState {
  constructor(logger) {
    this.logger = logger;
  }

  hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }
}

class PlainState extends NavigatorState {
  name = "plain";
  access(node, key) {
    return node[key];
  }
  nextState(currentKey, nextKey) {
    return this.hasExtension(currentKey) ? "ext" : "plain";
  }
}

class ExtState extends NavigatorState {
  name = "ext";
  access(node, extensionSignalKey) {
    const extensionSignal = node.signal;
    const actualSignal = extensionSignal.value;
    const response = actualSignal.value[extensionSignalKey];

    this.logger.log('YYY DAT', node, extensionSignalKey);
    this.logger.log('YYY RET', response);
    return response;
  }
  nextState() {
    return "signal";
  }
}

class SignalState extends NavigatorState {
  name = "signal";
  access(node, key) {
    if(!(node instanceof Signal)) throw new TypeError('SignalState received an object that is not Signal, check the tree generator for errors.')
    const response = node.value[key];
    this.logger.log('YYY SIG RET', response);
    return response;
  }
  nextState() {
    return "signal";
  }
}

export class TreeNavigator {
  #states;
  #data;

  // -- //

  constructor(data, options = {}) {
    this.debug = true; //options.debug || false;
    this.logger = new Logger(this.debug);
    this.#states = Object.fromEntries([PlainState, ExtState, SignalState].map((Class) => new Class(this.logger)).map((c) => [c.name, c]));
    this.#data = data;
  }

  read(path) {
    this.logger.group(`read: "${path}"`);
    const segments = this.#parsePathSegments(path);
    const state = segments.reduce(this.reducer.bind(this), { node: this.#data, mode: "plain" });

    this.logger.groupEnd();
    return state.node;
  }

  reducer(state, segment, currentIndex, array) {
    this.logger.log(`Reading segment ${segment} (${currentIndex}) using currentState=${state.mode} reader`);

    const currentState = this.#states[state.mode];
    const node = currentState.access(state.node, segment);
    const mode = currentState.nextState(array[currentIndex], array[currentIndex+1]);
    this.logger.log({ node, mode });

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
