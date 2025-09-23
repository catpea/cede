import { Signal } from "./Signal.js";

class Path {
  static normalize(...a){
   // Combine base path and the provided path
    const combinedPath = a.join('/').split(/[/]+/).join('/');

    // Split the combined path into segments
    const segments = combinedPath.split('/');
    const stack = [];

    for (const segment of segments) {
        if (segment === '' || segment === '.') {
            // Ignore empty segments and current directory segments
            continue;
        } else if (segment === '..') {
            // Pop the last segment if it's not the root
            if (stack.length > 0) {
                stack.pop();
            }
        } else {
            // Push the current segment onto the stack
            stack.push(segment);
        }
    }

    // Join the stack back into a normalized path
    return '/' + stack.join('/');
  }

  static hasExtension(filePath) {
    const regex = /\.[a-z]+$/; // Regex to check for a dot followed by one or more lowercase letters at the end of the string
    return regex.test(filePath); // Returns true if the regex matches, false otherwise
  }
  getExtension(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }
}
export class CurrentWorkingDirectory {
  #tree;
  #basePath;
  #relativePath;

  constructor(tree, basePath) {
    this.#tree = tree;
    this.#basePath = basePath;
  }

  hasExtension(){
    return Path.hasExtension(this.#basePath);
  }
  isArray(){
    return Path.getExtension(this.#basePath) == 'arr';
  }
  isObject(){
    return Path.getExtension(this.#basePath) == 'obj'
  }

  get path(){
    return this.#basePath;
  }

  read(...a){
    return this.#tree.read(Path.normalize(this.#basePath, ...a))
  }

  entry(...a){
    const location = Path.normalize(this.#basePath, ...a);
    const response = this.#tree.read(location);
    return [location, response];
  }

  resolve(path){
   return Path.normalize(this.#basePath, relativePath);
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

export class DisposableManager {
  #disposables = new Set();
  dispose() {
    this.#disposables.forEach((disposable) => (disposable.dispose ? disposable.dispose() : disposable()));
    this.#disposables.clear();
  }
  addDisposable(...disposables) {
    disposables.flat(Infinity).forEach((d) => this.#disposables.add(d));
  }
}

export class DisposablesDispose {
  #disposables = new Map();
  constructor() {}

  add(disposable, key = "this") {
    if (typeof disposable?.dispose !== "function") throw new TypeError("This is for SomeDisposable.dispose() only.");
    if (!this.#disposables.has(key)) this.#disposables.set(key, new Set());
    this.#disposables.get(key).add(disposable);
  }
  has(key = "this") {
    const set = this.#disposables.get(key);
    return !!(set && set.size > 0);
  }
  dispose(key = "this") {
    const set = this.#disposables.get(key);
    if (!set || set.size === 0) return;
    const disposables = Array.from(set);
    set.clear();
    this.#disposables.delete(key);
    disposables.map((o) => o.dispose());
  }
}

export class DisposableSignalListener {
  #unsubscribe;

  constructor(signal, handler, options) {
    this.signal = signal;
    this.handler = handler;
    this.options = options;
    this.isDisposed = false;

    this.#unsubscribe = this.signal.subscribe(this.#listener.bind(this));
  }

  #listener(v) {
    this.handler(v);
  }

  dispose() {
    if (this.isDisposed) {
      console.warn("Event listener already disposed.");
      return;
    }
    this.#unsubscribe();
    this.isDisposed = true;
  }
}

export class DisposableSingleDirectionBinder {
  #unsubscribe;

  /**
   * @param {Signal} signal - the signal to observe
   * @param {HTMLElement} element - the element to bind to
   * @param {Object} [options]
   *   options.html = true → bind to innerHTML
   *   options.autorun = true (default) → initialize with current value
   */
  constructor(signal, element, options = {}) {
    this.signal = signal;
    this.element = element;
    this.options = Object.assign({ html: false, autorun: true }, options);
    this.isDisposed = false;

    this.#unsubscribe = this.signal.subscribe(this.#listener.bind(this), this.options.autorun);
  }

  #listener(value) {
    if (this.options.html) {
      this.element.innerHTML = value ?? "";
    } else {
      this.element.textContent = value ?? "";
    }
  }

  dispose() {
    if (this.isDisposed) {
      console.warn("Binder already disposed.");
      return;
    }
    this.#unsubscribe();
    this.isDisposed = true;
  }
}

export class DisposableBidirectionalBinder {
  #unsubscribe;
  #domListener;

  /**
   * @param {Signal} signal - the signal to sync
   * @param {HTMLElement} element - input/textarea/select or contentEditable
   * @param {Object} [options]
   *   options.autorun = true (default) → initialize from signal into element
   *   options.html = false → for contentEditable, bind innerHTML instead of textContent
   */
  constructor(signal, element, disposableManager, options = {}) {
    this.signal = signal;
    this.element = element;
    this.options = Object.assign({ autorun: true, html: false }, options);
    this.isDisposed = false;

    if (disposableManager) disposableManager.addDisposable(this);

    // Update DOM when signal changes
    this.#unsubscribe = this.signal.subscribe(this.#signalListener.bind(this), this.options.autorun);

    // Update signal when DOM changes
    this.#domListener = this.#domListenerFn.bind(this);
    this.#attachDomListener();
  }

  // Signal → DOM
  #signalListener(value) {
    if (this.element instanceof HTMLInputElement) {
      if (this.element.type === "checkbox") {
        this.element.checked = !!value;
      } else if (this.element.type === "radio") {
        this.element.checked = this.element.value === value;
      } else {
        this.element.value = value ?? "";
      }
    } else if (this.element instanceof HTMLTextAreaElement) {
      this.element.value = value ?? "";
    } else if (this.element instanceof HTMLSelectElement) {
      this.element.value = value ?? "";
    } else if (this.element.isContentEditable) {
      if (this.options.html) {
        this.element.innerHTML = value ?? "";
      } else {
        this.element.textContent = value ?? "";
      }
    }
  }

  // DOM → Signal
  #domListenerFn(event) {
    let newValue;
    if (this.element instanceof HTMLInputElement) {
      if (this.element.type === "checkbox") {
        newValue = this.element.checked;
      } else if (this.element.type === "radio") {
        if (this.element.checked) {
          newValue = this.element.value;
        } else {
          return; // skip if radio not checked
        }
      } else {
        newValue = this.element.value;
      }
    } else if (this.element instanceof HTMLTextAreaElement) {
      newValue = this.element.value;
    } else if (this.element instanceof HTMLSelectElement) {
      newValue = this.element.value;
    } else if (this.element.isContentEditable) {
      newValue = this.options.html ? this.element.innerHTML : this.element.textContent;
    }

    this.signal.value = newValue;
  }

  #attachDomListener() {
    if (this.element instanceof HTMLInputElement) {
      if (["text", "number", "password", "search", "email", "url"].includes(this.element.type)) {
        this.element.addEventListener("input", this.#domListener);
      } else if (this.element.type === "checkbox" || this.element.type === "radio") {
        this.element.addEventListener("change", this.#domListener);
      } else {
        this.element.addEventListener("input", this.#domListener);
      }
    } else if (this.element instanceof HTMLTextAreaElement || this.element instanceof HTMLSelectElement) {
      this.element.addEventListener("input", this.#domListener);
      this.element.addEventListener("change", this.#domListener);
    } else if (this.element.isContentEditable) {
      this.element.addEventListener("input", this.#domListener);
    }
  }

  #detachDomListener() {
    this.element.removeEventListener("input", this.#domListener);
    this.element.removeEventListener("change", this.#domListener);
  }

  dispose() {
    if (this.isDisposed) {
      console.warn("Binder already disposed.");
      return;
    }
    this.#unsubscribe();
    this.#detachDomListener();
    this.isDisposed = true;
  }
}

export class DisposableEventBinder {
  #domListener;
  /**
   * @param {HTMLElement} element - the element to bind to
   * @param {String} event - the event to minitor
   * @param {Function} domListener - the listener to execute
   * @param {Object} [options]
   *   options.html = true → bind to innerHTML
   *   options.autorun = true (default) → initialize with current value
   */
  constructor(element, event, domListener, options = {}) {
    this.element = element;
    this.event = event;
    this.#domListener = domListener;
    this.options = Object.assign({ html: false, autorun: true }, options);
    this.isDisposed = false;

    this.element.addEventListener(this.event, this.#domListener);
  }

  dispose() {
    if (this.isDisposed) {
      console.warn("Binder already disposed.");
      return;
    }
    this.element.removeEventListener(this.event, this.#domListener);

    this.isDisposed = true;
  }
}

export class TemplateManager {
  #id; //     <-- this is the star of this show, becasue we have a tree the signals we reference have a parent and that parent signal has a unique id and thus we can now easily check for a presence
  #disposableManager = new DisposableManager();

  #tree;

  #parent;
  #template;
  #cwd;
  #map;

  constructor(id, template, parent, cwd, map, rootDisposable) {
    this.#id = id;

    this.#parent = parent;
    this.#template = template;
    this.#cwd = cwd;
    this.#map = Array.isArray(map) ? Object.fromEntries(map.map((a) => [a, a])) : map;

    rootDisposable.addDisposable(this.#disposableManager);
    this.render();

  }

  upsert() {
      const existing = this.#parent.querySelector(`[data-identity="${this.#id}"]`);

      if (existing) {
          return existing; // Return the existing element if found
      } else {
          const cloned = this.#template.content.cloneNode(true);
          const container = document.createElement('div'); // Always wrap in a div
          container.appendChild(cloned);
          container.setAttribute('data-identity', this.#id);
          this.#parent.appendChild(container); // Append the container to the parent
          return container; // Return the newly created container
      }
  }

  render() {
    const element = this.upsert();
    const el = new ById(element);
    for (const [elementId, path] of Object.entries(this.#map)) {
      const disposable = new DisposableBidirectionalBinder(this.#cwd.read(path), el[elementId]);
      this.#disposableManager.addDisposable(disposable);
    }
  }


}



// const gradientCSS = StringBuilder(cwd, ['color', 'percent'], (color, percent)=> `${color} ${percent}%`, list=>`linear-gradient(90deg,${list.join(',')})`);

export class StringBuilder {
  #disposableManager = new DisposableManager();
  #responseSignal;

  #cwd;
  #locations;
  #map;

  constructor(cwd, locations, map){

    this.#cwd = cwd;
    this.#locations = locations;
    this.#map = map;

    this.compute();
  }

  dependencies(){

    if(Array.isArray(this.#cwd.read().value)){

      const locationArray = this.#cwd.read();
      const signals = [ locationArray ];

      for( const [index, location] of locationArray.value.entries()){
        const resolved = this.#locations.map( location=>this.#cwd.read(index, location) );
        signals.push(...resolved);
      }

      return signals;

    }else{

      const location = this.#cwd.read();
      const signals = [ location ];
      const resolved = this.#locations.map( location=>this.#cwd.read(index, location) );
      signals.push(...resolved);
      return signals;

    }
  }

  values(){
    if(Array.isArray(this.#cwd.read().value)){
      const locationArray = this.#cwd.read();
      const signals = [ ];
      for( const [index, location] of locationArray.value.entries()){
        const resolved = this.#locations.map( location=>this.#cwd.read(index, location) );
        signals.push( this.#map( ...resolved.map(signal=>signal.value ) ));
      }
      return signals;
    }else{
      const location = this.#cwd.read();
      const signals = [ ];
      const resolved = this.#locations.map( location=>this.#cwd.read(index, location) );
      signals.push( this.#map( ...resolved.map(signal=>signal.value ) ));
      return signals;
    }
  }

  compute() {


      const combined = Signal.combineLatest(...this.dependencies())
      const translated = Signal.map(combined, () => this.values()); // we substitute here, string builder uses a custom mapper as this is too much for our little Signal.map
      this.#responseSignal = translated;


  }

  subscribe(fn){
    return this.#responseSignal.subscribe(fn)
  }

  dispose(){
    return this.#responseSignal.dispose(); // this does go up the parent
  }

}
