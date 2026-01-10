import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  /**
   * Optional override for social share titles (OpenGraph/Twitter).
   * Useful when you want a different title than the document <title>.
   */
  socialTitle?: string;
  /**
   * Optional override for OpenGraph description (can differ from meta description).
   */
  ogDescription?: string;
  /**
   * Optional override for Twitter description (can differ from meta description).
   */
  twitterDescription?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
}

const defaultTitle = "HospoGo | Brisbane's On-Demand Hospo Staff";
const defaultDescription =
  'Verified RSA bartenders and waitstaff ready to fill your shifts.';
// Keep this as a stable, brand-friendly URL; Vercel rewrites map it to the current OG asset.
const defaultImage = '/hospogo-og.png';
const defaultUrl = 'https://hospogo.com';
const defaultSiteName = 'HospoGo';

export function SEO({
  title = defaultTitle,
  description = defaultDescription,
  image = defaultImage,
  url = defaultUrl,
  socialTitle,
  ogDescription,
  twitterDescription,
  type = 'website',
  siteName = defaultSiteName,
}: SEOProps) {
  const fullTitle = title === defaultTitle ? title : `${title} | ${defaultSiteName}`;
  const resolvedSocialTitle = socialTitle ?? fullTitle;
  const resolvedOgDescription = ogDescription ?? description;
  const resolvedTwitterDescription = twitterDescription ?? description;
  const fullImageUrl = image.startsWith('http') ? image : `${defaultUrl}${image}`;
  const fullUrl = url.startsWith('http') ? url : `${defaultUrl}${url}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      <meta name="theme-color" content="#1A1A1A" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={resolvedSocialTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={resolvedSocialTitle} />
      <meta name="twitter:description" content={resolvedTwitterDescription} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="HospoGo" />
    </Helmet>
  );
}

