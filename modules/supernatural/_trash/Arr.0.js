import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

export class Arr extends Array {

  constructor(data, options) {
    data?super(...data):super();
    this[Signal.Symbol] = new Signal(this, options);
    const members = [
      // RegExp for numeric indexes
      {
        name: /^\d+$/,
        after: () => this[Signal.Symbol].notify()
      },

      {
        name: (prop) => ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'length'].includes(prop),
        after: () => this[Signal.Symbol].notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this[Signal.Symbol].subscribe(...etc); }
}
