class BaseComponent {
  static get prefix() {
    return "mlue"; // Global prefix for all components
  }
}

class OffcanvasComponent extends HTMLElement {
  // Specify observed attributes so that
  // attributeChangedCallback will work
  static get observedAttributes() {
    return ["color", "size"];
  }

  constructor() {
    // Always call super first in constructor
    super();

    const shadow = this.attachShadow({ mode: "open" });

    const div = document.createElement("div");
    const style = document.createElement("style");
    shadow.appendChild(style);
    shadow.appendChild(div);
  }

  connectedCallback() {
    console.log("Custom square element added to page.");
    updateStyle(this);
  }

  disconnectedCallback() {
    console.log("Custom square element removed from page.");
  }

  adoptedCallback() {
    console.log("Custom square element moved to new page.");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log("Custom square element attributes changed.");
    updateStyle(this);
  }
}

customElements.define(`${BaseComponent.prefix}-offcanvas`, OffcanvasComponent);
