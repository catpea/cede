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
