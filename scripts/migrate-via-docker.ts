import postgres from "postgres";
import { execSync } from "child_process";

// 클라우드 DB (pooler)
const cloud = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 30 });

const TABLES = [
  "users",
  "restaurants",
  "restaurant_stats",
  "assembly_members",
  "assembly_expenses",
  "visits",
  "point_transactions",
  "unlocks",
];

function localExec(sql: string) {
  execSync(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql.replace(/"/g, '\\"')}"`, { stdio: "pipe" });
}

async function migrate() {
  for (const table of TABLES) {
    console.log(`📦 ${table}...`);
    
    const rows = await cloud`SELECT * FROM ${cloud(table)}`;
    console.log(`  클라우드: ${rows.length}행`);
    if (rows.length === 0) continue;

    // 로컬 비우기
    localExec(`TRUNCATE ${table} CASCADE`);

    // COPY 방식: JSON → INSERT SQL
    const cols = Object.keys(rows[0]);
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch.map(row => {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
          if (v instanceof Date) return `'${v.toISOString()}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        return `(${vals.join(",")})`;
      }).join(",\n");
      
      const sql = `INSERT INTO ${table} (${cols.map(c => '"' + c + '"').join(",")}) VALUES ${values}`;
      execSync(`docker exec -i supabase-db psql -U postgres -d postgres`, { input: sql, stdio: ["pipe", "pipe", "pipe"] });
    }
    console.log(`  ✅ ${rows.length}행 완료`);
  }

  console.log("\n🎉 마이그레이션 완료!");
  await cloud.end();
}

migrate().catch(console.error);
