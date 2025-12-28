import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SEOBreadcrumbProps {
  items: BreadcrumbItem[];
}

const SEOBreadcrumb = ({ items }: SEOBreadcrumbProps) => {
  // Generate JSON-LD structured data for breadcrumbs
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://ferunda.com"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        ...(item.href && { "item": `https://ferunda.com${item.href}` })
      }))
    ]
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      {/* Visual Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 flex-wrap font-body text-sm">
          <li className="flex items-center gap-2">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-3 h-3" />
              <span className="sr-only md:not-sr-only">Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          </li>
          
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              {item.href && index < items.length - 1 ? (
                <>
                  <Link 
                    to={item.href} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                </>
              ) : (
                <span className="text-foreground" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default SEOBreadcrumb;
