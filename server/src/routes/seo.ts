import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();
const SITE = "https://www.landixhelo.me";

const STATIC_PATHS: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/cars", changefreq: "daily", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
];

router.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const cars = await prisma.car.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const urls = [
      ...STATIC_PATHS.map(
        (p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      ),
      ...cars.map((car) => {
        const lastmod = car.updatedAt.toISOString().slice(0, 10);
        return `  <url>
    <loc>${SITE}/cars/${car.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
