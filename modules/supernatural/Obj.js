import {Signal} from './Signal.js';
import {Watcher} from './Watcher.js';

export class Obj {

  constructor(data, options) {
    if (data) Object.apply(this, data);

    this[Signal.Symbol] = new Signal(this, options);
    const members = [
      // Watch all property assignments
      {
        name: (prop) => typeof prop === 'string' && !prop.startsWith('_'),
        after: () => this[Signal.Symbol].notify()
      },
    ];
    return Watcher.watch(this, members /*, member => {} */);
  }
  subscribe(...etc){ return this[Signal.Symbol].subscribe(...etc); }
}
