export type Locale = "en" | "fr" | "es";

export interface Dictionary {
  nav: {
    brand: string;
    features: string;
    pricing: string;
    cta: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  problem: {
    title: string;
    points: string[];
  };
  solution: {
    title: string;
    points: string[];
  };
  features: Array<{
    title: string;
    description: string;
  }>;
  howItWorks: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  finalCta: {
    heading: string;
    subheadline: string;
    button: string;
  };
  footer: {
    tagline: string;
    links: {
      features: string;
      pricing: string;
      privacy: string;
      terms: string;
      contact: string;
    };
    copyright: string;
  };
}

export async function getDictionary(lang: Locale): Promise<Dictionary> {
  switch (lang) {
    case "fr":
      return (await import("../dictionaries/fr.json")).default as Dictionary;
    case "es":
      return (await import("../dictionaries/es.json")).default as Dictionary;
    default:
      return (await import("../dictionaries/en.json")).default as Dictionary;
  }
}
