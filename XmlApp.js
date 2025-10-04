// XmlApp.js - Lifecycle orchestration through XML
const components = new Map();

class State {
  #current = null;
  #resolvers = new Map();
  #promises = new Map();

  constructor(config = {}) {
    const states = config.states || [
      'connected', 'loading', 'interactive', 'complete'
    ];

    // Create promise and resolver for each state
    states.forEach(state => {
      let resolver;
      const promise = new Promise(resolve => { resolver = resolve; });
      this.#promises.set(state, promise);
      this.#resolvers.set(state, resolver);

      // Define state as a property that returns its promise
      Object.defineProperty(this, state, {
        get: () => this.#promises.get(state),
        enumerable: true
      });
    });

    // Set initial state if provided
    if (config.initial) {
      this.transition(config.initial);
    }
  }

  transition(state) {
    if (!this.#resolvers.has(state)) {
      throw new Error(`Unknown state: ${state}`);
    }

    this.#current = state;
    this.#resolvers.get(state)?.(state);

    return this;
  }

  get current() {
    return this.#current;
  }
}


export class XmlApp extends HTMLElement {

  #root;
  #xmlDoc;

  state = new State({
    states: ['idle', 'connected', 'loading', 'interactive', 'complete'],
    initial: 'idle'
  });

  static registerLifecycle(componentName, componentClass) {
    components.set(componentName, componentClass);
  }

  async connectedCallback() {
    this.state.transition('connected');
    const src = this.getAttribute('src');
    if (!src) {
      throw new Error('XmlApp requires a "src" attribute');
    }

    this.state.transition('loading');
    await this.loadAndParse(src);

    this.state.transition('interactive');
    await this.orchestrate();

    this.state.transition('complete');
  }

  async loadAndParse(src) {
    const response = await fetch(src);
    const xmlText = await response.text();
    const parser = new DOMParser();
    this.#xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parse errors
    const parserError = this.#xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML Parse Error: ${parserError.textContent}`);
    }
  }

  async orchestrate() {
    const rootElement = this.#xmlDoc.documentElement;

    // Create the root lifecycle based on the root XML element
    this.#root = await this.createLifecycle(rootElement, null);

    // Initialize and start the entire tree
    await this.#root.initializeAll();
    if (this.#root.startAll) {
      await this.#root.startAll();
    }
  }

  async createLifecycle(xmlElement, parent) {
    const tagName = xmlElement.tagName;
    const LifecycleClass = components.get(tagName);

    if (!LifecycleClass) {
      throw new Error(`No lifecycle registered for component: ${tagName}`);
    }

    // Extract attributes as options
    const options = { id: this.id || 'root' };
    for (const attr of xmlElement.attributes) {
      options[attr.name] = attr.value;
    }

    // Create lifecycle instance
    const lifecycle = new LifecycleClass(options);

    // Add to parent if exists
    if (parent) {
      parent.addChild(lifecycle);
    }

    // Recursively create children
    for (const childElement of xmlElement.children) {
      await this.createLifecycle(childElement, lifecycle);
    }

    return lifecycle;
  }

  get root() {
    return this.#root;
  }

  async terminateAll() {
    if (this.#root) {
      await this.#root.terminateAll();
    }
  }
}

// Register the custom element
customElements.define('xml-app', XmlApp);
