import { Helmet } from "react-helmet-async";
import { SITE, absoluteUrl, type SeoLocale } from "./site";

type Props = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  locale?: SeoLocale;
  noindex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export default function Seo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  locale = "sq",
  noindex = false,
  keywords,
  jsonLd,
}: Props) {
  const fullTitle = title.includes(SITE.name)
    ? title
    : `${title} | ${SITE.name}`;
  const desc = description || SITE.description[locale];
  const url = absoluteUrl(path);
  const img = image
    ? absoluteUrl(image)
    : SITE.ogImage;
  const kw = keywords || SITE.keywords[locale];
  const ogLocale = SITE.locales[locale];
  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang={locale} />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={kw} />
      <meta
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        }
      />
      <link rel="canonical" href={url} />

      <link rel="alternate" hrefLang="sq" href={url} />
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="it" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      <meta property="og:type" content={type === "product" ? "website" : type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content="en_US" />
      <meta property="og:locale:alternate" content="it_IT" />
      <meta property="og:locale:alternate" content="sq_AL" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      <meta name="author" content={SITE.legalName} />
      <meta name="geo.region" content="AL-11" />
      <meta name="geo.placename" content="Tirana" />
      <meta name="theme-color" content="#e11c49" />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
