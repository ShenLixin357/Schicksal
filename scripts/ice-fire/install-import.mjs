import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export async function installImportedGames(staged, out, backup) {
  await mkdir(out, { recursive: true });
  await mkdir(backup, { recursive: true });
  const installed = [], previous = [];
  try {
    for (const name of await readdir(staged)) {
      const target = join(out, name);
      let exists = false;
      try { await stat(target); exists = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (exists) { await rename(target, join(backup, name)); previous.push(name); }
      await rename(join(staged, name), target);
      installed.push(name);
    }
  } catch (error) {
    for (const name of installed.reverse()) await rm(join(out, name), { recursive: true, force: true });
    for (const name of previous.reverse()) await rename(join(backup, name), join(out, name));
    throw error;
  }
}
