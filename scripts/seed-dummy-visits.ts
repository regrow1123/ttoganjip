import { db } from "../src/db/index";
import { restaurants, restaurantStats, visits, users, pointTransactions } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  const userId = user.id;
  console.log("유저:", userId);

  // 다양한 등급 테스트용 식당 선택
  const targets = await db
    .select({ id: restaurants.id, name: restaurants.name, source: restaurants.source })
    .from(restaurants)
    .limit(20);

  // 등급별 인증 횟수: 또간집(2~4), 단골집(5~9), 찐맛집(10+)
  const visitCounts = [
    { idx: 0, count: 12 }, // 찐맛집
    { idx: 1, count: 11 }, // 찐맛집
    { idx: 2, count: 7 },  // 단골집
    { idx: 3, count: 6 },  // 단골집
    { idx: 4, count: 5 },  // 단골집
    { idx: 5, count: 3 },  // 또간집
    { idx: 6, count: 2 },  // 또간집
    { idx: 7, count: 4 },  // 또간집
    { idx: 8, count: 1 },  // 등급 없음
    { idx: 9, count: 8 },  // 단골집
  ];

  for (const { idx, count } of visitCounts) {
    const r = targets[idx];
    if (!r) continue;

    // visits 레코드 삽입
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - i)); // 날짜 분산
      await db.insert(visits).values({
        userId,
        restaurantId: r.id,
        receiptImage: "dummy-test",
        ocrRaw: { text: "더미 테스트" },
        ocrStatus: "verified",
        pointsEarned: i === 0 ? 10 : 5,
        createdAt: date,
      });
    }

    // stats 업데이트
    await db.update(restaurantStats)
      .set({
        userVisits: count,
        totalVisits: sql`${restaurantStats.publicVisits} + ${count}`,
      })
      .where(eq(restaurantStats.restaurantId, r.id));

    console.log(`✅ ${r.name} (${r.source}) → 유저 인증 ${count}회`);
  }

  console.log("\n🎉 더미 인증 데이터 삽입 완료!");
  process.exit(0);
}
main();
