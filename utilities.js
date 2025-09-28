export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID && typeof crypto.randomUUID == "function") {
    return crypto.randomUUID();
  } else {
    return Math.random().toString(36).substring(2);
  }
}

export function moveNodeToIndex(node, newIndex) {
    const parent = node.parentNode;

    if (!parent) {
        console.error('Node has no parent');
        return;
    }

    const children = Array.from(parent.children);
    const currentIndex = children.indexOf(node);

    if (currentIndex === -1) {
        console.error('Node not found in parent children');
        return;
    }

    // If already at the target index, no need to move
    if (currentIndex === newIndex) {
        return;
    }

    // Validate new index
    if (newIndex < 0 || newIndex >= children.length) {
        console.error('Index out of bounds');
        return;
    }

    // Remove the node from DOM
    parent.removeChild(node);

    // Get fresh reference to children after removal
    const updatedChildren = Array.from(parent.children);

    // Calculate the correct insertion point
    let insertIndex = newIndex;
    if (currentIndex < newIndex) {
        // If moving forward, adjust index since we removed an element before it
        insertIndex = newIndex - 1;
    }

    // Insert at the new position
    if (insertIndex >= updatedChildren.length) {
        // Append to end
        parent.appendChild(node);
    } else {
        // Insert before the element at insertIndex
        parent.insertBefore(node, updatedChildren[insertIndex]);
    }
}

export class ById {
  constructor(elementContext) {
    return new Proxy(this, {
      get(target, propertyName) {
        // Handle string property names only (ignore symbols and other types)
        if (typeof propertyName !== "string") {
          return target[propertyName];
        }
        // Perform querySelector with the property name as ID
        return elementContext.querySelector(`#${propertyName}`);
      },
    });
  }
}



export function visualiseReactiveTree(containerElement, reactiveObject) {
  const className = 'vrt';
  const subscriptions = new Set();
  // Clear the container
  containerElement.innerHTML = "";

  // Create the root UL element
  const rootUl = document.createElement("ul");
  rootUl.classList.add(className);

  containerElement.appendChild(rootUl);

  const style = document.createElement("style");
  style.textContent = `
    .${className} {
      sup { opacity: .25;}
      var { color: blue}
      data { color: red}
    }
  `;

  containerElement.appendChild(style);

  // Recursive function to build tree nodes

  function buildTreeNode(reactiveObject, parentUl) {
    // Get the actual value if it's a signal
    const value = reactiveObject && typeof reactiveObject === "object" && "value" in reactiveObject ? reactiveObject.value : reactiveObject;

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

      const data = document.createElement("data");
      data.setAttribute('value', String(value));
      data.textContent = `${String(value)}`;
      li.appendChild(data);

      const sup = document.createElement("sup");
      sup.textContent = ` (typeof ${typeof value})`;
      li.appendChild(sup);


        // li.textContent = `${typeof v}: ${String(v)}`;

      parentUl.appendChild(li);
      return;
    }

    // Handle arrays
    console.log('AAA', Array.isArray(value), value, value.length)
    if (Array.isArray(value)) {
      const li = document.createElement("li");
      li.textContent = `Array[${value.length}]`;
      parentUl.appendChild(li);

      if (value.length > 0) {
        const nestedUl = document.createElement("ul");
        li.appendChild(nestedUl);

        value.forEach((item, index) => {
          const indexLi = document.createElement("li");
          indexLi.textContent = `[index #${index}]`;
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

    if(keys.length){
      // li.textContent = `Object (${keys.length} ${keys.length == 1 ? "property" : "properties"}: ${keys.join(', ')})`;
      li.textContent = `Object`;
    }else{
      li.textContent = `Object without properties`;
    }
    parentUl.appendChild(li);

    if (keys.length > 0) {
      const nestedUl = document.createElement("ul");
      li.appendChild(nestedUl);

      keys.forEach((key, index) => {
        const keyLi = document.createElement("li");
        keyLi.classList.add('key');
        keyLi.textContent = `.${key}`;
        nestedUl.appendChild(keyLi);

        const keyUl = document.createElement("ul");
        keyLi.appendChild(keyUl);
        buildTreeNode(value[key], keyUl);
      });
    }
  }

  // Start building the tree
  buildTreeNode(reactiveObject, rootUl);
  return { dispose: () => subscriptions.forEach((bye) => bye()) };
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
