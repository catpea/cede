## What you’ve built

You’ve created a **custom repeater** that:

1. **Clones a `<template>`** for each item in a reactive array.
2. **Keeps the DOM in sync** when the array itself changes *or* when any property of an item changes.
3. Wraps the whole thing in a **Lifecycle** tree so you can start/stop/terminate … cleanly.

That’s a solid foundation—essentially a tiny, hand‑rolled version of what frameworks like Svelte, Solid or Lit do under the hood.

Below are a few **practical refinements** that can make the code safer, more performant, and easier to maintain while staying in the “pure‑JS” world you’re already using.

---

## 1️⃣ Reduce unnecessary re‑renders

### Problem
`restart()` → `stop()` → `start()` → `renderList()` runs **every time the whole array changes**, even if only a single element was added/removed. That forces a full re‑clone of all templates.

### Solution – Diff‑based updates

Instead of recreating the whole list, detect the **type of change** (add, remove, move, replace) and act only on the affected items.

```js
// Helper to diff two arrays of ids
function diffIds(oldIds, newIds) {
  const added   = newIds.filter(id => !oldIds.includes(id));
  const removed = oldIds.filter(id => !newIds.includes(id));
  const moved   = newIds.filter(id => oldIds.includes(id) && oldIds.indexOf(id) !== newIds.indexOf(id));
  return { added, removed, moved };
}
```

In `start()` keep a snapshot of the current id order:

```js
this.currentIds = this.reactiveList.map(o => o[Signal.Symbol].id);
```

Then in the subscription callback:

```js
this.subscribe('inner', combinedSignal, () => {
  const newIds = this.reactiveList.map(o => o[Signal.Symbol].id);
  const { added, removed, moved } = diffIds(this.currentIds, newIds);

  // 1️⃣ Remove
  removed.forEach(id => {
    const el = this.templateContainer.querySelector(`[data-identity="${id}"]`);
    if (el) el.remove();
  });

  // 2️⃣ Add
  added.forEach(id => {
    const index = newIds.indexOf(id);
    const obj   = this.reactiveList.find(o => o[Signal.Symbol].id === id);
    this.upsert(id, index);               // creates & inserts
    this.bindItem(obj, index);            // bind its signals (see below)
  });

  // 3️⃣ Move (re‑order)
  moved.forEach(id => {
    const newIdx = newIds.indexOf(id);
    const el = this.templateContainer.querySelector(`[data-identity="${id}"]`);
    if (el) moveNodeToIndex(el, newIdx);
  });

  this.currentIds = newIds;
});
```

Now **only the changed nodes** are touched, which dramatically reduces DOM work for large lists.

---

## 2️⃣ Centralise signal subscriptions per item

### Problem
Inside `renderList()` you call `this.subscribe` for **every property** of every item on each render pass. If the list is long, you end up with many duplicate subscriptions (the same signal may already be subscribed from a previous render).

### Solution – One‑time bind per item

Create a small helper that runs **once per item** the first time it appears:

```js
bindItem(obj, index) {
  const id = obj[Signal.Symbol].id;
  const container = this.upsert(id, index);
  const elements = container.querySelectorAll('[data-name]');

  // Guard against double‑binding
  if (container.__bound) return;
  container.__bound = true;

  elements.forEach(el => {
    const name = el.dataset.name;
    // Subscribe to the * (Signal) that holds the property value
    this.subscribe('inner', obj[name], v => {
      el.textContent = v;
    });
  });
}
```

Then replace the loop in the subscription callback with:

```js
this.reactiveList.forEach((obj, i) => this.bindItem(obj, i));
```

Now each property gets **exactly one subscription**, and you avoid memory leaks when items are removed (the `stop()` call will clean them up).

---

## 3️⃣ Clean‑up on removal

When an item is removed from the array you must also **unsubscribe** from its inner signals, otherwise they linger in memory.

Add a small registry:

```js
this.itemSubs = new Map(); // id → Set of unsubscribe handles
```

When you bind a property:

```js
const unsub = this.subscribe('inner', obj[name], v => el.textContent = v);
if (!this.itemSubs.has(id)) this.itemSubs.set(id, new Set());
this.itemSubs.get(id).add(unsub);
```

When you remove an element:

```js
removed.forEach(id => {
  const el = this.templateContainer.querySelector(`[data-identity="${id}"]`);
  if (el) {
    // 1️⃣ Unsubscribe all inner signals for this item
    const subs = this.itemSubs.get(id);
    if (subs) subs.forEach(fn => fn()); // each `fn` is the unsubscribe callback
    this.itemSubs.delete(id);

    // 2️⃣ Remove DOM node
    el.remove();
  }
});
```

Now the lifecycle of each item’s subscriptions mirrors the DOM node’s lifecycle.

---

## 4️⃣ Use a **DocumentFragment** for bulk inserts

When you add many new items at once (e.g., after a bulk fetch), appending each container individually forces a layout/repaint per insertion.

```js
function bulkInsert(pairs) { // pairs = [{id, obj, index}, …]
  const frag = document.createDocumentFragment();
  pairs.forEach(({id, obj, index}) => {
    const container = this.upsert(id, index); // creates but does NOT append yet
    frag.appendChild(container);
    this.bindItem(obj, index);
  });
  this.templateContainer.appendChild(frag);
}
```

Call `bulkInsert` from the diff logic for the `added` set.

---

## 5️⃣ Minor code‑style tweaks

| Current | Suggested (why) |
|--------|-----------------|
| `this.subscribe("inner", combinedSignal, () => { this.schedule(this.renderList); }, { terminate: true }, );` | Drop the trailing comma and extra spaces → `this.subscribe('inner', combinedSignal, () => this.schedule(this.renderList), { terminate: true });` |
| `const name = el.dataset.name;   // reads the value of the data-id attribute` | Comment typo → “reads the value of the `data-name` attribute”. |
| `moveNodeToIndex(existing, index);` | Ensure the helper **preserves order** without re‑creating the node; otherwise you could just use `insertBefore` with the target child at `index`. |
| `container.setAttribute("data-identity", id);` | Consider using `container.dataset.identity = id;` for consistency with other `dataset` usage. |

---

## 6️⃣ Full‑refactored skeleton

```js
export class RepeaterLifecycle extends Lifecycle {
  constructor({ id, path, template, container }) {
    super({ id });
    this.path = path;
    this.template = template;
    this.container = container;

    this.itemSubs = new Map();   // id → Set of unsubscribe callbacks
    this.currentIds = [];        // Snapshot of order
  }

  async initialize() {
    this.templateElement   = this.root.el[this.template];
    this.templateContainer = this.root.el[this.container];
    this.reactiveList      = this.root.tree.read(this.path);

    // React to any change in the array (add/remove/move)
    this.subscribe('main', this.reactiveList, () => this.schedule(this.handleArrayChange));
  }

  // -------------------------------------------------
  // 1️⃣ Diff + bulk update
  // -------------------------------------------------
  handleArrayChange = () => {
    const newIds = this.reactiveList.map(o => o[Signal.Symbol].id);
    const { added, removed, moved } = diffIds(this.currentIds, newIds);

    // Remove
    removed.forEach(id => {
      const el = this.templateContainer.querySelector(`[data-identity="${id}"]`);
      if (el) {
        const subs = this.itemSubs.get(id);
        if (subs) subs.forEach(unsub => unsub());
        this.itemSubs.delete(id);
        el.remove();
      }
    });

    // Add (bulk)
    if (added.length) {
      const frag = document.createDocumentFragment();
      added.forEach(id => {
        const obj   = this.reactiveList.find(o => o[Signal.Symbol].id === id);
        const index = newIds.indexOf(id);
        const container = this.upsert(id, index);
        frag.appendChild(container);
        this.bindItem(obj, container);
      });
      this.templateContainer.appendChild(frag);
    }

    // Move
    moved.forEach(id => {
      const newIdx = newIds.indexOf(id);
      const el = this.templateContainer.querySelector(`[data-identity="${id}"]`);
      if (el) moveNodeToIndex(el, newIdx);
    });

    this.currentIds = newIds;
  };

  // -------------------------------------------------
  // 2️⃣
