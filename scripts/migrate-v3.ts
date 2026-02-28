import postgres from "postgres";
import { writeFileSync } from "fs";
import { execSync } from "child_process";

const cloud = postgres(process.env.DATABASE_URL!, { max: 1 });

const TABLES = [
  "users", "restaurants", "restaurant_stats", "assembly_members",
  "assembly_expenses", "visits", "point_transactions", "unlocks",
];

async function migrate() {
  for (const table of TABLES) {
    console.log(`📦 ${table}...`);
    const rows = await cloud`SELECT * FROM ${cloud(table)}`;
    console.log(`  클라우드: ${rows.length}행`);
    if (rows.length === 0) continue;

    // SQL 파일 생성
    const cols = Object.keys(rows[0]);
    let sql = `TRUNCATE "${table}" CASCADE;\n`;

    for (const row of rows) {
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "object" && !(v instanceof Date)) return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        if (v instanceof Date) return `'${v.toISOString()}'`;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(",")}) VALUES (${vals.join(",")});\n`;
    }

    writeFileSync("/tmp/migrate.sql", sql);
    execSync(`docker cp /tmp/migrate.sql supabase-db:/tmp/migrate.sql`);
    execSync(`docker exec supabase-db psql -U postgres -d postgres -f /tmp/migrate.sql`, { stdio: "pipe" });
    console.log(`  ✅ ${rows.length}행 완료`);
  }

  console.log("\n🎉 마이그레이션 완료!");
  await cloud.end();
}

migrate().catch(console.error);
