import Revision from '#Revision';
import Watcher from '#Watcher';

export default class Rectangle {

  constructor(width, height) {
    this.rev = new Revision();
    this.width = width;
    this.height = height;

    // Each time 'width', 'height', or 'resizeBy' is invoked execute the function (third argument)
    return Watcher.watch(this, ['width', 'height', 'resizeBy'], member=>{
      console.log(`[Watcher] ${member} was accessed/modified`);
      this.rev.inc();
    });
  }

  resizeBy(scaleFactor){
    this.width = this.width * scaleFactor;
    this.height = this.height * scaleFactor;
  }

  // Instance method
  getArea() {
    return this.width * this.height;
  }

  // Static method
  static compareArea(rect1, rect2) {
    return rect1.getArea() - rect2.getArea();
  }

}
