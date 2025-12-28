import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  image?: string;
  type?: "website" | "article";
  keywords?: string;
}

const SEOHead = ({ 
  title, 
  description, 
  canonicalUrl,
  image = "https://ferunda.com/og-image.jpg",
  type = "website",
  keywords
}: SEOHeadProps) => {
  const fullTitle = `${title} | Ferunda - Fernando Unda Tattoo Artist`;
  const baseUrl = "https://ferunda.com";
  const canonical = canonicalUrl ? `${baseUrl}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEOHead;
