import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync, strToU8 } from "../public/games/insaniquarium/vendor/fflate.mjs";
import { prepareZip } from "../public/games/insaniquarium/zip-import.mjs";

const blob = bytes => new Blob([bytes]);
const resources = {
  "Insaniquarium/properties/resources.xml": strToU8("<ResourceManifest/>"),
  "Insaniquarium/images/Fish.gif": new Uint8Array([0, 1, 128, 255]),
  "Insaniquarium/sounds/buttonclick.au": new Uint8Array([46, 115, 110, 100]),
};

test("stored and compressed ZIPs preserve original bytes and skip executables, userdata and traversal", async () => {
  for (const level of [0, 6]) {
    const files = await prepareZip(blob(zipSync({ ...resources,
      "Insaniquarium/Insaniquarium.exe": strToU8("unused"),
      "Insaniquarium/userdata/users.dat": strToU8("unused"),
      "../images/outside.gif": strToU8("unused"),
    }, { level })));
    assert.equal(files.length, 3);
    for (const file of files) assert.deepEqual(file.bytes, resources[`Insaniquarium/${file.path}`]);
  }
});

test("invalid, incomplete and oversized ZIPs fail before starting the engine", async () => {
  await assert.rejects(prepareZip(blob(strToU8("not a zip"))), /无法读取/);
  await assert.rejects(prepareZip(blob(zipSync({"images/fish.gif": new Uint8Array(2)}))), /resources.xml/);
  await assert.rejects(prepareZip({ size: 129 * 1024 * 1024, arrayBuffer() { throw Error("must not read"); } }), /过大/);
  await assert.rejects(prepareZip(blob(zipSync({ ...resources, "other/IMAGES/fish.GIF": new Uint8Array(2) }))), /重复/);
  const bytes = zipSync(resources), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i=0; i < bytes.length - 46; i++) {
    if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i+24, 64 * 1024 * 1024 + 1, true); break; }
  }
  await assert.rejects(prepareZip(blob(bytes)), /资源过大/);
});
