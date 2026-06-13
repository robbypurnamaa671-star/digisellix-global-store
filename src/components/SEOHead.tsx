import { Helmet } from "react-helmet-async";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string; // canonical path, e.g. "/products/123"
  image?: string | null;
  type?: "website" | "article" | "product";
  jsonLd?: unknown | unknown[];
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  path = "/",
  image,
  type = "website",
  jsonLd,
  noindex,
}: SEOHeadProps) {
  const url = `${SITE_URL}${path}`;
  const og = image || `${SITE_URL}/placeholder.svg`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={og} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={og} />

      {ldArray.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}

export default SEOHead;
