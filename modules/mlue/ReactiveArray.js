import { Revision, Watcher } from "#mlue";

export class ReactiveArray extends Array {
  constructor(...a) {
    super(...a);
    this.rev = new Revision(this, 0);
    const members = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", /^\d+$/]; // NOTE: /^\d+$/ matches arr[0-90-9...]
    return Watcher.watch(this, members, () => this.rev.inc());
  }
}

export class DisposableArrayListener {
  #unsubscribe;
  #previousIds = [];

  constructor(array, event, handler, options = { key: "id" }) {
    this.array = array;
    this.event = event;
    this.handler = handler;
    this.options = options;
    this.isDisposed = false;

    // Add the listener
    this.#unsubscribe = this.array.rev.subscribe(this.#listener.bind(this));
  }

  #listener([rev, uuid]) {
    const metadata = {
      rev,
      uuid,
      change: detectSetChanges( this.#previousIds, this.array.map((o) => o[this.options.key])),
      order: detectOrderChanges( this.#previousIds, this.array.map((o) => o[this.options.key])),
    };
    this.handler(metadata);
    this.#previousIds = this.array.map((o) => o[this.options.key]);
  }

  dispose() {
    if (this.isDisposed) {
      console.warn("Event listener already disposed.");
      return;
    }
    // Remove the event listener
    this.#unsubscribe();
    this.isDisposed = true;
    console.log(`Event listener for ${this.event} disposed.`);
  }
}

/**
 * detectSetChanges(oldItems, newItems)
 *
 * Compares two iterables of IDs using the standard modern Set instance methods:
 * difference, intersection, symmetricDifference, union, isDisjointFrom,
 * isSubsetOf, isSupersetOf.
 *
 * Note: This requires a JS environment that implements these Set instance methods.
 *
 * @param {Iterable<*>} oldItems
 * @param {Iterable<*>} newItems
 * @returns {{
 *   added: Set,
 *   removed: Set,
 *   unchanged: Set,
 *   union: Set,
 *   intersection: Set,
 *   symmetricDifference: Set,
 *   isDisjoint: boolean,
 *   isSubset: boolean,
 *   isSuperset: boolean
 * }}
 */
export function detectSetChanges(oldItems, newItems) {
  const a = new Set(oldItems);
  const b = new Set(newItems);

  const added = b.difference(a);
  const removed = a.difference(b);
  const unchanged = a.intersection(b);
  const union = a.union(b);
  const intersection = unchanged;
  const symmetricDifference = a.symmetricDifference(b);

  return {
    added,
    removed,
    unchanged,
    union,
    intersection,
    symmetricDifference,
    isDisjoint: a.isDisjointFrom(b),
    isSubset: a.isSubsetOf(b),
    isSuperset: a.isSupersetOf(b),
  };
}

/**
 * detectOrderChanges(previousIds, currentIds)
 *
 * Returns an array describing each current id's previous index (or undefined if new)
 * and current index.
 *
 * @param {Iterable} previousIds
 * @param {Iterable} currentIds
 * @returns {Array<{ id: *, previousIndex: number|undefined, currentIndex: number }>}
 */
export function detectOrderChanges(previousIds, currentIds) {
  const previousIndexById = new Map(Array.from(previousIds, (id, idx) => [id, idx]));

  const currentIndexById = Array.from(currentIds, (id, idx) => {
    const previousIndex = previousIndexById.get(id);
    return { id, previousIndex, currentIndex: idx };
  });

  return currentIndexById;
}
