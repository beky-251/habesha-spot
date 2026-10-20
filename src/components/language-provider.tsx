"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "am";

type TranslationDictionary = Record<string, string>;

const translations: Record<Language, TranslationDictionary> = {
  en: {
    // Navigation
    home: "Home",
    explore: "Explore",
    favorites: "Favorites",
    dashboard: "Dashboard",
    myBusinesses: "My Businesses",
    signIn: "Sign In",
    signUp: "Get Started",
    signOut: "Sign Out",

    // Homepage hero
    homeBadge: "YOUR LOCAL GUIDE TO THE BEST PLACES",
    homeTitle: "Discover Amazing Cafés, Restaurants, Hotels & More",
    homeDescription:
      "Explore the best places across Ethiopia, from exceptional coffee and delicious food to cozy stays and unforgettable experiences.",
    searchPlaceholder: "Search cafés, restaurants, hotels...",
    searchLabel: "Search places",
    chooseCity: "Choose a city",
    allCities: "All cities",
    searchButton: "Explore Places",
    exploreSubtitle:
      "Discover Ethiopia, one spot at a time.",
    listBusiness: "List Your Business",
    english: "English",
    amharic: "አማርኛ",

    // Homepage sections
    exploreCategories: "Explore by category",
    categoryHeading: "What are you in the mood for?",
    categoryDescription:
      "Find the right place for your next meal, coffee break, shopping trip, or adventure.",
    exploreAll: "Explore all",
    categoriesComingSoon: "Categories are coming soon",
    categoriesEmpty:
      "Add active categories in Supabase to display them here.",
    categoriesUnavailable:
      "We couldn't load categories right now. Please check your Supabase connection and try again.",

    exploreLocation: "Explore by location",
    discoverNearby: "Discover places near you",
    cityDescription:
      "Start exploring local businesses in cities across Ethiopia.",
    citiesEmpty:
      "Cities will appear here when they are available in the database.",
    citiesUnavailable: "City information is temporarily unavailable.",

    businessOwners: "For local business owners",
    businessHeading: "Put your business on the map.",
    businessDescription:
      "Help more people discover your business. Create a listing and introduce your services to customers looking for their next favorite spot.",
    addBusiness: "Add your business",

    discoverLocal: "Discover local, love local.",
    favoritesLabel: "Favorites",
    explorePlaces: "Explore Places",
  },

  am: {
    // Navigation
    home: "መነሻ",
    explore: "ያስሱ",
    favorites: "ተወዳጆች",
    dashboard: "ዳሽቦርድ",
    myBusinesses: "የእኔ ንግዶች",
    signIn: "ይግቡ",
    signUp: "ይጀምሩ",
    signOut: "ይውጡ",

    // Homepage hero
    homeBadge: "ምርጥ ቦታዎችን ለማግኘት የአካባቢዎ መመሪያ",
    homeTitle: "ድንቅ የቡና ቤቶችን፣ ምግብ ቤቶችን፣ ሆቴሎችን እና ሌሎችንም ያግኙ",
    homeDescription:
      "ከምርጥ ቡናና ጣፋጭ ምግቦች እስከ ምቹ ማረፊያዎችና የማይረሱ ተሞክሮዎች ድረስ በኢትዮጵያ ያሉ ምርጥ ቦታዎችን ያስሱ።",
    searchPlaceholder: "የቡና ቤቶችን፣ ምግብ ቤቶችን፣ ሆቴሎችን ይፈልጉ...",
    searchLabel: "ቦታዎችን ይፈልጉ",
    chooseCity: "ከተማ ይምረጡ",
    allCities: "ሁሉም ከተሞች",
    searchButton: "ቦታዎችን ያስሱ",
    exploreSubtitle: "ኢትዮጵያን በአንድ ቦታ ያግኙ።",
    listBusiness: "ንግድዎን ይመዝግቡ",
    english: "English",
    amharic: "አማርኛ",

    // Homepage sections
    exploreCategories: "በምድብ ያስሱ",
    categoryHeading: "ምን ዓይነት ቦታ ይፈልጋሉ?",
    categoryDescription:
      "ለምግብ፣ ለቡና፣ ለግብይት ወይም ለጀብዱ የሚስማማዎትን ቦታ ያግኙ።",
    exploreAll: "ሁሉንም ያስሱ",
    categoriesComingSoon: "ምድቦች በቅርቡ ይታያሉ",
    categoriesEmpty:
      "እዚህ እንዲታዩ በSupabase ውስጥ ንቁ ምድቦችን ያክሉ።",
    categoriesUnavailable:
      "ምድቦችን መጫን አልተቻለም። እባክዎ የSupabase ግንኙነትዎን ያረጋግጡ።",

    exploreLocation: "በአካባቢ ያስሱ",
    discoverNearby: "በከተሞች ያሉ ቦታዎችን ያግኙ",
    cityDescription:
      "በኢትዮጵያ ከተሞች ያሉ የአካባቢ ንግዶችን ማስሰስ ይጀምሩ።",
    citiesEmpty:
      "ከተሞች በዳታቤዙ ውስጥ ሲኖሩ እዚህ ይታያሉ።",
    citiesUnavailable: "የከተሞች መረጃ ለጊዜው አይገኝም።",

    businessOwners: "ለአካባቢ ንግድ ባለቤቶች",
    businessHeading: "ንግድዎን በካርታ ላይ ያስቀምጡ።",
    businessDescription:
      "ብዙ ሰዎች ንግድዎን እንዲያገኙ ያግዙ። ንግድዎን ይመዝግቡ እና ከደንበኞች ጋር ይገናኙ።",
    addBusiness: "ንግድዎን ያክሉ",

    discoverLocal: "የአካባቢዎን ይወቁ፣ የአካባቢዎን ይደግፉ።",
    favoritesLabel: "ተወዳጆች",
    explorePlaces: "ቦታዎችን ያስሱ",
  },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  ready: boolean;
};

const LanguageContext = createContext<
  LanguageContextValue | undefined
>(undefined);

const STORAGE_KEY = "habeshaspot-language";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "am";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      if (!active) return;

      try {
        const savedLanguage = window.localStorage.getItem(STORAGE_KEY);

        if (isLanguage(savedLanguage)) {
          setLanguageState(savedLanguage);
        }
      } catch {
        // Use English when browser storage is unavailable.
      }

      setReady(true);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // The language can still change for this session.
    }
  }, []);

  const t = useCallback(
    (key: string) =>
      translations[language][key] ?? translations.en[key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, ready }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside a LanguageProvider."
    );
  }

  return context;
}