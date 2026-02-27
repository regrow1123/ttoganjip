import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  smallint,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 100 }),
  image: text("image"),
  provider: varchar("provider", { length: 20 }).notNull(), // 'google' | 'kakao'
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  points: integer("points").default(30).notNull(), // 가입 보너스 30P
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Restaurants ─────────────────────────────────────
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  category: varchar("category", { length: 50 }), // korean, chinese, japanese, western, cafe, bar, etc.
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  placeId: varchar("place_id", { length: 100 }), // 외부 지도 API 장소 ID
  region: varchar("region", { length: 100 }), // 대략적 지역명 (잠금 상태 힌트)
  source: varchar("source", { length: 30 }).default("user").notNull(), // 'user' | 'assembly' | 'seoul_expense'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Visits (방문 인증) ──────────────────────────────
export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }).notNull(),
  receiptImage: text("receipt_image").notNull(), // Supabase Storage URL
  receiptDate: date("receipt_date"),
  receiptAmount: integer("receipt_amount"),
  ocrRaw: jsonb("ocr_raw"), // OCR 원본 결과
  ocrStatus: varchar("ocr_status", { length: 20 }).default("pending").notNull(), // pending / verified / rejected
  imageHash: varchar("image_hash", { length: 64 }), // perceptual hash (중복 방지)
  pointsEarned: integer("points_earned").default(0).notNull(),
  visitNumber: integer("visit_number").default(1).notNull(), // N번째 방문
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Restaurant Stats (재방문 통계 캐시) ─────────────
export const restaurantStats = pgTable("restaurant_stats", {
  restaurantId: uuid("restaurant_id").primaryKey().references(() => restaurants.id),
  totalVisits: integer("total_visits").default(0).notNull(),
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  revisitCount: integer("revisit_count").default(0).notNull(), // 재방문자 수
  maxRevisits: integer("max_revisits").default(0).notNull(), // 최다 재방문
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Point Transactions ──────────────────────────────
export const pointTransactions = pgTable("point_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(), // + 획득, - 차감
  type: varchar("type", { length: 30 }).notNull(), // visit_first, visit_revisit, unlock, signup_bonus
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Unlocks (음식점명 열람 기록) ────────────────────
export const unlocks = pgTable("unlocks", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }).notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.restaurantId] }),
]);

// ─── Assembly Members (국회의원) ─────────────────────
export const assemblyMembers = pgTable("assembly_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  party: varchar("party", { length: 50 }),
  district: varchar("district", { length: 100 }),
  term: integer("term"), // 제 N대
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Assembly Expenses (업무추진비) ──────────────────
export const assemblyExpenses = pgTable("assembly_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").references(() => assemblyMembers.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  expenseDate: date("expense_date").notNull(),
  amount: integer("amount"),
  purpose: text("purpose"),
  source: text("source"), // 데이터 출처
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
