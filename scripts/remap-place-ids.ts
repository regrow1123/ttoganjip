import postgres from "postgres";

const DB_URL = "postgresql://postgres.xujhhmkvfjvttrwnkaew:1c2meLpz0VERpcHt@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
const KAKAO_KEY = "bae97fd629fe44b7985cdcef04ffc035";
const sql = postgres(DB_URL);

async function searchKakao(query: string): Promise<{ id: string; x: string; y: string; place_name: string } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] || null;
}

async function geocodeAddress(address: string): Promise<{ x: string; y: string } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] || null;
}

async function main() {
  const rows = await sql`SELECT id, name, address FROM restaurants WHERE place_id IS NULL`;
  console.log(`총 ${rows.length}개 식당 재매핑 시작\n`);

  let success = 0;
  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, name, address } = rows[i];
    
    // 1차: 이름 + 주소 조합으로 키워드 검색
    let result = await searchKakao(`${name} ${address}`);
    
    // 2차: 이름만으로
    if (!result) {
      result = await searchKakao(name);
    }

    if (result) {
      await sql`UPDATE restaurants SET place_id = ${result.id}, lat = ${parseFloat(result.y)}, lng = ${parseFloat(result.x)} WHERE id = ${id}`;
      success++;
      console.log(`✅ ${String(i + 1).padStart(3)} ${name} → ${result.place_name} (${result.id})`);
    } else {
      // 3차: 주소만으로 지오코딩
      const geo = address ? await geocodeAddress(address) : null;
      if (geo) {
        await sql`UPDATE restaurants SET lat = ${parseFloat(geo.y)}, lng = ${parseFloat(geo.x)} WHERE id = ${id}`;
        geocoded++;
        console.log(`📍 ${String(i + 1).padStart(3)} ${name} → 주소 지오코딩 성공`);
      } else {
        failed++;
        console.log(`❌ ${String(i + 1).padStart(3)} ${name} — 전부 실패`);
      }
    }

    // Rate limit (초당 10건)
    if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`🎉 완료: placeId ${success}개, 지오코딩 ${geocoded}개, 실패 ${failed}개`);
  console.log(`═══════════════════════════════`);

  await sql.end();
}

main().catch(console.error);
