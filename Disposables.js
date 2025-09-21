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
  constructor(signal, element, options = {}) {
    this.signal = signal;
    this.element = element;
    this.options = Object.assign({ autorun: true, html: false }, options);
    this.isDisposed = false;

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
