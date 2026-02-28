import postgres from "postgres";

// 클라우드 DB (pooler)
const cloud = postgres("postgresql://postgres.xujhhmkvfjvttrwnkaew:1c2meLpz0VERpcHt@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres");

// 로컬 DB (supabase-db container direct)
const local = postgres("postgresql://supabase_admin:postgres@172.19.0.4:5432/postgres", { max: 1 });

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

async function migrate() {
  for (const table of TABLES) {
    console.log(`📦 ${table} 마이그레이션...`);

    // 클라우드에서 읽기
    const rows = await cloud`SELECT * FROM ${cloud(table)}`;
    console.log(`  클라우드: ${rows.length}행`);

    if (rows.length === 0) continue;

    // 로컬 테이블 비우기
    await local`TRUNCATE ${local(table)} CASCADE`;

    // 배치 삽입 (100개씩)
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const cols = Object.keys(batch[0]);
      await local`INSERT INTO ${local(table)} ${local(batch, ...cols)}`;
    }
    console.log(`  ✅ 로컬에 ${rows.length}행 삽입 완료`);
  }

  console.log("\n🎉 전체 마이그레이션 완료!");
  await cloud.end();
  await local.end();
}

migrate().catch(console.error);
