import { db } from "../src/db/index";
import { restaurants, restaurantStats, visits, users } from "../src/db/schema";
import { eq, sql, ne } from "drizzle-orm";

async function main() {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  const userId = user.id;

  // 아직 유저 인증 안 된 식당 50개
  const targets = await db
    .select({ id: restaurants.id, name: restaurants.name })
    .from(restaurants)
    .innerJoin(restaurantStats, eq(restaurants.id, restaurantStats.restaurantId))
    .where(eq(restaurantStats.userVisits, 0))
    .limit(50);

  const patterns = [
    12, 10, 15, 8, 7, 6, 5, 11, 9, 4,
    3, 2, 6, 13, 5, 7, 3, 8, 2, 4,
    10, 6, 3, 5, 9, 2, 7, 11, 4, 14,
    3, 5, 2, 8, 6, 10, 4, 7, 3, 2,
    5, 9, 12, 6, 3, 8, 2, 4, 7, 11,
  ];

  let done = 0;
  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const count = patterns[i % patterns.length];

    for (let j = 0; j < count; j++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - j));
      await db.insert(visits).values({
        userId,
        restaurantId: r.id,
        receiptImage: "dummy",
        ocrRaw: { text: "더미" },
        ocrStatus: "verified",
        pointsEarned: j === 0 ? 10 : 5,
        createdAt: date,
      });
    }

    await db.update(restaurantStats)
      .set({
        userVisits: count,
        totalVisits: sql`${restaurantStats.publicVisits} + ${count}`,
      })
      .where(eq(restaurantStats.restaurantId, r.id));

    done++;
  }

  console.log(`✅ ${done}개 식당에 더미 인증 완료!`);
  process.exit(0);
}
main();
