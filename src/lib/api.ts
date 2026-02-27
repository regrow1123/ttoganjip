import type { MapBounds, Restaurant, Category, Source } from "@/types";

export async function fetchRestaurants(
  bounds: MapBounds,
  category?: Category | null,
  source?: Source | null
): Promise<{ restaurants: Restaurant[]; total: number }> {
  const params = new URLSearchParams({
    swLat: bounds.sw.lat.toString(),
    swLng: bounds.sw.lng.toString(),
    neLat: bounds.ne.lat.toString(),
    neLng: bounds.ne.lng.toString(),
  });

  if (category) params.set("category", category);
  if (source && source !== "all") params.set("source", source);

  const res = await fetch(`/api/map/restaurants?${params}`);
  if (!res.ok) throw new Error("Failed to fetch restaurants");
  return res.json();
}

export async function unlockRestaurant(
  restaurantId: string,
  userId: string
): Promise<any> {
  const res = await fetch(`/api/restaurants/${restaurantId}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}
