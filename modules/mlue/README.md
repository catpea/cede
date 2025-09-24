# mlue
 Reactive Programming With Style

```JavaScript

import { Revision, Watcher, } from 'mlue';
import { combineLatest } from 'mlue/signals.js';

export default class Rectangle {
  constructor(width, height) {
    this.rev = new Revision();
    this.width = width;
    this.height = height;
    return Watcher.watch(this, ['width', 'height', 'resizeBy'], member=> this.rev.inc() ); // Each time 'width', 'height', or 'resizeBy' is invoked execute the function (third argument)
  }
  resizeBy(scaleFactor){
    this.width = this.width * scaleFactor;
    this.height = this.height * scaleFactor;
  }

  getArea() { // Instance method
    return this.width * this.height;
  }

  static compareArea(rect1, rect2) { // Static method
    return rect1.getArea() - rect2.getArea();
  }

}

// Setup
let rect1 = new Rectangle(5, 8);
let rect2 = new Rectangle(6, 7);

// Prints Once
console.log('PLAIN', Rectangle.compareArea(rect1, rect2)); // -2

// Revision is a separate Signal based system
const unsubscribeFn = combineLatest(rect1.rev, rect2.rev) // watching revisions for change
.subscribe(   ()=>console.log('REACTIVE:', Rectangle.compareArea(rect1, rect2))   ) // subscribing, and on initialize and change printing

rect1.height = 77; // triggers, because of Watcher
rect1.rev.inc(); // triggers because of Revision

```
