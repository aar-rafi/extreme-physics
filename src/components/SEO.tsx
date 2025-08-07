import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  structuredData?: Record<string, any>;
}

export const SEO = ({ title, description, canonical, structuredData }: SEOProps) => {
  useEffect(() => {
    // Title
    document.title = title;

    // Description
    const desc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    desc.setAttribute('name', 'description');
    desc.setAttribute('content', description);
    if (!desc.parentNode) document.head.appendChild(desc);

    // Canonical
    const href = canonical || window.location.href;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);

    // JSON-LD
    const existing = document.getElementById('jsonld-structured-data');
    if (existing) existing.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'jsonld-structured-data';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, canonical, structuredData]);

  return null;
};
