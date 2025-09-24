import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

export class Arr extends Array {
  #signal;
  constructor(data, options) {
    data?super(...data):super();
    this.#signal = new Signal(this, options);
    const members = [
      // RegExp for numeric indexes
      /^\d+$/,
      {
        name: (prop) => ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'length'].includes(prop),
        after: () => this.#signal.notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this.#signal.subscribe(...etc); }
}
