export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID && typeof crypto.randomUUID == "function") {
    return crypto.randomUUID();
  } else {
    return Math.random().toString(36).substring(2);
  }
}

export function visualiseSignalTree(containerElement, signalData) {
  const subscriptions = new Set();
  // Clear the container
  containerElement.innerHTML = "";

  // Create the root UL element
  const rootUl = document.createElement("ul");
  containerElement.appendChild(rootUl);

  // Recursive function to build tree nodes

  function buildTreeNode(signalObject, parentUl) {
    // Get the actual value if it's a signal
    const value = signalObject && typeof signalObject === "object" && "value" in signalObject ? signalObject.value : signalObject;

    if (value === null || value === undefined) {
      const li = document.createElement("li");
      // li.textContent = String(value);
      li.textContent = `${typeof value}: ${String(value)}`;
      parentUl.appendChild(li);
      return;
    }

    // Handle primitives (string, number, boolean)
    if (typeof value !== "object") {
      const li = document.createElement("li");
      li.textContent = `${typeof value}: ${String(value)}`;
      signalObject.subscribe((v) => {
        li.textContent = `${typeof v}: ${String(v)}`;
      });
      parentUl.appendChild(li);
      return;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const li = document.createElement("li");
      li.textContent = `Array[${value.length}]`;
      parentUl.appendChild(li);

      if (value.length > 0) {
        const nestedUl = document.createElement("ul");
        li.appendChild(nestedUl);

        value.forEach((item, index) => {
          const indexLi = document.createElement("li");
          indexLi.textContent = `[${index}]`;
          nestedUl.appendChild(indexLi);

          const indexUl = document.createElement("ul");
          indexLi.appendChild(indexUl);
          console.log("###$$$", item);
          buildTreeNode(item, indexUl);
        });
      }
      return;
    }

    // Handle objects
    const keys = Object.keys(value);
    const li = document.createElement("li");
    li.textContent = `Object (${keys.length} ${keys.length == 1 ? "property" : "properties"})`;
    parentUl.appendChild(li);

    if (keys.length > 0) {
      const nestedUl = document.createElement("ul");
      li.appendChild(nestedUl);

      keys.forEach((key, index) => {
        const keyLi = document.createElement("li");
        keyLi.textContent = `property ${index}: ${key}`;
        nestedUl.appendChild(keyLi);

        const keyUl = document.createElement("ul");
        keyLi.appendChild(keyUl);
        buildTreeNode(value[key], keyUl);
      });
    }
  }

  // Start building the tree
  buildTreeNode(signalData, rootUl);
  return { dispose: () => subscriptions.forEach((bye) => bye()) };
}

export async function download(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Network response was not ok: " + response.statusText);
    }
    return await response.json();
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}








// Watcher Upgrade
// 1: fn, should become before, and we need to add after support
// 2: cosument which functions change objects and which change arrays createting Object and Array example

// class ReactiveArray extends Array {
//   constructor(...a) {
//     super(...a);

//     const members = [

//       // String members
//       'push', 'pop', 'shift', 'unshift', 'splice', 'sort',

//       // RegExp for numeric indexes
//       /^\d+$/,

//       // Object with string name and callback function
//       {
//         name: 'reverse',
//         before: () => console.log('Before-callback: reverse is being called')
//       },

//       // Object with function name checker
//       {
//         name: (prop) => prop === 'length',
//         after: () => console.log('After-callback: length was being modified')
//       },

//       {
//         name: (prop) => [ 'push', 'pop', 'shift', 'unshift', 'splice', 'sort'].includes(prop),
//         after: () => console.log('After-callback: array has likely been modified')
//       },

//       // Object with RegExp name
//       {
//         name: /^custom/,
//         after: () => console.log('after-callback: custom method about to be called')
//       }
//     ];

//     return Watcher.watch(this, members, member => {
//       console.log(`[Watcher] ${member} was accessed/modified`);
//       // Announce changes in your own way
//     });
//   } // constructor


// }
// const signalWrapper = new Signal()

// const reactiveArray = new ReactiveArray()
