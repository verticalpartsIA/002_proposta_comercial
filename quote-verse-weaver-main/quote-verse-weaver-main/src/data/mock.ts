export interface Supplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  email: string;
  language: string;
  rating: number;
  totalQuotes: number;
}

export interface RFQItem {
  id: string;
  code: string;
  title: string;
  status: "draft" | "sent" | "quoting" | "ai_analysis" | "closed" | "cancelled" | "auto_closed";
  createdAt: string;
  deadline: string;
  suppliersCount: number;
  quotesReceived: number;
  currency: string;
  quantity: number;
  category: string;
}

export interface Quotation {
  id: string;
  rfqCode: string;
  cotCode: string;
  supplierName: string;
  supplierCountry: string;
  supplierFlag: string;
  unitPrice: number;
  currency: string;
  moq: number;
  productionDays: number;
  deliveryDays: number;
  incoterm: string;
  validityDays: number;
  freightCost: number;
  score: number | null;
  receivedAt: string;
}

export const mockSuppliers: Supplier[] = [
  { id: "s1", name: "Shenzhen Yutong Electronics", country: "China", flag: "🇨🇳", email: "sales@yutong.cn", language: "zh", rating: 4.5, totalQuotes: 34 },
  { id: "s2", name: "Tokyo Precision Parts Co.", country: "Japan", flag: "🇯🇵", email: "info@tokyoparts.jp", language: "ja", rating: 4.8, totalQuotes: 12 },
  { id: "s3", name: "Milano Design Components", country: "Italy", flag: "🇮🇹", email: "vendite@milanodc.it", language: "it", rating: 4.2, totalQuotes: 8 },
  { id: "s4", name: "Seoul Tech Manufacturing", country: "South Korea", flag: "🇰🇷", email: "export@seoultech.kr", language: "ko", rating: 4.6, totalQuotes: 21 },
  { id: "s5", name: "Gujarat Industrial Supplies", country: "India", flag: "🇮🇳", email: "sales@gujaratind.in", language: "en", rating: 4.0, totalQuotes: 15 },
  { id: "s6", name: "Berlin Mechanik GmbH", country: "Germany", flag: "🇩🇪", email: "einkauf@berlinmech.de", language: "de", rating: 4.7, totalQuotes: 9 },
];

export const mockRFQs: RFQItem[] = [
  {
    id: "r1", code: "RFQ-2026-0042", title: "Conector Industrial IP67 - 12 Pinos",
    status: "quoting", createdAt: "2026-03-20", deadline: "2026-04-05",
    suppliersCount: 4, quotesReceived: 2, currency: "USD", quantity: 5000, category: "Conectores",
  },
  {
    id: "r2", code: "RFQ-2026-0041", title: "Carcaça em ABS para Módulo Eletrônico",
    status: "ai_analysis", createdAt: "2026-03-15", deadline: "2026-03-30",
    suppliersCount: 3, quotesReceived: 3, currency: "USD", quantity: 10000, category: "Plásticos",
  },
  {
    id: "r3", code: "RFQ-2026-0040", title: "Dissipador de Calor em Alumínio 6063",
    status: "closed", createdAt: "2026-03-10", deadline: "2026-03-25",
    suppliersCount: 5, quotesReceived: 4, currency: "USD", quantity: 2000, category: "Metais",
  },
  {
    id: "r4", code: "RFQ-2026-0039", title: "Parafuso M4x12 Aço Inox 304 - Cabeça Phillips",
    status: "sent", createdAt: "2026-03-22", deadline: "2026-04-10",
    suppliersCount: 6, quotesReceived: 0, currency: "USD", quantity: 50000, category: "Fixadores",
  },
  {
    id: "r5", code: "RFQ-2026-0038", title: "PCB Dupla Face FR4 - 100x80mm",
    status: "draft", createdAt: "2026-03-25", deadline: "2026-04-15",
    suppliersCount: 0, quotesReceived: 0, currency: "USD", quantity: 1000, category: "Eletrônicos",
  },
];

export const mockQuotations: Quotation[] = [
  {
    id: "q1", rfqCode: "RFQ-2026-0042", cotCode: "COT-2026-0081",
    supplierName: "Shenzhen Yutong Electronics", supplierCountry: "China", supplierFlag: "🇨🇳",
    unitPrice: 2.45, currency: "USD", moq: 5000, productionDays: 25, deliveryDays: 35,
    incoterm: "FOB", validityDays: 30, freightCost: 850, score: 91, receivedAt: "2026-03-23",
  },
  {
    id: "q2", rfqCode: "RFQ-2026-0042", cotCode: "COT-2026-0082",
    supplierName: "Seoul Tech Manufacturing", supplierCountry: "South Korea", supplierFlag: "🇰🇷",
    unitPrice: 3.10, currency: "USD", moq: 3000, productionDays: 18, deliveryDays: 28,
    incoterm: "CIF", validityDays: 15, freightCost: 0, score: 87, receivedAt: "2026-03-24",
  },
  {
    id: "q3", rfqCode: "RFQ-2026-0041", cotCode: "COT-2026-0078",
    supplierName: "Shenzhen Yutong Electronics", supplierCountry: "China", supplierFlag: "🇨🇳",
    unitPrice: 0.85, currency: "USD", moq: 10000, productionDays: 20, deliveryDays: 40,
    incoterm: "FOB", validityDays: 30, freightCost: 1200, score: 94, receivedAt: "2026-03-18",
  },
  {
    id: "q4", rfqCode: "RFQ-2026-0041", cotCode: "COT-2026-0079",
    supplierName: "Tokyo Precision Parts Co.", supplierCountry: "Japan", supplierFlag: "🇯🇵",
    unitPrice: 1.20, currency: "USD", moq: 5000, productionDays: 15, deliveryDays: 22,
    incoterm: "CIF", validityDays: 20, freightCost: 0, score: 88, receivedAt: "2026-03-19",
  },
  {
    id: "q5", rfqCode: "RFQ-2026-0041", cotCode: "COT-2026-0080",
    supplierName: "Milano Design Components", supplierCountry: "Italy", supplierFlag: "🇮🇹",
    unitPrice: 1.55, currency: "USD", moq: 8000, productionDays: 22, deliveryDays: 30,
    incoterm: "EXW", validityDays: 15, freightCost: 1800, score: 72, receivedAt: "2026-03-20",
  },
];

export const statusLabels: Record<RFQItem["status"], string> = {
  draft: "Rascunho",
  sent: "Enviado",
  quoting: "Em Cotação",
  ai_analysis: "Análise IA",
  closed: "Fechado",
  cancelled: "Cancelado",
  auto_closed: "Encerrado",
};

export const statusColors: Record<RFQItem["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/20 text-info",
  quoting: "bg-primary/20 text-primary",
  ai_analysis: "bg-purple-500/20 text-purple-400",
  closed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  auto_closed: "bg-muted text-muted-foreground",
};
