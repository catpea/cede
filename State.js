import { Signal } from "./Signal.js";

export class State {
  #domain;
  #signals;
  #undoStack;
  #redoStack;

  constructor(domain) {

    this.#domain = domain;
    this.#signals = new Map();
    this.#undoStack = [];
    this.#redoStack = [];

  }



  // // --- Creation ---
  // newValue(name, value) {
  //  const valueSignal = new Signal(value, { domain: this.#domain, name });
  //   this.#signals.set(name, valueSignal);
  //   return valueSignal;
  // }

  // newArray(name, ...initial) {
  //  const arraySignal = new Signal(initial, { domain: this.#domain, name });
  //   this.#signals.set(name, arraySignal);
  //   return arraySignal;
  // }

  // newObject(name, ...initial) {
  //  const objectSignal = new Signal(obj, { domain: this.#domain, name });
  //   this.#signals.set(name, objectSignal);
  //   return objectSignal;
  // }


  get size(){
    return this.#signals.size;
  }

  clear(){
    for (const signal of this.#signals.values() ){
      signal.dispose();
    }
    this.#signals.clear();
  }

  set(name, value=null, options) {

    let signal;
    if(this.#signals.has(name)){
     signal = this.#signals.get(name);
    }else{

      const defaults = {
        name,
        domain: this.#domain,
        persistence: true,
        synchronization: true,
      };
      // console.log('1>>>', value, Object.assign({}, defaults,options))
     signal = new Signal(value, Object.assign({}, defaults,options));

     this.#signals.set(name, signal);
    }
    signal.value = value;
    return signal;
  }

  get(name) {
    return this.#signals.get(name);
  }






  // --- Mutations with Undo ---
  setValue(name, value) {
    const signal = this.get(name);
    if (!signal) throw new Error(`Signal ${name} not found`);
    const oldValue = signal.value;

    const doChange = () => (signal.value = value);
    const undoChange = () => (signal.value = oldValue);

    doChange();
    this.#pushAction(doChange, undoChange);
  }

  splice(arrayName, start, count, ...values) {
    const signal = this.get(arrayName);
    if (!signal) throw new Error(`Array signal ${arrayName} not found`);
    const oldValue = [...signal.value];

    const doChange = () => {
      const arr = [...signal.value];
      arr.splice(start, count, ...values);
      signal.value = arr;
    };
    const undoChange = () => (signal.value = oldValue);

    doChange();
    this.#pushAction(doChange, undoChange);
  }

  delete(objectName, key) {
    const signal = this.get(objectName);
    if (!signal) throw new Error(`Signal ${objectName} not found`);
    const oldValue = { ...signal.value };
    const doChange = () => { const obj = { ...signal.value }; delete obj[key]; signal.value = obj; };
    const undoChange = () => (signal.value = oldValue);

    doChange();
    this.#pushAction(doChange, undoChange);
  }

  // --- Undo/Redo ---
  undo() {
    const action = this.#undoStack.pop();
    if (action) {
      action.undo();
      this.#redoStack.push(action);
    }
  }

  redo() {
    const action = this.#redoStack.pop();
    if (action) {
      action.do();
      this.#undoStack.push(action);
    }
  }

  #pushAction(doChange, undoChange) {
    this.#undoStack.push({ do: doChange, undo: undoChange });
    this.#redoStack = []; // clear forward history
  }
}
