import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.products': 'Products',
    'nav.admin': 'Admin',
    'nav.messages': 'Messages',
    'nav.login': 'Login',
    'nav.startSelling': 'Start Selling',
    'nav.dashboard': 'Dashboard',
    'nav.sellerDashboard': 'Seller Dashboard',
    'nav.buyerDashboard': 'Buyer Dashboard',
    'nav.signOut': 'Sign Out',
    
    // Hero Section
    'hero.badge': 'Global Digital Marketplace',
    'hero.title': 'Buy & Sell Digital Products With Ease',
    'hero.subtitle': 'Global platform for creators to sell e-books, designs, music, software, templates, and much more.',
    'hero.startSelling': 'Start Selling Now',
    'hero.viewProducts': 'View Products',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Start selling in 4 easy steps',
    'howItWorks.step1.title': 'Create Account',
    'howItWorks.step1.desc': 'Sign up free',
    'howItWorks.step2.title': 'Upload Product',
    'howItWorks.step2.desc': 'Add file or link',
    'howItWorks.step3.title': 'Receive Payment',
    'howItWorks.step3.desc': 'Secure payment',
    'howItWorks.step4.title': 'Buyer Downloads',
    'howItWorks.step4.desc': 'Instant access',
    
    // Advantages
    'advantages.title': 'Digisellix Advantages',
    'advantages.subtitle': 'Trusted marketplace for creators',
    'advantages.payments.title': 'Fast Payments',
    'advantages.payments.desc': 'Secure global payments',
    'advantages.global.title': 'Global Sellers',
    'advantages.global.desc': 'Worldwide reach',
    'advantages.upload.title': 'Flexible Upload',
    'advantages.upload.desc': 'File or link',
    'advantages.platform.title': 'Modern Platform',
    'advantages.platform.desc': 'User-friendly',
    
    // Product Sections
    'featured.badge': 'Featured Products',
    'featured.title': 'Premium Picks',
    'featured.subtitle': 'Handpicked premium products from top creators',
    'popular.badge': 'Best Sellers',
    'popular.title': 'Popular Products',
    'popular.subtitle': 'Most purchased products by our community',
    'newest.badge': 'Just Added',
    'newest.title': 'Newest Products',
    'newest.subtitle': 'Fresh products just added to the marketplace',
    'explore.title': 'Explore All Products',
    'explore.subtitle': 'Browse our complete collection of digital products',
    'explore.viewAll': 'View All Products',
    
    // CTA
    'cta.title': 'Ready to Start Your Digital Business?',
    'cta.subtitle': 'Join thousands of creators who trust Digisellix',
    'cta.button': 'Start Free Now',
    
    // Footer
    'footer.tagline': 'Global marketplace for digital products',
    'footer.product': 'Product',
    'footer.browseProducts': 'Browse Products',
    'footer.sellProducts': 'Sell Products',
    'footer.company': 'Company',
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.legal': 'Legal',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
    'footer.copyright': '© 2024 Digisellix. All rights reserved.',
    
    // Products Page
    'products.title': 'Discover Products',
    'products.subtitle': 'Find the perfect digital product for your needs',
    'products.allCategories': 'All Categories',
    'products.searchPlaceholder': 'Search products...',
    'products.noProducts': 'No products found',
    'products.tryAdjusting': 'Try adjusting your search or filter criteria',
    'products.previous': 'Previous',
    'products.next': 'Next',
    
    // Product Card
    'product.viewDetails': 'View Details',
    'product.topRated': 'Top',
    'product.reviews': 'reviews',
    
    // Language Switcher
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
  },
  id: {
    // Navigation
    'nav.products': 'Produk',
    'nav.admin': 'Admin',
    'nav.messages': 'Pesan',
    'nav.login': 'Masuk',
    'nav.startSelling': 'Mulai Jual',
    'nav.dashboard': 'Dasbor',
    'nav.sellerDashboard': 'Dasbor Penjual',
    'nav.buyerDashboard': 'Dasbor Pembeli',
    'nav.signOut': 'Keluar',
    
    // Hero Section
    'hero.badge': 'Marketplace Digital Global',
    'hero.title': 'Jual & Beli Produk Digital Dengan Mudah',
    'hero.subtitle': 'Platform global untuk kreator menjual e-book, desain, musik, perangkat lunak, template, dan banyak lagi.',
    'hero.startSelling': 'Mulai Jual Sekarang',
    'hero.viewProducts': 'Lihat Produk',
    
    // How It Works
    'howItWorks.title': 'Cara Kerja',
    'howItWorks.subtitle': 'Mulai jual dalam 4 langkah mudah',
    'howItWorks.step1.title': 'Buat Akun',
    'howItWorks.step1.desc': 'Daftar gratis',
    'howItWorks.step2.title': 'Unggah Produk',
    'howItWorks.step2.desc': 'Tambah file atau link',
    'howItWorks.step3.title': 'Terima Pembayaran',
    'howItWorks.step3.desc': 'Pembayaran aman',
    'howItWorks.step4.title': 'Pembeli Unduh',
    'howItWorks.step4.desc': 'Akses instan',
    
    // Advantages
    'advantages.title': 'Keunggulan Digisellix',
    'advantages.subtitle': 'Marketplace terpercaya untuk kreator',
    'advantages.payments.title': 'Pembayaran Cepat',
    'advantages.payments.desc': 'Pembayaran global aman',
    'advantages.global.title': 'Penjual Global',
    'advantages.global.desc': 'Jangkauan seluruh dunia',
    'advantages.upload.title': 'Unggah Fleksibel',
    'advantages.upload.desc': 'File atau link',
    'advantages.platform.title': 'Platform Modern',
    'advantages.platform.desc': 'Mudah digunakan',
    
    // Product Sections
    'featured.badge': 'Produk Unggulan',
    'featured.title': 'Pilihan Premium',
    'featured.subtitle': 'Produk premium pilihan dari kreator terbaik',
    'popular.badge': 'Terlaris',
    'popular.title': 'Produk Populer',
    'popular.subtitle': 'Produk paling banyak dibeli oleh komunitas kami',
    'newest.badge': 'Baru Ditambahkan',
    'newest.title': 'Produk Terbaru',
    'newest.subtitle': 'Produk baru yang ditambahkan ke marketplace',
    'explore.title': 'Jelajahi Semua Produk',
    'explore.subtitle': 'Telusuri koleksi lengkap produk digital kami',
    'explore.viewAll': 'Lihat Semua Produk',
    
    // CTA
    'cta.title': 'Siap Memulai Bisnis Digital Anda?',
    'cta.subtitle': 'Bergabung dengan ribuan kreator yang mempercayai Digisellix',
    'cta.button': 'Mulai Gratis Sekarang',
    
    // Footer
    'footer.tagline': 'Marketplace global untuk produk digital',
    'footer.product': 'Produk',
    'footer.browseProducts': 'Jelajahi Produk',
    'footer.sellProducts': 'Jual Produk',
    'footer.company': 'Perusahaan',
    'footer.about': 'Tentang',
    'footer.contact': 'Kontak',
    'footer.legal': 'Legal',
    'footer.terms': 'Syarat',
    'footer.privacy': 'Privasi',
    'footer.copyright': '© 2024 Digisellix. Hak cipta dilindungi.',
    
    // Products Page
    'products.title': 'Temukan Produk',
    'products.subtitle': 'Temukan produk digital yang sempurna untuk kebutuhan Anda',
    'products.allCategories': 'Semua Kategori',
    'products.searchPlaceholder': 'Cari produk...',
    'products.noProducts': 'Tidak ada produk ditemukan',
    'products.tryAdjusting': 'Coba sesuaikan pencarian atau filter Anda',
    'products.previous': 'Sebelumnya',
    'products.next': 'Selanjutnya',
    
    // Product Card
    'product.viewDetails': 'Lihat Detail',
    'product.topRated': 'Top',
    'product.reviews': 'ulasan',
    
    // Language Switcher
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
  },
};

// Detect Indonesian IP
async function detectIndonesianIP(): Promise<boolean> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code === 'ID';
  } catch (error) {
    console.error('Failed to detect IP location:', error);
    return false;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('digisellix-language');
    if (saved === 'en' || saved === 'id') return saved;
    return 'en'; // Default to English
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only auto-detect if no saved preference
    const saved = localStorage.getItem('digisellix-language');
    if (!saved && !initialized) {
      detectIndonesianIP().then((isIndonesian) => {
        if (isIndonesian) {
          setLanguageState('id');
          localStorage.setItem('digisellix-language', 'id');
        }
        setInitialized(true);
      });
    } else {
      setInitialized(true);
    }
  }, [initialized]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('digisellix-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
