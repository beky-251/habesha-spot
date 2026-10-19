import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
"http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
const supabase = await createClient();

const staticPages: MetadataRoute.Sitemap = [
{
url: `${SITE_URL}/`,
changeFrequency: "daily",
priority: 1,
},
{
url: `${SITE_URL}/search`,
changeFrequency: "daily",
priority: 0.9,
},
];

const { data: businesses, error } = await supabase
.from("businesses")
.select("slug, created_at")
.eq("status", "approved")
.order("created_at", { ascending: false });

if (error || !businesses) {
console.error("Unable to load businesses for sitemap:", error);

return staticPages;
}

const businessPages: MetadataRoute.Sitemap = businesses
.filter((business) => Boolean(business.slug))
.map((business) => ({
url: `${SITE_URL}/business/${encodeURIComponent(business.slug)}`,
lastModified: business.created_at
? new Date(business.created_at)
: undefined,
changeFrequency: "weekly" as const,
priority: 0.7,
}));

return [...staticPages, ...businessPages];
}
