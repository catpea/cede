# cede
The Practical Operating Substrate for Apps

**cede** is a lightweight state kernel for modern JavaScript applications.
It gives you **Signals**, **State domains**, and **automatic persistence** without any framework overhead.
Think of it as a minimal reactive core you can drop into any project.


```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚔️</text></svg>" />
    <title>State Kernel Demo - cede</title>
  </head>
  <body>
    <h1 id="helloWorldElement">Hello, world!</h1>
    <input type="text" id="helloWorldInput"></input>
    <h1 id="inputPreviewElement">Hello, world!</h1>
    <script type="module">

        import { State, Signal, DisposableSignalListener, DisposableSingleDirectionBinder, DisposableBidirectionalBinder } from 'cede';

      const state = new State('kernel-test');

      state.newValue('hello', 'Meow Meow!');
      state.newValue('jello', 'Squelch Jiggle!');

      const disposable1 = new DisposableSignalListener(state.get('hello'), console.log)
      const disposable2 = new DisposableSingleDirectionBinder(state.get('hello'), helloWorldElement);
      const disposable3 = new DisposableBidirectionalBinder(state.get('jello'), helloWorldInput);
      const disposable4 = new DisposableSingleDirectionBinder(state.get('jello'), inputPreviewElement);

    </script>
  </body>
</html>
```


## ✨ Features

* 🔑 **Signals** – reactive values with subscriptions, transformations, and disposables.
* 🗺 **State domains** – organize Signals in keyed Maps, prefixed by domain (e.g. `my-app:name1`).
* 💾 **Persistence** – automatically syncs to `localStorage` with revision tracking and conflict resolution.
* ↩️ **Undo / Redo** – all state operations can be rewound or replayed.
* 🔄 **Synchronization** – watches `localStorage` to keep multiple tabs in sync.
* 🛠 **Binders** – disposable helpers to bind signals directly to DOM elements.
* 🌱 **Framework-agnostic** – works anywhere: vanilla JS, custom elements, React, Vue, Svelte, etc.

---

## 🚀 Quick Start

```bash
npm install cede
```

```js
import { State, Signal } from "cede";

// Create a state domain
const state = new State("my-app");

// Add signals
state.set("name1", new Signal("Alice"));
state.set("name2", new Signal("Bob"));
state.set("color", new Signal("red"));

// Derived collections
state.set("users", new Signal(["name1", "name2"]));
state.set("admins", new Signal(["name1", "color"]));

// Subscribe to changes
state.get("color").subscribe((v) => {
  console.log("Color changed:", v);
});

// Update value
state.get("color").value = "blue";
```

---

## 🔗 Binding to the DOM

```js
import { DisposableSingleDirectionBinder, DisposableBidirectionalBinder } from "cede";

// One-way binding
const nameSignal = state.get("name1");
const el = document.querySelector("#displayName");
new DisposableSingleDirectionBinder(nameSignal, el);

// Two-way binding (input, textarea, select)
const inputEl = document.querySelector("#nameInput");
new DisposableBidirectionalBinder(nameSignal, inputEl);
```

---

## 🌀 Undo / Redo

```js
State.set("color", "green");
State.undo(); // restores previous color
State.redo(); // reapplies "green"
```

---

## 🧩 Why *cede*?

The name comes from “to yield, to give up control.”
With `cede`, you *cede* control of state bookkeeping, persistence, and synchronization to a simple, predictable kernel — while keeping your application logic clean.

---

## 📚 API Overview

* `Signal(value, config)` – reactive value with `.value`, `.subscribe()`, `.dispose()`
* `State(domain)` – keyed collection of Signals tied to a domain

  * `.newArray(name, ...)`
  * `.newObject(name, ...)`
  * `.newValue(name, value)`
  * `.splice(arrayName, ...)`
  * `.delete(...)`
  * `.set(name, value)`

* Disposables

  * `DisposableSingleDirectionBinder(signal, element)`
  * `DisposableBidirectionalBinder(signal, element)`
