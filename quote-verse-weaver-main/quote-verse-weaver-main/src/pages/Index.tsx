import { useEffect, useState } from "react";
import { FileText, Users, TrendingUp, Clock, ArrowUpRight, Package, Loader2 } from "lucide-react";
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

const KPICard = ({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string | number; subtitle: string; icon: React.ElementType; trend?: string;
}) => (
  <div className="glass-card rounded-xl p-5 animate-fade-in">
    <div className="flex items-start justify-between mb-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {trend && <span className="text-[10px] font-semibold text-green-400 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{trend}</span>}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
    <p className="text-[10px] text-muted-foreground/60 mt-1">{subtitle}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [suppliersCount, setSuppliersCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [rfqRes, cotRes, supRes] = await Promise.all([
        supabase.from("rfqs").select("id, code, title, status, quantity, deadline, created_at").eq("created_by", user!.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("quotations").select("id, cot_code, unit_price, currency, incoterm, score, received_at, rfq_id, rfq_supplier_id").order("received_at", { ascending: false }).limit(5),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
      ]);
      setRfqs(rfqRes.data ?? []);
      setQuotations(cotRes.data ?? []);
      setSuppliersCount(supRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [user]);

  const activeRFQs = rfqs.filter(r => ["sent", "quoting", "ai_analysis"].includes(r.status));
  const scoredQuotes = quotations.filter(q => q.score);
  const avgScore = scoredQuotes.length > 0
    ? Math.round(scoredQuotes.reduce((a, q) => a + q.score, 0) / scoredQuotes.length) : 0;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral das suas cotações e fornecedores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="RFQs Ativas" value={activeRFQs.length} subtitle="Em andamento agora" icon={FileText} />
        <KPICard title="Cotações Recebidas" value={quotations.length} subtitle="Total acumulado" icon={TrendingUp} />
        <KPICard title="Fornecedores" value={suppliersCount} subtitle="Cadastrados na base" icon={Users} />
        <KPICard title="Score Médio IA" value={avgScore > 0 ? `${avgScore}/100` : "–"} subtitle="Qualidade das cotações" icon={Package} />
      </div>

      {/* RFQs Recentes */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <h2 className="text-sm font-bold text-foreground">RFQs Recentes</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Últimas requisições de cotação</p>
          </div>
          <Link to="/quotations" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">Ver todas →</Link>
        </div>
        {rfqs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma RFQ criada ainda. <Link to="/new-rfq" className="text-primary hover:underline">Criar primeira RFQ →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {["Código", "Produto", "Status", "Prazo"].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rfqs.map(rfq => (
                  <tr key={rfq.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3"><span className="text-xs font-bold text-primary">{rfq.code}</span></td>
                    <td className="px-5 py-3"><span className="text-xs font-medium text-foreground">{rfq.title}</span></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[rfq.status] ?? ""}`}>
                        {statusLabels[rfq.status] ?? rfq.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString("pt-BR") : "–"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Últimas Cotações */}
      {quotations.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h2 className="text-sm font-bold text-foreground">Últimas Cotações Recebidas</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Respostas dos fornecedores</p>
          </div>
          <div className="divide-y divide-border/20">
            {quotations.map(q => (
              <div key={q.id} className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-foreground font-mono">{q.cot_code}</p>
                  <p className="text-[10px] text-muted-foreground">{q.incoterm ?? "–"} · {new Date(q.received_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{q.currency} {parseFloat(q.unit_price).toFixed(2)}</p>
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
  );
}
