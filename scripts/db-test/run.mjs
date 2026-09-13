import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "..", "supabase", "migrations");

export async function freshDb() {
  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(here, "shim.sql"), "utf8"));
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    try {
      await db.exec(sql);
    } catch (e) {
      const pos = Number(e.position);
      const context = pos ? sql.slice(Math.max(0, pos - 200), pos + 100) : "";
      console.error(`\nFAILED in ${file}: ${e.message}\n--- near ---\n${context}\n`);
      process.exit(1);
    }
    console.log(`applied ${file}`);
  }
  return db;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await freshDb();
  console.log("all migrations applied");
}
