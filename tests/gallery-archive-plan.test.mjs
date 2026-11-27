import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFilename,summarizeEntries} from '../app/library/gallery/archive-plan.ts';
test('current actual upload bounds and routes',()=>{assert.equal(inspectFilename('card.ZIP',1).route,'digital');assert.equal(inspectFilename('card.PNG',1).route,'image');assert.equal(inspectFilename('readme.md',1).route,'digital');assert.ok(inspectFilename('draft.docx',1).reason);assert.ok(inspectFilename('large.png',12*1024**2+1).reason);assert.ok(inspectFilename('huge.zip',256*1024**2+1).reason);assert.ok(inspectFilename('../evil.zip',1).reason);assert.ok(inspectFilename('empty.txt',0).reason)});
test('exact duplicates only; blocked or unhashed files cannot count as unique',()=>{const e=(sha256,bytes,reason='')=>({sha256,bytes,reason});assert.deepEqual(summarizeEntries([e('x',20),e('x',20),e('y',10),e(null,30),e('z',40,'blocked')]),{bytes:120,uniqueBytes:30,duplicates:1,blocked:2,ready:2})});
