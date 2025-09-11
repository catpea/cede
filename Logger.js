export class Logger {

  constructor(enabled){
    this.enabled = enabled ?? false;
  }

  log(...a){
    if(this.enabled) console.log(...a);
  }

  warn(...a){
    if(this.enabled) console.warn(...a);
  }

  group(...a){
    if(this.enabled) console.group(...a);
  }

  groupEnd(...a){
    if(this.enabled) console.groupEnd(...a);
  }

}
