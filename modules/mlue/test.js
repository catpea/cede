import { test, describe } from 'node:test';
import assert from 'node:assert';

import Rectangle from '#Rectangle';
import { Revision, Watcher } from './index.js';

describe('Rectangle Revision and Watcher and Tests', () => {

  test('increment revision once starting at 5', () => {
    const rev = new Revision(null, 5);
    rev.inc();

    // We Manually Flush
    rev.flush();
    const [revision, uuid] = rev.value;
    assert.strictEqual( revision, 6, 'Started at 5 incremented once, flushed should be 6');
  });
  test('increment revision many times, but it should run only once as it is batched', () => {
    const rect1 = new Rectangle(1, 1);
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();
    rect1.rev.inc();

    // We Manually Flush
    rect1.rev.flush();
    const [rev, uuid] = rect1.rev.value;
    assert.strictEqual( rev, 1, 'Incremented 10 times, but it should be 1, initial run to set the object to 0, and one inc() batched!.');
  });

  test('test watcher, change width, run once', () => {
    const rect2 = new Rectangle(2, 2);
    rect2.height = 3;
    rect2.width = 3;

    // We Manually Flush
    rect2.rev.flush();
    const [rev, uuid] = rect2.rev.value;
    assert.strictEqual( rev, 1, 'changed 2 values, but rev should be 1');
  });

  test('test watcher, scale the values via method and expect revision bump', () => {
    const rect3 = new Rectangle(2, 2);
    rect3.resizeBy(2); // Resize by a factor of 2

    // We Manually Flush
    rect3.rev.flush();
    const [rev, uuid] = rect3.rev.value;
    assert.strictEqual( rect3.width, 4, 'It should be scaled by a factor of 2');
    assert.strictEqual( rev, 1, 'called method rev should be 1');
  });

  test('test watcher, read a value, expect no revision changes from reading', () => {
    const rect4 = new Rectangle(2, 2);
    assert.strictEqual( rect4.width, 2, 'It should be 2');

    // We Manually Flush
    rect4.rev.flush();
    const [rev, uuid] = rect4.rev.value;
    assert.strictEqual( rev, 0, 'called method rev should be 1');
  });


});
