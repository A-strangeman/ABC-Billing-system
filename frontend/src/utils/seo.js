export const seoConfig = {
  login: {
    title: "Login | Billing System - Secure Access",
    description: "Sign in to your billing system account to manage invoices and bills securely.",
    keywords: "login, billing, invoice management, secure access"
  },
  signup: {
    title: "Create Account | Billing System - Start Free",
    description: "Create your billing system account to start managing bills and invoices. Get started in minutes.",
    keywords: "signup, register, billing system, create account"
  },
  dashboard: {
    title: "Dashboard | Billing System - Overview & Analytics",
    description: "View your billing dashboard with recent bills, drafts, and key statistics.",
    keywords: "dashboard, billing overview, recent bills, analytics"
  },
  billing: {
    title: "Create Bill | Billing System - Invoice Generator",
    description: "Create professional invoices and bills with our easy-to-use billing tool.",
    keywords: "create bill, invoice generator, billing, create invoice"
  },
  editBills: {
    title: "Manage Bills | Billing System - Edit & Delete",
    description: "Search, edit, and manage all your bills in one place.",
    keywords: "manage bills, edit invoice, search bills, bill management"
  },
  reports: {
    title: "Reports | Billing System - Analytics & Insights",
    description: "View detailed reports on your billing activity, top customers, and payment status.",
    keywords: "reports, billing analytics, customer insights, payment status"
  },
  catalog: {
    title: "Product Catalog | Billing System - Admin Panel",
    description: "Manage your product catalog, categories, materials, and specifications.",
    keywords: "catalog, products, admin, inventory management"
  },
  priceList: {
    title: "Price List | Billing System - Product Pricing",
    description: "View and manage product prices and pricing information.",
    keywords: "price list, products, pricing, rates"
  },
  profile: {
    title: "Profile | Billing System - Account Settings",
    description: "Manage your account settings and profile information.",
    keywords: "profile, account settings, user settings"
  },
  help: {
    title: "Help & Support | Billing System - Documentation",
    description: "Get help and support for using the billing system.",
    keywords: "help, support, documentation, FAQ"
  },
  privacy: {
    title: "Privacy Policy | Billing System",
    description: "Read our privacy policy to understand how we protect your data.",
    keywords: "privacy policy, data protection, security"
  },
  terms: {
    title: "Terms of Service | Billing System",
    description: "Review the terms of service for using our billing system.",
    keywords: "terms of service, legal, conditions"
  }
};

export const getOGTags = (page) => {
  const config = seoConfig[page] || {};
  return {
    "og:title": config.title || "Billing System",
    "og:description": config.description || "Professional billing and invoicing system",
    "og:type": "website",
    "og:url": `${window.location.origin}`,
    "twitter:card": "summary_large_image",
    "twitter:title": config.title || "Billing System",
    "twitter:description": config.description || "Professional billing and invoicing system"
  };
};

export const updateCanonicalUrl = (path) => {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}${path}`;
};
