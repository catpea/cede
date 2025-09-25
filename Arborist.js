import { uuid } from "./utilities.js";

import { Obj, Arr } from "./modules/supernatural/index.js";
// import { Obj, Arr } from "supernatural";

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
    const notFound = !(segment in state.location.value);

    if (notFound) {
      const options = {};

      if (segment.endsWith(".arr")) {
        device = Arr(null, options); // empty Array
      } else if (segment.endsWith("obj")) {
        device = Obj(null, options); // empty Object
      } else {
        device = Obj(null, options); // empty Object
      }

      state.location.value[segment] = this.#state.registerDevice(device);

      // state.location.value[segment] = this.#state.set(uuid(), segment.endsWith(".arr") ? [] : {});
    }

    return state.location.value[segment];
  }

  nextState(state, segment) {
    const location = this.ensureSignal(state, segment);
    return { location };
  }

  // assignData(location, data) {
  //   location.value = this.#state.set(uuid(), data);
  // }

  read(path) {
    console.error('THIS CODE IS OUTDATED USE supernatural now BECAUSE OBJ/ARR is reactive, it is no longer a signal with a .value but a parent.property where eveything is taken care of. Heads up add .delete, do not actually remove objects until after rehydration.')
    const root = this.#data;
    const segments = this.#parsePathSegments(path);
    const finalState = segments.reduce(
      (state, segment, index, segments) => {
        return this.nextState(state, segment, index, segments);
      },
      { location: root },
    );
    return finalState.location;
  }

  write(path, data) {
    console.error('THIS CODE IS OUTDATED USE supernatural now BECAUSE OBJ/ARR is reactive, it is no longer a signal with a .value but a parent.property where eveything is taken care of. Heads up add .delete, do not actually remove objects until after rehydration.')
    const root = this.#data;
    const segments = this.#parsePathSegments(path);

    const finalState = segments.reduce(
      (state, segment, index, segments) => {
        return this.nextState(state, segment, index, segments);
      },
      { location: root },
    );

    if (data) finalState.location.value = data;
    return finalState.location;
  }

  ///

  #parsePathSegments(path) {
    return path.replace(/^[/]+|[/]+$/, "").split(/[/]/);
  }

  #isLastSegment(segments, index) {
    return index >= segments.length - 1;
  }

  #hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }

  #getExtension(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }
}
