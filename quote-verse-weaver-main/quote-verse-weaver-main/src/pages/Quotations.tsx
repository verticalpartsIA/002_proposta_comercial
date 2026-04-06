import { useState, useEffect } from "react";
import { Clock, Search, Loader2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", quoting: "Em Cotação",
  ai_analysis: "Análise IA", closed: "Fechado", cancelled: "Cancelado", auto_closed: "Encerrado",
};
const statusColors: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400",
  quoting: "bg-primary/20 text-primary",
  ai_analysis: "bg-purple-500/20 text-purple-400",
  closed: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
  auto_closed: "bg-secondary text-muted-foreground",
};

interface RFQ {
  id: string;
  code: string;
  title: string;
  status: string;
  quantity: number;
  deadline: string | null;
  created_at: string;
  suppliersCount: number;
  quotesReceived: number;
  quotations: Quotation[];
}

interface Quotation {
  id: string;
  cot_code: string;
  unit_price: number;
  currency: string;
  incoterm: string | null;
  score: number | null;
  received_at: string;
  supplier_name: string;
  supplier_flag: string;
}

const statuses = ["all", "draft", "sent", "quoting", "ai_analysis", "closed", "cancelled"];
const statusAllLabels: Record<string, string> = { all: "Todas", ...statusLabels };

export default function Quotations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      // Fetch all RFQs for this user
      const { data: rfqData } = await supabase
        .from("rfqs")
        .select("id, code, title, status, quantity, deadline, created_at")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });

      if (!rfqData || rfqData.length === 0) {
        setRfqs([]);
        setLoading(false);
        return;
      }

      const rfqIds = rfqData.map(r => r.id);

      // Fetch rfq_suppliers for supplier counts and tokens
      const { data: rfqSuppliers } = await supabase
        .from("rfq_suppliers")
        .select("id, rfq_id, supplier_id")
        .in("rfq_id", rfqIds);

      // Fetch suppliers info
      const supplierIds = [...new Set((rfqSuppliers ?? []).map(s => s.supplier_id))];
      const { data: suppliersData } = supplierIds.length > 0
        ? await supabase.from("suppliers").select("id, name, flag").in("id", supplierIds)
        : { data: [] };

      const supplierMap: Record<string, { name: string; flag: string }> = {};
      (suppliersData ?? []).forEach(s => { supplierMap[s.id] = { name: s.name, flag: s.flag ?? "" }; });

      // Fetch quotations for these rfqs
      const rfqSupplierIds = (rfqSuppliers ?? []).map(s => s.id);
      const { data: quotationsData } = rfqSupplierIds.length > 0
        ? await supabase
            .from("quotations")
            .select("id, cot_code, unit_price, currency, incoterm, score, received_at, rfq_id, rfq_supplier_id")
            .in("rfq_id", rfqIds)
            .order("received_at", { ascending: false })
        : { data: [] };

      // Build rfq_supplier_id → supplier_id map
      const rsSupplierMap: Record<string, string> = {};
      (rfqSuppliers ?? []).forEach(rs => { rsSupplierMap[rs.id] = rs.supplier_id; });

      // Assemble RFQ list
      const assembled: RFQ[] = rfqData.map(rfq => {
        const mySuppliers = (rfqSuppliers ?? []).filter(s => s.rfq_id === rfq.id);
        const myQuotations = (quotationsData ?? []).filter(q => q.rfq_id === rfq.id);

        const quotations: Quotation[] = myQuotations.map(q => {
          const suppId = rsSupplierMap[q.rfq_supplier_id] ?? "";
          const supp = supplierMap[suppId] ?? { name: "–", flag: "" };
          return {
            id: q.id,
            cot_code: q.cot_code,
            unit_price: parseFloat(q.unit_price),
            currency: q.currency,
            incoterm: q.incoterm,
            score: q.score,
            received_at: q.received_at,
            supplier_name: supp.name,
            supplier_flag: supp.flag,
          };
        });

        return {
          ...rfq,
          suppliersCount: mySuppliers.length,
          quotesReceived: myQuotations.length,
          quotations,
        };
      });

      setRfqs(assembled);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = rfqs.filter(rfq => {
    if (statusFilter !== "all" && rfq.status !== statusFilter) return false;
    if (search && !rfq.title.toLowerCase().includes(search.toLowerCase()) && !rfq.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minhas Cotações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie todas as suas requisições de cotação</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 flex-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por código ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] font-semibold whitespace-nowrap ${statusFilter === s ? "" : "text-muted-foreground"}`}
            >
              {statusAllLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* RFQ Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 space-y-2">
            <Package className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhuma RFQ encontrada</p>
            <Link to="/new-rfq" className="text-xs text-primary hover:underline">Criar primeira RFQ →</Link>
          </div>
        )}

        {filtered.map((rfq) => (
          <div key={rfq.id} className="glass-card rounded-xl overflow-hidden hover:border-primary/20 transition-all">
            <div
              className="flex items-start justify-between gap-4 p-5 cursor-pointer"
              onClick={() => setExpanded(expanded === rfq.id ? null : rfq.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary">{rfq.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[rfq.status] ?? ""}`}>
                    {statusLabels[rfq.status] ?? rfq.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground truncate">{rfq.title}</h3>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Qtd: {rfq.quantity?.toLocaleString()} un</span>
                  <span className="text-[10px] text-muted-foreground">
                    {rfq.quotesReceived}/{rfq.suppliersCount} cotações recebidas
                  </span>
                  {rfq.deadline && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(rfq.deadline).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Best quote preview */}
                {rfq.quotations.length > 0 && (
                  <div className="hidden lg:flex flex-col items-end gap-1">
                    {rfq.quotations.slice(0, 2).map((q) => (
                      <div key={q.id} className="flex items-center gap-2 text-[10px]">
                        <span>{q.supplier_flag}</span>
                        <span className="text-muted-foreground font-mono">{q.currency} {q.unit_price.toFixed(2)}</span>
                        {q.score && (
                          <span className={`font-bold ${q.score >= 90 ? "text-green-400" : q.score >= 80 ? "text-primary" : "text-yellow-400"}`}>
                            {q.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {rfq.quotations.length > 0
                  ? expanded === rfq.id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  : null
                }
              </div>
            </div>

            {/* Expanded quotations */}
            {expanded === rfq.id && rfq.quotations.length > 0 && (
              <div className="border-t border-border/30">
                <div className="px-5 py-2 bg-secondary/20">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cotações Recebidas</p>
                </div>
                <div className="divide-y divide-border/20">
                  {rfq.quotations.map((q, idx) => (
                    <div key={q.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">#{idx + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{q.supplier_flag}</span>
                            <span className="text-xs font-semibold text-foreground">{q.supplier_name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">{q.cot_code} · {q.incoterm ?? "–"} · {new Date(q.received_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{q.currency} {q.unit_price.toFixed(4)}</p>
                        </div>
                        {q.score && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${q.score >= 90 ? "bg-green-500/20 text-green-400" : q.score >= 80 ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {q.score}/100
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
