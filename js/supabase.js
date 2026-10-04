/**
 * RACROB Water Pump Supplier - Supabase Client & Data Layer
 * 
 * Provides secure data access, authentication, storage uploads,
 * and reliable fallback handling.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_CONFIG } from './config.js';
import { generateReferenceCode } from './utils.js';

let supabaseClient = null;

// Helper to determine if actual Supabase credentials have been configured
export function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_ANON_KEY.includes('your-anon-public-key')
  );
}

// Initialize official Supabase client
export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (isSupabaseConfigured()) {
    try {
      // Use global window.supabase from CDN if present, or dynamically import
      if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    } catch (err) {
      console.warn('Supabase initialization warning:', err);
    }
  }
  return supabaseClient;
}

// ----------------------------------------------------------------
// 1. SITE SETTINGS
// ----------------------------------------------------------------
export async function getSiteSettings() {
  const sb = getSupabase();
  if (!sb) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const { data, error } = await sb.from('site_settings').select('*');
    if (error || !data || data.length === 0) {
      return { ...DEFAULT_CONFIG };
    }

    const settingsObj = { ...DEFAULT_CONFIG };
    data.forEach((row) => {
      settingsObj[row.setting_key] = row.setting_value;
    });
    return settingsObj;
  } catch (err) {
    console.error('Error fetching site settings from Supabase:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export async function updateSiteSetting(setting_key, setting_value) {
  const sb = getSupabase();
  if (!sb) {
    // If not configured, save locally for development preview
    localStorage.setItem(`racrob_setting_${setting_key}`, setting_value);
    return { success: true };
  }

  const { data, error } = await sb
    .from('site_settings')
    .upsert({ setting_key, setting_value }, { onConflict: 'setting_key' })
    .select();

  if (error) throw error;
  return { success: true, data };
}

// ----------------------------------------------------------------
// 2. HERO SLIDESHOW
// Order rule:
// 1. u.jpg as FIRST slide
// 2. o.jpg as SECOND slide
// 3. p.jpg as THIRD slide
// 4. Followed by remaining assets. Exclude sami.jpg (logo).
// ----------------------------------------------------------------
const INITIAL_SLIDES = [
  {
    id: 'slide-1',
    title_en: 'Industrial & High-Pressure Piping Systems',
    title_am: 'የኢንዱስትሪ እና ከፍተኛ ግፊት የውሃ ቧንቧ ስርዓቶች',
    title_om: 'Sirna Tuubboo Bishaanii Dhiibbaa Ol’aanaa fi Warshaa',
    title_ti: 'ናይ ኢንዱስትሪን ላዕለዋይ ጸቕጥን ናይ ማይ መትረባት',
    title_sid: 'Wosinshu gari dhibbate buuxo doogo',
    title_ar: 'أنظمة أنابيب ومضخات مياه صناعية عالية الضغط',
    description_en: 'Precision-engineered ductile iron fittings, flanges, and heavy-duty water pumps built for extreme durability.',
    description_am: 'ለከፍተኛ ጥንካሬ የተሰሩ ጥራት ያላቸው የብረት ቧንቧ ማገናኛዎች እና የውሃ ፓምፖች።',
    image_url: 'assets/images/u.jpg',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'slide-2',
    title_en: 'RACROB Main Showroom & Distribution Hub',
    title_am: 'የራክሮብ ዋና ማሳያ እና ማከፋፈያ ማዕከል',
    title_om: 'Giddugala Agarsiisaa fi Raabsaa RACROB',
    title_ti: 'ናይ ራክሮብ ዋና ምርኢትን መከፋፈሊን ማእከል',
    title_sid: 'RACROB Karsammo Agarsiisonna Baato',
    title_ar: 'معرض ومستودع توزيع مضخات راكروب الرئيسي',
    description_en: 'Comprehensive range of European-engineered water pumps, high-output generators, and complete accessories.',
    description_am: 'የተሟላ የአውሮፓ ደረጃ የውሃ ፓምፖች፣ ጀነሬተሮች እና መለዋወጫዎች በኢትዮ ቻይና ጎዳና።',
    image_url: 'assets/images/o.jpg',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'slide-3',
    title_en: 'Engineered Water Infrastructure & Real Estate',
    title_am: 'የውሃ ምህንድስና መሰረተ ልማት እና ሪል እስቴት',
    title_om: 'Ijaarsa Bu’uuraalee Bishaanii fi Qabeenya Dhaabbataa',
    title_ti: 'ናይ ማይ ምህንድስና መሰረተ-ልምዓትን ሪል እስቴትን',
    title_sid: 'Woinshu loosi qaccara buxote loosubba',
    title_ar: 'هندسة البنية التحتية للمياه والمشاريع العقارية الكبرى',
    description_en: 'Supplying municipal fountains, high-rise booster systems, and large commercial water distribution projects.',
    description_am: 'ለከተማ ፏፏቴዎች፣ ህንፃዎች እና ግዙፍ የውሃ ፕሮጀክቶች አስተማማኝ አቅርቦት።',
    image_url: 'assets/images/p.jpg',
    sort_order: 3,
    is_active: true
  },
  {
    id: 'slide-4',
    title_en: 'High Precision Bronze Flanges & Flow Fittings',
    title_am: 'ከፍተኛ ጥራት ያላቸው የነሐስ ፍላንጆች እና ማያያዣዎች',
    title_om: 'Faalaanjii fi Wal-qabsiiftuu Bishaanii',
    title_ti: 'ናይ ብሮንዝ ፍላንጅታትን መተሓሓዚታትን',
    title_sid: 'Wosonshu doogo leellishanno buuxo',
    title_ar: 'فلنجات برونزية عالية الدقة وتوصيلات خطوط المياه',
    description_en: 'Machined heavy-duty industrial pipe couplings for robust sealing and leak-proof water delivery.',
    description_am: 'ጠንካራ እና የማይፈሱ የኢንዱስትሪ ደረጃ ማያያዣዎች።',
    image_url: 'assets/images/q.jpg',
    sort_order: 4,
    is_active: true
  },
  {
    id: 'slide-5',
    title_en: 'All-Socket Ductile Iron Tee Junctions',
    title_am: 'የዳክታይል ብረት ቲ-መገጣጠሚያ ቧንቧዎች',
    title_om: 'Wal-qabsiiftuu Tuubboo T-Junction',
    title_ti: 'ናይ ዳክታይል ሓጺን ቲ ቅርጺ ዘለዎም መትረባት',
    title_sid: 'T-junction doogo buuxote',
    title_ar: 'تيهات وحديد دكتايل لشبكات توزيع المياه',
    description_en: 'Reliable municipal and agricultural distribution fittings certified to international EN standards.',
    description_am: 'ለግብርና እና ለከተማ የውሃ ማከፋፈያ የሚሆኑ አለምአቀፍ ደረጃቸውን የጠበቁ እቃዎች።',
    image_url: 'assets/images/r.jpg',
    sort_order: 5,
    is_active: true
  },
  {
    id: 'slide-6',
    title_en: 'Heavy-Duty Bulk Flow Woltman Meters (350mm)',
    title_am: 'የኢንዱስትሪ የውሃ ፍሰት መለኪያ ቆጣሪዎች (350 ሚሜ)',
    title_om: 'Safartuu Ya’aa Bishaanii Warshaa (350mm)',
    title_ti: 'ናይ ማይ ፍሰት መዐቀኒ ቆጸራታት (350mm)',
    title_sid: 'Waate buuxote wosinshu safartto (350mm)',
    title_ar: 'عدادات قياس تدفق المياه التوربينية الضخمة (350 مم)',
    description_en: 'Accurate Woltman turbine flow meters for main pipeline monitoring, irrigation, and municipal networks.',
    description_am: 'ለዋና መስመሮች እና ለመስኖ ፕሮጀክቶች ትክክለኛ የፍሰት መለኪያ ቆጣሪዎች።',
    image_url: 'assets/images/t.jpg',
    sort_order: 6,
    is_active: true
  },
  {
    id: 'slide-7',
    title_en: 'Corporate Engineering Consultation & Support',
    title_am: 'የኮርፖሬት ምህንድስና የማማከር አገልግሎት',
    title_om: 'Gorsa Injinarummaa fi Deeggarsa Teeknikaa',
    title_ti: 'ናይ ኮርፖሬት ምህንድስና ምኽርን ሓገዝን',
    title_sid: 'Injiniringete gorsote owaante',
    title_ar: 'استشارات هندسية وحلول متقدمة لمشاريع ضخ المياه',
    description_en: 'Dedicated technical team ready to size, select, and install optimal water pumping equipment.',
    description_am: 'ለፍላጎትዎ ተስማሚ ፓምፕ ለመምረጥ እና ለመግጠም ዝግጁ የሆነ የምህንድስና ቡድን።',
    image_url: 'assets/images/w.jpg',
    sort_order: 7,
    is_active: true
  }
];

export async function getSlides(onlyActive = true) {
  const sb = getSupabase();
  if (!sb) {
    return onlyActive ? INITIAL_SLIDES.filter((s) => s.is_active) : INITIAL_SLIDES;
  }

  try {
    let query = sb.from('slides').select('*').order('sort_order', { ascending: true });
    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return onlyActive ? INITIAL_SLIDES.filter((s) => s.is_active) : INITIAL_SLIDES;
    }
    return data;
  } catch (err) {
    console.error('Error fetching slides:', err);
    return onlyActive ? INITIAL_SLIDES.filter((s) => s.is_active) : INITIAL_SLIDES;
  }
}

export async function saveSlide(slideData) {
  const sb = getSupabase();
  if (!sb) {
    console.warn('Supabase not configured, slide change simulated.');
    return { success: true };
  }

  if (slideData.id && !slideData.id.startsWith('slide-')) {
    const { data, error } = await sb.from('slides').update(slideData).eq('id', slideData.id).select();
    if (error) throw error;
    return data[0];
  } else {
    delete slideData.id;
    const { data, error } = await sb.from('slides').insert(slideData).select();
    if (error) throw error;
    return data[0];
  }
}

export async function deleteSlide(id) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.from('slides').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ----------------------------------------------------------------
// 3. PRODUCTS
// ----------------------------------------------------------------
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name_en: 'Heavy Duty Duckfoot 90° Flanged Bend (150x90)',
    name_am: 'ዳክፉት 90 ዲግሪ የፍላንጅ ቧንቧ ማጠፊያ (150x90)',
    name_om: 'Tuubboo Daakfuutii 90° (150x90)',
    name_ti: 'ዳክፉት 90 ዲግሪ ናይ ፍላንጅ መተሓሓዚ (150x90)',
    name_sid: 'Duckfoot 90° buuxo (150x90)',
    name_ar: 'كوع دكتايل بقاعدة 90 درجة مع فلنجات (150x90)',
    description_en: 'Standard BS EN545 H4M DIP ductile iron pipe bend with heavy support base for high pressure pump risers.',
    description_am: 'ለከፍተኛ ግፊት የውሃ ፓምፕ መስመሮች የሚሆን ጠንካራ የዳክታይል ብረት ማጠፊያ።',
    image_url: 'assets/images/u.jpg',
    price: 18500.00,
    category: 'Fittings',
    model: 'DF-150-90',
    brand: 'RACROB',
    specifications: { "Material": "Ductile Iron BS EN545", "Pressure": "PN16 / PN25", "Size": "150mm x 90mm", "Coating": "Fusion Bonded Epoxy" },
    featured: true,
    sort_order: 1,
    is_active: true
  },
  {
    id: 'prod-2',
    name_en: 'Commercial High-Flow Booster Pump & Generator Set',
    name_am: 'የንግድ ከፍተኛ ፍሰት የውሃ ፓምፕ እና የጀነሬተር ጥምረት',
    name_om: 'Paampii fi Jeneraetara Bishaanii Humna Ol’aanaa',
    name_ti: 'ናይ ንግዲ ላዕለዋይ ፍሰት ዘለዎ ናይ ማይ ፓምፕን ጀነሬተርን',
    name_sid: 'Lowo hagina paampenna jeneretere',
    name_ar: 'مجموعة مضخة تعزيز التدفق العالي ومولد كهربائي',
    description_en: 'Italian-engineered high pressure commercial water booster coupled with diesel generator for continuous water delivery.',
    description_am: 'በጣሊያን ቴክኖሎጂ የተሰራ ከፍተኛ የውሃ ግፊት ፓምፕ ከጀነሬተር ጋር።',
    image_url: 'assets/images/o.jpg',
    price: 345000.00,
    category: 'Pumps',
    model: 'RCB-BST-500',
    brand: 'RACROB Italy',
    specifications: { "Head": "120m", "Flow Rate": "80 m3/h", "Power": "35 kW", "Origin": "Made in Italy" },
    featured: true,
    sort_order: 2,
    is_active: true
  },
  {
    id: 'prod-3',
    name_en: 'Industrial Woltman Bulk Water Meter (DN350)',
    name_am: 'የኢንዱስትሪ የጅምላ ውሃ ፍሰት ቆጣሪ (DN350)',
    name_om: 'Safartuu Bishaanii Woltman (DN350)',
    name_ti: 'ናይ ኢንዱስትሪ ጅምላ ማይ መዐቀኒ (DN350)',
    name_sid: 'Woltman safartto (DN350)',
    name_ar: 'عداد مياه صناعي توربيني وولتمن (DN350)',
    description_en: 'Cast iron sealed turbine water meter for high-volume pipelines, irrigation networks, and municipal intakes.',
    description_am: 'ለትላልቅ የውሃ መስመሮች እና ለመስኖ እርሻዎች የሚሆን ትክክለኛ የውሃ ቆጣሪ።',
    image_url: 'assets/images/t.jpg',
    price: 82000.00,
    category: 'Meters',
    model: 'WLT-350',
    brand: 'RACROB',
    specifications: { "Diameter": "350 mm", "Connection": "Flanged PN16", "Accuracy": "Class B ISO 4064", "Mechanism": "Helical Woltman" },
    featured: true,
    sort_order: 3,
    is_active: true
  },
  {
    id: 'prod-4',
    name_en: 'Machined Bronze High-Pressure Pipe Flange',
    name_am: 'የተስተካከለ የነሐስ ከፍተኛ ግፊት ፍላንጅ',
    name_om: 'Faalaanjii Biraanzii Dhiibbaa Ol’aanaa',
    name_ti: 'ናይ ብሮንዝ ፍላንጅ ላዕለዋይ ጸቕጢ',
    name_sid: 'Bronze faalaanje dhibbate',
    name_ar: 'فلنجة برونزية معالجة ميكانيكياً لضغط عالي',
    description_en: 'Precision-bored heavy brass/bronze connection flange engineered for anti-corrosion marine & chemical water systems.',
    description_am: 'ዝገትን የሚቋቋም ለኬሚካል እና ለውሃ ማጣሪያ ፓምፖች የሚሆን የነሐስ ፍላንጅ።',
    image_url: 'assets/images/q.jpg',
    price: 9500.00,
    category: 'Flanges',
    model: 'FLG-BRZ-100',
    brand: 'RACROB',
    specifications: { "Material": "Cast Bronze / Brass", "Rating": "Class 150 / PN20", "Bore": "4 inch / 100mm" },
    featured: false,
    sort_order: 4,
    is_active: true
  },
  {
    id: 'prod-5',
    name_en: 'Ductile Iron All-Socket Tee Junction (DN200)',
    name_am: 'የዳክታይል ብረት ሶስት አቅጣጫ ማከፋፈያ (DN200)',
    name_om: 'Wal-qabsiiftuu Tuubboo T-Junction (DN200)',
    name_ti: 'ናይ ዳክታይል ሓጺን ሰለስተ ኣንፈት መከፋፈሊ (DN200)',
    name_sid: 'Tee junction doogo (DN200)',
    name_ar: 'تيه حديد دكتايل كامل التوصيل السريع (DN200)',
    description_en: 'Robust socketed T-fitting with EPDM gasket seating for fast, secure, leak-free pipeline branching.',
    description_am: 'ለፈጣን እና አስተማማኝ የውሃ መስመር ማከፋፈያ የሚያገለግል የቲ ቅርጽ ማያያዣ።',
    image_url: 'assets/images/r.jpg',
    price: 14800.00,
    category: 'Fittings',
    model: 'TEE-SOC-200',
    brand: 'RACROB',
    specifications: { "Standard": "ISO 2531 / EN 545", "Nominal Diameter": "DN200", "Gasket": "EPDM Rubber Ring" },
    featured: false,
    sort_order: 5,
    is_active: true
  },
  {
    id: 'prod-6',
    name_en: '4-Way Ductile Iron Cross Fitting (DN160 PN16)',
    name_am: 'ባለ አራት አቅጣጫ የዳክታይል ብረት ማገናኛ (DN160)',
    name_om: 'Wal-qabsiiftuu Kallattii Afurii (DN160)',
    name_ti: 'ናይ ኣርባዕተ ኣንፈት መተሓሓዚ ሓጺን (DN160)',
    name_sid: '4-way cross buuxo (DN160)',
    name_ar: 'صليب دكتايل رباعي الاتجاهات (DN160 PN16)',
    description_en: 'Heavy-duty epoxy-coated cross junction fitting for multi-directional distribution manifolds.',
    description_am: 'በአራቱም አቅጣጫ ውሃ ለማከፋፈል የሚያስችል በኤፖክሲ ቀለም የተሸፈነ ማገናኛ።',
    image_url: 'assets/images/y.jpg',
    price: 21500.00,
    category: 'Fittings',
    model: 'CRS-160-PN16',
    brand: 'RACROB',
    specifications: { "Specification": "EN545 / ISO2531", "Rating": "PN16", "Size": "DN160", "Finish": "Red Protective Epoxy" },
    featured: true,
    sort_order: 6,
    is_active: true
  },
  {
    id: 'prod-7',
    name_en: 'Multi-Stage High-Rise Booster Water Pump',
    name_am: 'ለፎቅ ህንፃዎች የሚሆን ባለ ብዙ ደረጃ የውሃ መግፊያ ፓምፕ',
    name_om: 'Paampii Bishaanii Gamoo Dhedheeraa',
    name_ti: 'ናይ ልዑላት ህንጻታት ናይ ማይ ደፋኢ ፓምፕ',
    name_sid: 'High-rise booster paampe',
    name_ar: 'مضخة متعددة المراحل لتعزيز ضغط المياه في الأبراج',
    description_en: 'Vertical multi-stage stainless steel booster pump delivering high head water supply for commercial towers.',
    description_am: 'ረዣዥም ህንፃዎች ድረስ ውሃ በከፍተኛ ግፊት ለማድረስ የሚያስችል አይዝጌ ብረት ፓምፕ።',
    image_url: 'assets/images/p.jpg',
    price: 195000.00,
    category: 'Pumps',
    model: 'RCB-VMS-80',
    brand: 'RACROB',
    specifications: { "Head": "160m", "Stages": "8 Stage Stainless", "Max Pressure": "25 Bar", "Motor": "Three-Phase 15kW" },
    featured: true,
    sort_order: 7,
    is_active: true
  },
  {
    id: 'prod-8',
    name_en: 'Deep Well Submersible Solar & Electric Pump',
    name_am: 'የጥልቅ ጉድጓድ የፀሐይ እና የኤሌክትሪክ የውሃ ፓምፕ',
    name_om: 'Paampii Bishaanii Boolla Gad-fagoo Aduu fi Elektirikii',
    name_ti: 'ናይ መዓሙቕ ዒላ ናይ ፀሓይን ኤሌክትሪክን ማይ ፓምፕ',
    name_sid: 'Solar & electric boolla paampe',
    name_ar: 'مضخة غاطسة للآبار الارتوازية تعمل بالطاقة الشمسية والكهرباء',
    description_en: 'Heavy-duty borehole submersible pump suitable for remote farms, community water supplies, and solar systems.',
    description_am: 'ለመጠጥ ውሃ እና ለእርሻ የሚያገለግል የጥልቅ ጉድጓድ ሰመጥ ፓምፕ።',
    image_url: 'assets/images/i.jpg',
    price: 128000.00,
    category: 'Submersible',
    model: 'RCB-SUB-400',
    brand: 'RACROB',
    specifications: { "Immersion Depth": "Up to 250m", "Discharge": "3 inch", "Power Source": "Dual AC / Solar DC", "Body": "AISI 304 Stainless" },
    featured: false,
    sort_order: 8,
    is_active: true
  }
];

export async function getProducts({
  category = 'all',
  search = '',
  page = 1,
  limit = 12,
  onlyActive = true
} = {}) {
  const sb = getSupabase();

  if (!sb) {
    let filtered = [...INITIAL_PRODUCTS];
    if (onlyActive) filtered = filtered.filter((p) => p.is_active);
    if (category && category !== 'all') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          (p.name_am && p.name_am.includes(q)) ||
          (p.model && p.model.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);
    return {
      products: items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  try {
    let query = sb.from('products').select('*', { count: 'exact' });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    if (category && category !== 'all') {
      query = query.ilike('category', category);
    }
    if (search && search.trim() !== '') {
      query = query.or(
        `name_en.ilike.%${search}%,model.ilike.%${search}%,category.ilike.%${search}%`
      );
    }

    query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return {
      products: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit) || 1
    };
  } catch (err) {
    console.error('Error fetching products from Supabase:', err);
    return {
      products: INITIAL_PRODUCTS.slice(0, limit),
      total: INITIAL_PRODUCTS.length,
      page: 1,
      totalPages: 1
    };
  }
}

export async function getProductById(id) {
  const sb = getSupabase();
  if (!sb) {
    return INITIAL_PRODUCTS.find((p) => p.id === id) || INITIAL_PRODUCTS[0];
  }

  try {
    const { data, error } = await sb.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error fetching product ${id}:`, err);
    return INITIAL_PRODUCTS.find((p) => p.id === id) || null;
  }
}

export async function saveProduct(productData) {
  const sb = getSupabase();
  if (!sb) return { success: true };

  if (productData.id && !productData.id.startsWith('prod-')) {
    const { data, error } = await sb
      .from('products')
      .update(productData)
      .eq('id', productData.id)
      .select();
    if (error) throw error;
    return data[0];
  } else {
    delete productData.id;
    const { data, error } = await sb.from('products').insert(productData).select();
    if (error) throw error;
    return data[0];
  }
}

export async function deleteProduct(id) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ----------------------------------------------------------------
// 4. APPLICATIONS
// Mobile constraint: 2 columns, 2 rows (4 applications initially)
// ----------------------------------------------------------------
const INITIAL_APPLICATIONS = [
  {
    id: 'app-1',
    name_en: 'Agricultural Irrigation & Farm Water Supply',
    name_am: 'የግብርና መስኖ እና የእርሻ ውሃ አቅርቦት',
    name_om: 'Bishaan Qonnaa fi Misooma Masnoo',
    name_ti: 'ናይ ሕርሻ መስኖን ማይ ቀረብን',
    name_sid: 'Qottote wosonshunna masno',
    name_ar: 'الري الزراعي وإمدادات مياه المزارع والمحاصيل',
    description_en: 'High-capacity centrifugal and submersible pumps delivering continuous water flow across large agricultural fields and drip irrigation networks.',
    description_am: 'ለትላልቅ እርሻዎች እና የመስኖ መስመሮች አስተማማኝ የሆነ የውሃ ፍሰት የሚሰጡ ፓምፖች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/o.jpg',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'app-2',
    name_en: 'Construction & Dewatering Operations',
    name_am: 'የግንባታ ስራ እና የቆሸሸ ውሃ ማስወገድ',
    name_om: 'Ijaarsa fi Bishaan Boollaa Keessaa Baasuu',
    name_ti: 'ናይ ህንጻ ስራሕን ማይ ምውጻእን',
    name_sid: 'Ijaarsunna waate baasa',
    name_ar: 'عمليات البناء ونزح المياه الجوفية من مواقع العمل',
    description_en: 'Heavy-duty self-priming slurry and trash pumps designed to drain excavated basements, trenches, and construction zones quickly.',
    description_am: 'የግንባታ ጉድጓዶችን እና ምድር ቤቶችን በፍጥነት ለማድረቅ የሚያገለግሉ ጠንካራ ፓምፖች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/u.jpg',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'app-3',
    name_en: 'Commercial High-Rise & Real Estate Water Systems',
    name_am: 'የንግድ ህንፃዎች እና የሪል እስቴት የውሃ ስርዓት',
    name_om: 'Bishaan Gamoo Daldalaa fi Qabeenya Dhaabbataa',
    name_ti: 'ናይ ንግዲ ህንጻታትን ሪል እስቴትን ማይ ስርዓት',
    name_sid: 'Gamote lowo buuxote loosubba',
    name_ar: 'أنظمة إمداد وضغط المياه للأبراج التجارية والمجمعات السكنية',
    description_en: 'Automated constant-pressure booster pumps and hydro-pneumatic systems maintaining uniform water pressure on every building floor.',
    description_am: 'በሁሉም የህንፃው ወለሎች ላይ ወጥ የሆነ የውሃ ግፊት የሚሰጡ ዘመናዊ የፓምፕ ስርዓቶች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/p.jpg',
    sort_order: 3,
    is_active: true
  },
  {
    id: 'app-4',
    name_en: 'Municipal Pipeline Distribution & Bulk Water Works',
    name_am: 'የከተማ የውሃ ማከፋፈያ መስመሮች እና ዋና አውታሮች',
    name_om: 'Sirna Raabsaa Bishaanii Magaalaa',
    name_ti: 'ናይ ከተማ ማይ መከፋፈሊ መትረባት',
    name_sid: 'Magaalote buuxote doogo',
    name_ar: 'شبكات توزيع مياه الشرب للمدن والمشاريع البلدية الكبرى',
    description_en: 'High-efficiency inline split-case pumps and ductile iron fittings engineered for public utilities, treatment plants, and reservoirs.',
    description_am: 'ለከተሞች እና ለማዘጋጃ ቤቶች የመጠጥ ውሃ ማከፋፈያ የሚሆኑ ግዙፍ ፓምፖች እና መገጣጠሚያዎች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/r.jpg',
    sort_order: 4,
    is_active: true
  },
  {
    id: 'app-5',
    name_en: 'Residential Boosting & Clean Domestic Water',
    name_am: 'ለመኖሪያ ቤቶች የውሃ ግፊት ማሳደጊያ ፓምፖች',
    name_om: 'Bishaan Mana Jireenyaa fi Dhiibbaa Dabaluu',
    name_ti: 'ናይ መንበሪ ኣባይቲ ማይ ጸቕጢ መዕበዪ',
    name_sid: 'Minoote buuxote paampubba',
    name_ar: 'تعزيز ضغط المياه المنزلية والاستخدامات السكنية النظيفة',
    description_en: 'Quiet, compact, energy-efficient booster pumps ensuring strong shower and tap pressure even with low municipal line pressure.',
    description_am: 'የመኖሪያ ቤቶችን የውሃ ግፊት የሚጨምሩ ድምፅ አልባ እና ዘመናዊ ፓምፖች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/w.jpg',
    sort_order: 5,
    is_active: true
  },
  {
    id: 'app-6',
    name_en: 'Bulk Water Measurement & Mainline Monitoring',
    name_am: 'የጅምላ ውሃ ፍሰት መቆጣጠሪያ እና የመስመር ክትትል',
    name_om: 'Hordoffii fi Safara Ya’aa Bishaanii',
    name_ti: 'ናይ ጅምላ ማይ ቁጽጽርን ምክትታልን',
    name_sid: 'Safartote wosonsho looso',
    name_ar: 'قياس التدفق والتحكم في خطوط النقل الرئيسية',
    description_en: 'Flanged turbine Woltman meters and telemetry integration enabling precise billing, leak tracking, and water loss reduction.',
    description_am: 'የውሃ ብክነትን ለመቀነስ እና ፍሰትን በትክክል ለመለካት የሚያስችሉ ቆጣሪዎች።',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail_url: 'assets/images/t.jpg',
    sort_order: 6,
    is_active: true
  }
];

export async function getApplications(onlyActive = true, limit = null) {
  const sb = getSupabase();
  if (!sb) {
    let list = onlyActive ? INITIAL_APPLICATIONS.filter((a) => a.is_active) : INITIAL_APPLICATIONS;
    if (limit) list = list.slice(0, limit);
    return list;
  }

  try {
    let query = sb.from('applications').select('*').order('sort_order', { ascending: true });
    if (onlyActive) query = query.eq('is_active', true);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let list = onlyActive ? INITIAL_APPLICATIONS.filter((a) => a.is_active) : INITIAL_APPLICATIONS;
      if (limit) list = list.slice(0, limit);
      return list;
    }
    return data;
  } catch (err) {
    console.error('Error fetching applications:', err);
    let list = onlyActive ? INITIAL_APPLICATIONS.filter((a) => a.is_active) : INITIAL_APPLICATIONS;
    if (limit) list = list.slice(0, limit);
    return list;
  }
}

export async function saveApplication(appData) {
  const sb = getSupabase();
  if (!sb) return { success: true };

  if (appData.id && !appData.id.startsWith('app-')) {
    const { data, error } = await sb
      .from('applications')
      .update(appData)
      .eq('id', appData.id)
      .select();
    if (error) throw error;
    return data[0];
  } else {
    delete appData.id;
    const { data, error } = await sb.from('applications').insert(appData).select();
    if (error) throw error;
    return data[0];
  }
}

export async function deleteApplication(id) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.from('applications').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ----------------------------------------------------------------
// 5. ORDERS & PAYMENT RECEIPTS
// ----------------------------------------------------------------
export async function submitPaymentOrder({
  productId,
  productName,
  customerName,
  phone,
  receiptFile,
  note = ''
}) {
  const sb = getSupabase();

  if (!sb) {
    // Demonstration/offline mock record
    return {
      success: true,
      message: 'Your payment receipt has been submitted and is awaiting confirmation.'
    };
  }

  // 1. Upload receipt file to private storage bucket 'payment-receipts'
  let receiptUrl = '';
  if (receiptFile) {
    const fileExt = receiptFile.name.split('.').pop();
    const collisionSafeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `receipts/${collisionSafeName}`;

    const { data: uploadData, error: uploadErr } = await sb.storage
      .from('payment-receipts')
      .upload(filePath, receiptFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      throw new Error('Failed to upload payment receipt. Please check file format and try again.');
    }
    receiptUrl = filePath;
  } else {
    throw new Error('Please select your payment deposit receipt to upload.');
  }

  // 2. Insert order record into database with status 'pending'
  const { data, error } = await sb.from('orders').insert([
    {
      product_id: productId || null,
      product_name: productName,
      customer_name: customerName,
      phone: phone,
      receipt_url: receiptUrl,
      note: note,
      status: 'pending'
    }
  ]).select();

  if (error) {
    console.error('Database order insert error:', error);
    throw new Error('Could not submit payment order. Please verify your connection.');
  }

  return { success: true, data: data[0] };
}

export async function getOrders() {
  const sb = getSupabase();
  if (!sb) {
    return [
      {
        id: 'ord-demo-1',
        product_name: 'Commercial High-Flow Booster Pump',
        customer_name: 'Alemayehu Tadesse',
        phone: '0911223344',
        receipt_url: 'receipts/sample_cbe_slip.jpg',
        note: 'Urgent delivery for hotel project in Bole',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'ord-demo-2',
        product_name: 'Industrial Woltman Bulk Water Meter (DN350)',
        customer_name: 'Dr. Girma Wolde',
        phone: '0922446688',
        receipt_url: 'receipts/sample_transfer.pdf',
        note: 'For irrigation intake line',
        status: 'approved',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId, status) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { data, error } = await sb.from('orders').update({ status }).eq('id', orderId).select();
  if (error) throw error;
  return data[0];
}

export async function deleteOrder(orderId) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.from('orders').delete().eq('id', orderId);
  if (error) throw error;
  return { success: true };
}

// Generate secure signed URL for admin to view private receipts
export async function getReceiptSignedUrl(receiptPath) {
  const sb = getSupabase();
  if (!sb) return 'assets/images/u.jpg'; // fallback preview

  const { data, error } = await sb.storage
    .from('payment-receipts')
    .createSignedUrl(receiptPath, 600); // 10 minutes expiry

  if (error || !data) return null;
  return data.signedUrl;
}

// ----------------------------------------------------------------
// 6. BOOKINGS / CONSULTATIONS
// ----------------------------------------------------------------
export async function submitBooking({
  customerName,
  phone,
  email = '',
  preferredDate,
  preferredTime,
  serviceType,
  message = ''
}) {
  const sb = getSupabase();
  const referenceCode = generateReferenceCode();

  if (!sb) {
    return {
      success: true,
      referenceCode,
      message: 'Booking consultation scheduled successfully.'
    };
  }

  const { data, error } = await sb.from('bookings').insert([
    {
      reference_code: referenceCode,
      customer_name: customerName,
      phone: phone,
      email: email,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      service_type: serviceType,
      message: message,
      status: 'pending'
    }
  ]).select();

  if (error) {
    console.error('Supabase booking error:', error);
    throw new Error('Your booking could not be submitted. Please check your connection.');
  }

  return { success: true, referenceCode, data: data[0] };
}

export async function getBookings() {
  const sb = getSupabase();
  if (!sb) {
    return [
      {
        id: 'book-demo-1',
        reference_code: 'RCB-8F2K1',
        customer_name: 'Eng. Solomon Kebede',
        phone: '0912345678',
        email: 'solomon@construct.et',
        preferred_date: '2026-10-12',
        preferred_time: '10:00 AM',
        service_type: 'Installation & Pipeline Engineering',
        message: 'Need sizing for 8-story commercial building pump riser',
        status: 'pending',
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'book-demo-2',
        reference_code: 'RCB-9W3L7',
        customer_name: 'Betelehem Tesfaye',
        phone: '0944556677',
        email: 'betty@agro.com',
        preferred_date: '2026-10-15',
        preferred_time: '2:30 PM',
        service_type: 'Pump Selection & Flow Sizing',
        message: 'Farm irrigation submersible pump inquiry for 50 hectares',
        status: 'approved',
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];
  }

  const { data, error } = await sb.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateBookingStatus(bookingId, status) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { data, error } = await sb.from('bookings').update({ status }).eq('id', bookingId).select();
  if (error) throw error;
  return data[0];
}

export async function deleteBooking(bookingId) {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.from('bookings').delete().eq('id', bookingId);
  if (error) throw error;
  return { success: true };
}

// ----------------------------------------------------------------
// 7. AUTHENTICATION & ADMIN ROLES
// ----------------------------------------------------------------
export async function loginAdmin(email, password) {
  const sb = getSupabase();
  if (!sb) {
    // Demonstration fallback for local preview if Supabase is not yet connected
    if (email === 'admin@racrob.et' && password === 'admin123') {
      localStorage.setItem('racrob_demo_admin_auth', 'true');
      return { success: true, user: { email, role: 'admin' } };
    }
    throw new Error('Supabase not connected. To test locally, use admin@racrob.et / admin123 or configure js/config.js with your Supabase credentials.');
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verify that the user has admin role in profiles table
  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileErr || !profile || profile.role !== 'admin') {
    await sb.auth.signOut();
    throw new Error('Access denied. This account does not possess administrator privileges.');
  }

  return { success: true, user: data.user, profile };
}

export async function getCurrentAdmin() {
  const sb = getSupabase();
  if (!sb) {
    if (localStorage.getItem('racrob_demo_admin_auth') === 'true') {
      return { email: 'admin@racrob.et', role: 'admin' };
    }
    return null;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session || !session.user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return { ...session.user, ...profile };
}

export async function logoutAdmin() {
  const sb = getSupabase();
  localStorage.removeItem('racrob_demo_admin_auth');
  if (sb) {
    await sb.auth.signOut();
  }
}

export async function updateAdminEmail(newEmail) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const { data, error } = await sb.auth.updateUser({ email: newEmail });
  if (error) throw error;
  return data;
}

export async function updateAdminPassword(newPassword) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const { data, error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------
// 8. STORAGE ASSET UPLOADS (Products, Slides, Thumbnails)
// ----------------------------------------------------------------
export async function uploadPublicAsset(bucket, file, folder = '') {
  const sb = getSupabase();
  if (!sb) {
    // Return relative object URL if offline
    return URL.createObjectURL(file);
  }

  const fileExt = file.name.split('.').pop();
  const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = folder ? `${folder}/${safeName}` : safeName;

  const { data, error } = await sb.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(filePath);
  return urlData.publicUrl;
}
