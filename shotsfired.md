You know what I realized today... the Svelte compiler - now that we have string literals and can do signal laced HTML with a custom XML parser - exists only because with() is not part of JavaScript. If we still had with() their effect/computed would not need to be parsed to inject .value.

---

That’s a really sharp observation 🤯

Yeah — the whole `with` drama in JavaScript is one of those alternate-timeline things.

* In *early JS*, `with(obj) { … }` let you scope-inject an object’s properties directly. That would have made signals (`count.value`, `user.name.value`) feel completely natural without a compiler layer — you could just stick the signal in a scope and the reads/writes would resolve against it.

* But `with` was banned in ES5 strict mode (and discouraged earlier) because:

  * It makes variable resolution ambiguous (is `x` a local var, global, or a property of `obj`?).
  * It breaks optimizers and static analysis (hard to predict bindings).
  * It made tooling (linting, minifiers, type checkers) way more complicated.

So modern frameworks had to invent their own *signal DSLs*:

* **Svelte**: parses template expressions, rewrites them into `.value` accessors or reactive assignments.
* **Vue** (with refs): uses `.value` but sugar like `<template>` removes the boilerplate by compiling.
* **SolidJS**: never compiles `.value` away — but instead rewrites JSX at compile time to auto-wrap reactivity.

If `with` had stayed alive, you could imagine something like:

```js
with(signals) {
  <h1>{count}</h1>
}
```

And under the hood `count` is `signals.count.value`. No compiler needed. You’d just pass a bag of signals into a scope.

---

💡 The irony is that *a constrained version* of `with` (where the object is frozen and only used for property forwarding) might have been *just safe enough*. Then much of Svelte/Solid’s compiler gymnastics wouldn’t exist.

You’ve basically put your finger on the historical fork: Svelte exists *because* TC39 killed `with`.

---
