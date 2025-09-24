import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

export class Obj {
  #signal;
  constructor(data, options) {
    if (data) Object.apply(this, data);

    this.#signal = new Signal(this, options);
    const members = [
      // Watch all property assignments
      {
        name: (prop) => typeof prop === 'string' && !prop.startsWith('_'),
        after: () => this.#signal.notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this.#signal.subscribe(...etc); }
}
