import { Signal } from "./Signal.js";
import { State } from "./State.js";

import { TreeWalker } from "./TreeWalker.js";
import { TreeNavigator } from "./TreeNavigator.js";
import { TreeGenerator } from "./TreeGenerator.js";

export class Tree {
  #domain;
  #state;
  #data = {};

  constructor(domain, debug = false) {
    this.#domain = domain;
    this.#state = new State(domain);
    this.treeGenerator = new TreeGenerator(this.#data, this.#state, { debug });
    this.treeNavigator = new TreeNavigator(this.#data, { debug });
  }

  clear(){
    this.#state.clear();
    this.data = {};
  }

  mk(path, data = null) {
    return this.treeGenerator.write(path, data.key?this.signalize(data):data);
  }

  read(path) {
    return this.treeNavigator.read(path);
  }

  write(path, value) {

    const node = this.treeNavigator.read(path);
    if (!node) throw new Error(`Path not found. Create the path with mk prior to use. (${path})`);

    if (node.signal instanceof Signal) {
      node.signal.value = value;
    } else {
      node.value = value;
    }
    return node.signal;
  }

  ext(path) {
    return path.match(/[.]([\w\d]+)$/)?.[1] || "";
  }

  signalize(key, data){

    if( key === null || key === undefined ) throw new Error(` Key must not be undefined. Received "${key}"`);
    if( !data ) throw new Error(`Data is required. Received "${data}"`);


    let signalValue;

    for ( const [propertyName, propertyValue] of Object.entries(data) ){

      if(this.isPrimitive(propertyValue)){
        signalValue = propertyValue;
      } else if(Array.isArray(propertyValue)){
        // {key:signalKey, val:signalValue}
        signalValue = [];
        for( const element of propertyValue){
          signalValue.push(signalize(element.key, element.val))
        }
      }else{ // isObject
        signalValue = {};
        for( const property of propertyValue){
          signalValue[property] = signalize(property.key, property.val);
        }

      }
    }

    const [ name, domain ] = key.split(/--/);
    const signal = new Signal(signalValue, {name, domain, persistence: true, synchronization: true});
    return signal;
  }

  designalize() {
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if(this.isFile(node)) return this.objectify( node.signal );
      // if(this.isFile(node)) return JSON.stringify( node.signal ,null, 2);

      // if (key === 'signal' && node && typeof node.toJSON === 'function') return JSON.stringify(node,null,2);

    };
    return walker.walk( this.#data );
  }

  objectify( signal ){

    return  signal.toJSON() ;

    console.log('objectify', signal)
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      console.log('>>>', key, node)

      if (node.toJSON) return node.toJSON();
    };
    return walker.walk(  signal.toJSON() );
  }

  flatten() {
    const flattened = [];
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {

      if(this.hasExtension(key)) flattened.push(['mk', path.join('/'), node])
      // if(this.isPrimitive(node)) flattened.push(['mk', path.join('/'), node])

    };

    walker.walk( this.designalize() );
    return flattened;
  }

  toJSON() {
    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {
      if (node.ext) return { id: node.id, signal: node.signal };
    };
    return walker.walk( this.#data );
  }
  stringify() {
    return JSON.stringify(this, null, 2);
  }

  save() {
    const content = this.stringify();
    localStorage.setItem(this.#domain, content);
    return content;
  }

  hydrated() {
    const dehydrated = localStorage.getItem(this.#domain);
    console.log('dehydrated:', dehydrated);
    if (dehydrated !== null) return JSON.parse(dehydrated);
  }

  load(data) {
    if (!data) data = this.hydrated();

    const walker = new TreeWalker();
    walker.visitor = (key, node, parent, path) => {

      if (node && typeof node === "object" && "id" in node) {
        // Return replacement - this replaces the ENTIRE node
        return {
          id: node.id,
          // replacedAt: new Date().toISOString(),
          // originalPath: path.join("/"),
          ext: this.ext(key),
          // TODO use __signal based on dat in )))signal create a nested signal object
          signal: this.#state.get(node.id),
        };
      }
      return undefined;
    };
    this.#data = walker.walk(data);
  }

  dump() {
    console.log(this.#data);
  }
  isFile(node){
    return (node && node.ext && node.signal && typeof node.signal.toJSON === 'function')
  }
  hasExtension(key) {
    return key.endsWith(".arr") || key.endsWith(".obj");
  }
  isPrimitive(value) {
      return (
          value === null || // Check for null
          typeof value !== 'object' && typeof value !== 'function' // Check for non-object and non-function types
      );
  }
  #uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID == "function") {
      return crypto.randomUUID();
    } else {
      return Math.random().toString(36).substr(2);
    }
  }
}
