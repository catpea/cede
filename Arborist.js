import { uuid } from "./utilities.js";

import { Signal } from "./Signal.js";
import { Logger } from "./Logger.js";


export class Arborist {
  #data;
  #state;
  #debug;
  #logger;

  constructor(data, state, options = {}) {
    this.#data = data;
    this.#state = state;
    this.#debug = options.debug || false;
    this.#logger = new Logger(this.#debug);
  }

  // perform current state operations
  currentState(state, segment, index, segments) {
    // set access date?
  }

  // what should the next state be
  ensureSignal(state, segment) {
    if (!(segment in state.location.value)) state.location.value[segment] = this.#state.set(uuid(), segment.endsWith(".arr") ? [] : {});
    return state.location.value[segment];
  }

  nextState(state, segment) {
    const location = this.ensureSignal(state, segment);
    return { location };
  }

  assignData(location, data) {
    location.value = this.#state.set(uuid(), data);
  }

  read(path) {
    const root = this.#data;
    const segments = this.#parsePathSegments(path);
    const finalState = segments.reduce( (state, segment, index, segments) => {
      return this.nextState(state, segment, index, segments);
      }, { location: root, });
    return finalState.location;
  }
  write(path, data) {
    const root = this.#data;
    const segments = this.#parsePathSegments(path);
    const finalState = segments.reduce( (state, segment, index, segments) => {
      return this.nextState(state, segment, index, segments);
      }, { location: root, });
    if(data) finalState.location.value = data;
    return finalState.location;
  }

  #parsePathSegments(path) {
    return path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
  }

  #isLastSegment(segments, index) {
    return index >= segments.length - 1;
  }

  #hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }



  #ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }
}
