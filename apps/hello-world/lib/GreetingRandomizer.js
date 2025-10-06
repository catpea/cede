import { Lifecycle } from "cede";
import { fetchJson } from "utilities";

export class GreetingRandomizer extends Lifecycle {

  constructor({ id, interval, path, src }) {

    super({ id });
    this.interval = parseInt(interval);
    this.path = path;
    this.src = src;

  }

  async initialize() {

    this.reactiveTarget = this.root.tree.read(this.path);
    this.greetings = await fetchJson(this.src);

  }

  async start() {
    this.intervalId = setInterval(() => {
      const sourceMessageIndex = Math.floor(Math.random() * this.greetings.length);
      const targetMessageIndex = Math.floor(Math.random() * this.reactiveTarget.length);
      this.root.tree.write(`${this.path}/${sourceMessageIndex}/text`, this.greetings[targetMessageIndex].text);
    }, this.interval);
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    clearInterval(this.intervalId);
  }

  terminate() {
    this.stop();
    this.unsubscribe();
  }
}
