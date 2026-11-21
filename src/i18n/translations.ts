import type { CategoryId, Language, OrderStatus, SortOption } from '../../shared/types.js';

export const TRANSLATIONS: Record<
  Language,
  {
    brand: string;
    tagline: string;
    nav: {
      all: string;
      orders: string;
      admin: string;
      searchPlaceholder: string;
      searchShortcut: string;
      customerMode: string;
      adminMode: string;
      roleSwitchTooltip: string;
      bag: string;
    };
    categories: Record<CategoryId, string>;
    hero: {
      eyebrow: string;
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
      statLine: string;
    };
    catalog: {
      filtersTitle: string;
      clearAll: string;
      categoryLabel: string;
      allCategories: string;
      sizeLabel: string;
      colorLabel: string;
      priceLabel: string;
      minPrice: string;
      maxPrice: string;
      inStockOnly: string;
      piecesCount: (n: number) => string;
      sortLabel: string;
      sorts: Record<SortOption, string>;
      newBadge: string;
      outOfStock: string;
      lowStock: (n: number) => string;
      inStock: string;
      quickView: string;
      emptyTitle: string;
      emptyDesc: string;
      applyFiltersMobile: string;
    };
    product: {
      selectColor: string;
      selectSize: string;
      addToBag: string;
      addedToBag: string;
      soldOutVariant: string;
      onlyLeft: (n: number) => string;
      maxInBag: string;
      composition: string;
      care: string;
      sku: string;
      close: string;
    };
    cart: {
      title: string;
      emptyTitle: string;
      emptyDesc: string;
      continueShopping: string;
      freeShippingUnlocked: string;
      freeShippingAway: (amount: string) => string;
      couponPlaceholder: string;
      apply: string;
      demoCoupons: string;
      invalidCoupon: string;
      minSubtotalCoupon: string;
      subtotal: string;
      discount: string;
      shipping: string;
      free: string;
      total: string;
      checkout: string;
      remove: string;
    };
    checkout: {
      title: string;
      steps: [string, string, string];
      fullName: string;
      email: string;
      phone: string;
      city: string;
      district: string;
      addressLine: string;
      postalCode: string;
      deliveryStandard: string;
      deliveryStandardDesc: string;
      deliveryExpress: string;
      deliveryExpressDesc: string;
      cardHolder: string;
      cardNumber: string;
      expiry: string;
      cvc: string;
      demoCardNote: string;
      back: string;
      next: string;
      placeOrder: string;
      processing: string;
      successTitle: string;
      successDesc: (orderNumber: string) => string;
      trackOrder: string;
    };
    orders: {
      title: string;
      subtitle: string;
      searchPlaceholder: string;
      searchBtn: string;
      showAll: string;
      orderNumber: string;
      date: string;
      payment: string;
      items: string;
      timeline: string;
      empty: string;
      statuses: Record<OrderStatus, string>;
    };
    admin: {
      title: string;
      subtitle: string;
      requireAdminTitle: string;
      requireAdminDesc: string;
      switchToAdminBtn: string;
      kpis: {
        revenue: string;
        orders: string;
        aov: string;
        lowStock: string;
      };
      charts: {
        monthlyRevenue: string;
        categoryMix: string;
      };
      tabs: {
        products: string;
        orders: string;
      };
      newProduct: string;
      editProduct: string;
      deleteProduct: string;
      uploadImage: string;
      uploading: string;
      s3Active: string;
      s3Demo: string;
      saveProduct: string;
      cancel: string;
      resetDemo: string;
      orderStatusUpdated: string;
    };
    command: {
      placeholder: string;
      productsGroup: string;
      actionsGroup: string;
      noResults: string;
      actionAdmin: string;
      actionCustomer: string;
      actionOrders: string;
      actionBag: string;
      actionLang: string;
    };
    footer: {
      stackNote: string;
      demoNotice: string;
    };
  }
> = {
  tr: {
    brand: 'HANN STUDIO',
    tagline: 'Mimari Giyim & Kapsül Koleksiyon',
    nav: {
      all: 'Koleksiyon',
      orders: 'Sipariş Takibi',
      admin: 'Admin Panel',
      searchPlaceholder: 'Ürün veya koleksiyon ara...',
      searchShortcut: '⌘K',
      customerMode: 'Müşteri',
      adminMode: 'Admin',
      roleSwitchTooltip: 'Tek tıkla Müşteri / Admin görünümünü değiştirin',
      bag: 'Sepet',
    },
    categories: {
      outerwear: 'Dış Giyim',
      women: 'Kadın',
      men: 'Erkek',
      tailoring: 'Terzilik & Triko',
    },
    hero: {
      eyebrow: 'ATELIER AW26 KAPSÜLÜ',
      title: 'Sade oranlar. Kalıcı dokular.',
      subtitle:
        'İtalyan bakire yünü, Avrupa keteni ve ham kupro ile tasarlanmış 10 parçalık modern gardırop seçkisi.',
      ctaPrimary: 'Koleksiyonu Keşfet',
      ctaSecondary: 'Dış Giyime Git',
      statLine: '3.000 TL üzeri ücretsiz kargo · Aynı gün stüdyo paketleme · 14 gün kolay iade',
    },
    catalog: {
      filtersTitle: 'Filtreler',
      clearAll: 'Temizle',
      categoryLabel: 'Kategori',
      allCategories: 'Tümü',
      sizeLabel: 'Beden',
      colorLabel: 'Renk',
      priceLabel: 'Fiyat Aralığı (TL)',
      minPrice: 'Min',
      maxPrice: 'Maks',
      inStockOnly: 'Sadece Stoktakiler',
      piecesCount: (n) => `${n} parça listeleniyor`,
      sortLabel: 'Sıralama',
      sorts: {
        featured: 'Editör Seçimi',
        newest: 'En Yeniler',
        'price-asc': 'Fiyat: Düşükten Yükseğe',
        'price-desc': 'Fiyat: Yüksekten Düşüğe',
      },
      newBadge: 'YENİ',
      outOfStock: 'Tükendi',
      lowStock: (n) => `Son ${n} adet`,
      inStock: 'Stokta',
      quickView: 'İncele',
      emptyTitle: 'Seçili filtrelere uygun parça bulunamadı',
      emptyDesc: 'Fiyat aralığını veya beden/renk seçimlerini sıfırlayarak koleksiyonun tamamını görüntüleyebilirsiniz.',
      applyFiltersMobile: 'Filtreleri Uygula',
    },
    product: {
      selectColor: 'Renk Seçimi',
      selectSize: 'Beden Seçimi',
      addToBag: 'Sepete Ekle',
      addedToBag: 'Sepete Eklendi',
      soldOutVariant: 'Bu Varyant Tükendi',
      onlyLeft: (n) => `Son ${n} adet stokta`,
      maxInBag: 'Stok sınırına ulaşıldı',
      composition: 'Kumaş & İçerik',
      care: 'Bakım Talimatı',
      sku: 'SKU',
      close: 'Kapat',
    },
    cart: {
      title: 'Alışveriş Çantanız',
      emptyTitle: 'Çantanız şu an boş',
      emptyDesc: 'Atelier AW26 koleksiyonundan parçalar ekleyerek devam edebilirsiniz.',
      continueShopping: 'Koleksiyona Dön',
      freeShippingUnlocked: 'Ücretsiz kargo hakkı kazandınız.',
      freeShippingAway: (amount) => `Ücretsiz kargo için ${amount} daha ekleyin`,
      couponPlaceholder: 'Promosyon kodu (ör. HANN10)',
      apply: 'Uygula',
      demoCoupons: 'Demo kodlar:',
      invalidCoupon: 'Geçersiz promosyon kodu',
      minSubtotalCoupon: 'Minimum sepet tutarı sağlanmadı',
      subtotal: 'Ara Toplam',
      discount: 'İndirim',
      shipping: 'Kargo',
      free: 'Ücretsiz',
      total: 'Toplam',
      checkout: 'Ödemeye Geç',
      remove: 'Kaldır',
    },
    checkout: {
      title: 'Güvenli Ödeme',
      steps: ['Teslimat', 'Kargo', 'Ödeme'],
      fullName: 'Ad Soyad',
      email: 'E-posta',
      phone: 'Telefon',
      city: 'Şehir',
      district: 'İlçe',
      addressLine: 'Açık Adres',
      postalCode: 'Posta Kodu',
      deliveryStandard: 'Standart Kargo (2–4 İş Günü)',
      deliveryStandardDesc: '3.000 TL üzeri siparişlerde ücretsiz',
      deliveryExpress: 'Studio Ekspres Kurye (Aynı / Ertesi Gün)',
      deliveryExpressDesc: 'Özel askılı koruma paketiyle öncelikli teslimat',
      cardHolder: 'Kart Üzerindeki İsim',
      cardNumber: 'Kart Numarası',
      expiry: 'SKT (AA/YY)',
      cvc: 'CVC',
      demoCardNote: 'Simülasyon ortamıdır; yalnızca kartın son 4 hanesi sipariş kaydına işlenir.',
      back: 'Geri',
      next: 'Devam Et',
      placeOrder: 'Siparişi Tamamla',
      processing: 'İşleniyor...',
      successTitle: 'Siparişiniz Studio Sistemine Alındı',
      successDesc: (num) => `Sipariş numaranız ${num}. Stoklar anlık olarak güncellendi.`,
      trackOrder: 'Siparişi Takip Et',
    },
    orders: {
      title: 'Sipariş Takip Merkezi',
      subtitle: 'Sipariş numarası ile kargo aşamalarını canlı izleyin. Admin panelinden durum güncellediğinizde anlık yansır.',
      searchPlaceholder: 'Sipariş no ara (ör. HN-2026-1041)',
      searchBtn: 'Sorgula',
      showAll: 'Tümünü Göster',
      orderNumber: 'Sipariş No',
      date: 'Tarih',
      payment: 'Ödeme',
      items: 'Ürünler',
      timeline: 'Teslimat Zaman Çizelgesi',
      empty: 'Eşleşen sipariş bulunamadı.',
      statuses: {
        received: 'Alındı',
        preparing: 'Hazırlanıyor',
        shipped: 'Kargoda',
        delivered: 'Teslim Edildi',
      },
    },
    admin: {
      title: 'Studio Yönetim Paneli',
      subtitle: 'Gerçek zamanlı gelir analitiği, varyant bazlı stok/ürün CRUD ve sipariş yaşam döngüsü yönetimi.',
      requireAdminTitle: 'Admin Yetkisi Gerekli',
      requireAdminDesc: 'Bu alan JWT RBAC ile korunmaktadır. Değerlendirme için tek tıkla Studio Admin rolüne geçebilirsiniz.',
      switchToAdminBtn: 'Admin Rolüne Geç',
      kpis: {
        revenue: 'Toplam Ciro',
        orders: 'Sipariş Adedi',
        aov: 'Ortalama Sepet',
        lowStock: 'Kritik / Tükenen SKU',
      },
      charts: {
        monthlyRevenue: 'Aylık Gelir Performansı (TL)',
        categoryMix: 'Kategori Bazlı Satış (TL)',
      },
      tabs: {
        products: 'Ürün & Stok Yönetimi',
        orders: 'Sipariş Yaşam Döngüsü',
      },
      newProduct: '+ Yeni Ürün Ekle',
      editProduct: 'Düzenle',
      deleteProduct: 'Sil',
      uploadImage: 'Görsel Yükle (S3 / Demo WebP)',
      uploading: 'Yükleniyor...',
      s3Active: 'AWS S3 Presigned Upload Aktif',
      s3Demo: 'Demo Yerel WebP Optimizasyonu Aktif',
      saveProduct: 'Ürünü Kaydet',
      cancel: 'Vazgeç',
      resetDemo: 'Demo Verisini Sıfırla',
      orderStatusUpdated: 'Sipariş durumu güncellendi',
    },
    command: {
      placeholder: 'Ürün adı, kategori veya komut ara (ör. kaban, admin, sepet)...',
      productsGroup: 'Katalog Sonuçları',
      actionsGroup: 'Hızlı İşlemler',
      noResults: 'Eşleşen ürün veya komut bulunamadı.',
      actionAdmin: 'Admin Paneline Geç',
      actionCustomer: 'Müşteri Görünümüne Geç',
      actionOrders: 'Sipariş Takip Merkezini Aç',
      actionBag: 'Alışveriş Çantasını Aç',
      actionLang: 'Dili İngilizceye (EN) Çevir',
    },
    footer: {
      stackNote: 'İstanbul · Atelier AW26 Kapsül Koleksiyonu',
      demoNotice: '© 2026 HANN Studio — Tüm ödeme ve teslimat adımları portfolyo gösterimi için simüle edilmiştir.',
    },
  },
  en: {
    brand: 'HANN STUDIO',
    tagline: 'Architectural Apparel & Capsule Store',
    nav: {
      all: 'Collection',
      orders: 'Order Tracking',
      admin: 'Admin Console',
      searchPlaceholder: 'Search pieces or collections...',
      searchShortcut: '⌘K',
      customerMode: 'Customer',
      adminMode: 'Admin',
      roleSwitchTooltip: 'Switch between Customer & Admin RBAC view in one click',
      bag: 'Bag',
    },
    categories: {
      outerwear: 'Outerwear',
      women: 'Women',
      men: 'Men',
      tailoring: 'Tailoring & Knitwear',
    },
    hero: {
      eyebrow: 'ATELIER AW26 CAPSULE',
      title: 'Refined proportions. Enduring textures.',
      subtitle:
        'A curated 10-piece architectural wardrobe crafted from Italian virgin wool, Belgian flax linen, and matte cupro.',
      ctaPrimary: 'Explore Collection',
      ctaSecondary: 'Shop Outerwear',
      statLine: 'Complimentary shipping over 3,000 TRY · Same-day studio packing · 14-day returns',
    },
    catalog: {
      filtersTitle: 'Filters',
      clearAll: 'Reset',
      categoryLabel: 'Category',
      allCategories: 'All Pieces',
      sizeLabel: 'Size',
      colorLabel: 'Color',
      priceLabel: 'Price Range (TRY)',
      minPrice: 'Min',
      maxPrice: 'Max',
      inStockOnly: 'In Stock Only',
      piecesCount: (n) => `${n} pieces shown`,
      sortLabel: 'Sort',
      sorts: {
        featured: 'Editorial Pick',
        newest: 'Newest Arrivals',
        'price-asc': 'Price: Low to High',
        'price-desc': 'Price: High to Low',
      },
      newBadge: 'NEW',
      outOfStock: 'Sold Out',
      lowStock: (n) => `Only ${n} left`,
      inStock: 'In Stock',
      quickView: 'Quick View',
      emptyTitle: 'No pieces match your current filters',
      emptyDesc: 'Try resetting your price ceiling or size/color filters to view the full Atelier capsule.',
      applyFiltersMobile: 'Apply Filters',
    },
    product: {
      selectColor: 'Color',
      selectSize: 'Size',
      addToBag: 'Add to Bag',
      addedToBag: 'Added to Bag',
      soldOutVariant: 'Variant Sold Out',
      onlyLeft: (n) => `Only ${n} left in stock`,
      maxInBag: 'Maximum available stock in bag',
      composition: 'Fabric & Composition',
      care: 'Care Guide',
      sku: 'SKU',
      close: 'Close',
    },
    cart: {
      title: 'Shopping Bag',
      emptyTitle: 'Your bag is empty',
      emptyDesc: 'Add curated pieces from the Atelier AW26 collection to begin.',
      continueShopping: 'Browse Collection',
      freeShippingUnlocked: 'Complimentary shipping unlocked.',
      freeShippingAway: (amount) => `Add ${amount} more for complimentary shipping`,
      couponPlaceholder: 'Promo code (e.g. HANN10)',
      apply: 'Apply',
      demoCoupons: 'Demo codes:',
      invalidCoupon: 'Invalid promo code',
      minSubtotalCoupon: 'Minimum bag subtotal not met',
      subtotal: 'Subtotal',
      discount: 'Discount',
      shipping: 'Shipping',
      free: 'Free',
      total: 'Total',
      checkout: 'Proceed to Checkout',
      remove: 'Remove',
    },
    checkout: {
      title: 'Checkout',
      steps: ['Shipping', 'Delivery', 'Payment'],
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      city: 'City',
      district: 'District',
      addressLine: 'Street Address',
      postalCode: 'Postal Code',
      deliveryStandard: 'Standard Courier (2–4 Business Days)',
      deliveryStandardDesc: 'Complimentary on orders over 3,000 TRY',
      deliveryExpress: 'Studio Express Courier (Same / Next Day)',
      deliveryExpressDesc: 'Priority garment-bag delivery',
      cardHolder: 'Cardholder Name',
      cardNumber: 'Card Number',
      expiry: 'Expiry (MM/YY)',
      cvc: 'CVC',
      demoCardNote: 'Simulated checkout: only the last 4 digits are persisted on the order record.',
      back: 'Back',
      next: 'Continue',
      placeOrder: 'Complete Order',
      processing: 'Processing...',
      successTitle: 'Order Confirmed',
      successDesc: (num) => `Order ${num} has been recorded and variant stock updated.`,
      trackOrder: 'Track Order',
    },
    orders: {
      title: 'Order Tracking Center',
      subtitle: 'Inspect live fulfillment stages by order number. Status updates from the Admin Console reflect immediately.',
      searchPlaceholder: 'Search order # (e.g. HN-2026-1041)',
      searchBtn: 'Lookup',
      showAll: 'Show All',
      orderNumber: 'Order #',
      date: 'Placed',
      payment: 'Payment',
      items: 'Items',
      timeline: 'Fulfillment Timeline',
      empty: 'No matching orders found.',
      statuses: {
        received: 'Received',
        preparing: 'Preparing',
        shipped: 'Shipped',
        delivered: 'Delivered',
      },
    },
    admin: {
      title: 'Studio Operations Console',
      subtitle: 'Live revenue telemetry, variant-level inventory CRUD, and order fulfillment controls.',
      requireAdminTitle: 'Admin Access Required',
      requireAdminDesc: 'Protected by JWT RBAC. Switch to the Studio Admin role in one click to evaluate full operations.',
      switchToAdminBtn: 'Switch to Admin Role',
      kpis: {
        revenue: 'Gross Revenue',
        orders: 'Total Orders',
        aov: 'Avg. Order Value',
        lowStock: 'Low / Sold-Out SKUs',
      },
      charts: {
        monthlyRevenue: 'Monthly Revenue Trend (TRY)',
        categoryMix: 'Revenue by Category (TRY)',
      },
      tabs: {
        products: 'Products & Inventory',
        orders: 'Order Fulfillment',
      },
      newProduct: '+ Add Product',
      editProduct: 'Edit',
      deleteProduct: 'Delete',
      uploadImage: 'Upload Image (S3 / Demo WebP)',
      uploading: 'Uploading...',
      s3Active: 'AWS S3 Presigned Upload Ready',
      s3Demo: 'Demo Client WebP Optimizer Active',
      saveProduct: 'Save Product',
      cancel: 'Cancel',
      resetDemo: 'Reset Demo Data',
      orderStatusUpdated: 'Order status updated',
    },
    command: {
      placeholder: 'Search products, categories, or commands (e.g. coat, admin, bag)...',
      productsGroup: 'Catalog Matches',
      actionsGroup: 'Quick Actions',
      noResults: 'No matching pieces or commands.',
      actionAdmin: 'Open Admin Console',
      actionCustomer: 'Switch to Customer View',
      actionOrders: 'Open Order Tracking',
      actionBag: 'Open Shopping Bag',
      actionLang: 'Switch Language to Turkish (TR)',
    },
    footer: {
      stackNote: 'Istanbul · Atelier AW26 Capsule Collection',
      demoNotice: '© 2026 HANN Studio — Checkout and fulfillment steps run in portfolio showcase mode.',
    },
  },
};
