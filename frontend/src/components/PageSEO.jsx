import { Helmet } from 'react-helmet-async';
import { seoConfig } from '../utils/seo';

export const PageSEO = ({ page, title, description }) => {
  const config = seoConfig[page] || {};
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={window.location.href} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <link rel="canonical" href={window.location.href} />
    </Helmet>
  );
};

export default PageSEO;
