import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
}

const defaultTitle = 'SnipShift - Connect Barbers, Stylists & Creative Professionals';
const defaultDescription = 'Connect barbers, stylists, and beauticians with flexible work opportunities. Find gigs, post jobs, and build your professional network.';
const defaultImage = '/brand-logo.png';
const defaultUrl = 'https://snipshift.com';
const defaultSiteName = 'SnipShift';

export function SEO({
  title = defaultTitle,
  description = defaultDescription,
  image = defaultImage,
  url = defaultUrl,
  type = 'website',
  siteName = defaultSiteName,
}: SEOProps) {
  const fullTitle = title === defaultTitle ? title : `${title} | ${defaultSiteName}`;
  const fullImageUrl = image.startsWith('http') ? image : `${defaultUrl}${image}`;
  const fullUrl = url.startsWith('http') ? url : `${defaultUrl}${url}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      <meta name="theme-color" content="#0f172a" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="SnipShift" />
    </Helmet>
  );
}

