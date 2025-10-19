import { Helmet } from 'react-helmet-async';
import siteMetadata from '../config/siteMetadata.js';

function buildTitle(pageTitle) {
  if (!pageTitle || pageTitle === siteMetadata.defaultTitle) {
    return siteMetadata.defaultTitle;
  }
  return `${pageTitle} | ${siteMetadata.siteName}`;
}

function Seo({
  title,
  description,
  keywords,
  canonical,
  image,
  url,
  type = 'website',
  children,
  schema,
}) {
  const metaTitle = buildTitle(title);
  const metaDescription = description || siteMetadata.defaultDescription;
  const metaKeywords = keywords || siteMetadata.keywords.join(', ');
  const metaUrl = url || `${siteMetadata.baseUrl}${canonical ?? ''}`;
  const metaImage = image || siteMetadata.ogImage;
  const canonicalLink = canonical ? `${siteMetadata.baseUrl}${canonical}` : metaUrl;

  return (
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="theme-color" content={siteMetadata.themeColor} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content={siteMetadata.siteName} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      <link rel="canonical" href={canonicalLink} />

      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
      {children}
    </Helmet>
  );
}

export default Seo;
