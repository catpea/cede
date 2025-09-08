# cede
The Practical Operating Substrate for Apps

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚔️</text></svg>" />
    <title>State Kernel Demo</title>
  </head>
  <body>
    <h1 id="helloWorldElement">Hello, world!</h1>
    <input type="text" id="helloWorldInput"></input>
    <script type="module">

      import { State } from './State.js';
      import { DisposableSignalListener, DisposableSingleDirectionBinder, DisposableBidirectionalBinder } from './Disposables.js';

      const state = new State('kernel-test');

      state.newValue('hello', 'Meow Meow!');
      state.newValue('jello', 'Squelch Jiggle!');

      const disposable1 = new DisposableSignalListener(state.get('hello'), console.log)
      const disposable2 = new DisposableSingleDirectionBinder(state.get('hello'), helloWorldElement);
      const disposable3 = new DisposableBidirectionalBinder(state.get('jello'), helloWorldInput);

    </script>
  </body>
</html>

```
