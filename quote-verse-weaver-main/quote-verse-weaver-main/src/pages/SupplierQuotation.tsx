import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, CheckCircle, Package, Globe, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RFQDetails {
  id: string;
  code: string;
  title: string;
  description: string | null;
  color: string | null;
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  certifications: string | null;
  packaging: string | null;
  usage_context: string | null;
  quantity: number;
  currency: string;
  deadline: string | null;
}

interface SupplierInfo {
  id: string;
  name: string;
  country: string;
  flag: string;
}

const emptyForm = {
  unit_price: "",
  currency: "USD",
  moq: "1",
  production_days: "",
  delivery_days: "",
  incoterm: "",
  validity_days: "30",
  freight_cost: "0",
  observations: "",
};

export default function SupplierQuotation() {
  const { token } = useParams<{ token: string }>();
  const [rfq, setRfq] = useState<RFQDetails | null>(null);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [rfqSupplierId, setRfqSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    async function loadData() {
      if (!token) { setError("Link inválido."); setLoading(false); return; }

      const { data: rfqSupplier, error: err } = await supabase
        .from("rfq_suppliers")
        .select("id, rfq_id, supplier_id")
        .eq("secure_token", token)
        .single();

      if (err || !rfqSupplier) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      setRfqSupplierId(rfqSupplier.id);

      // Verificar se já respondeu
      const { data: existing } = await supabase
        .from("quotations")
        .select("id")
        .eq("rfq_supplier_id", rfqSupplier.id)
        .single();

      if (existing) { setSubmitted(true); setLoading(false); return; }

      // Buscar detalhes da RFQ
      const { data: rfqData } = await supabase
        .from("rfqs")
        .select("id, code, title, description, color, material, dimensions, weight, certifications, packaging, usage_context, quantity, currency, deadline")
        .eq("id", rfqSupplier.rfq_id)
        .single();

      // Buscar dados do fornecedor
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("id, name, country, flag")
        .eq("id", rfqSupplier.supplier_id)
        .single();

      setRfq(rfqData);
      setSupplier(supplierData);
      if (rfqData) setForm(f => ({ ...f, currency: rfqData.currency }));
      setLoading(false);
    }
    loadData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfq || !rfqSupplierId) return;
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) {
      alert("Informe o preço unitário."); return;
    }
    if (!form.production_days || !form.delivery_days) {
      alert("Informe os prazos de produção e entrega."); return;
    }
    if (!form.incoterm) { alert("Selecione o Incoterm."); return; }

    setSubmitting(true);
    try {
      const { data: codeData } = await supabase.rpc("generate_cot_code");

      const { error } = await supabase.from("quotations").insert({
        rfq_id: rfq.id,
        rfq_supplier_id: rfqSupplierId,
        cot_code: codeData as string,
        unit_price: parseFloat(form.unit_price),
        currency: form.currency,
        moq: parseInt(form.moq) || 1,
        production_days: parseInt(form.production_days) || null,
        delivery_days: parseInt(form.delivery_days) || null,
        incoterm: form.incoterm,
        validity_days: parseInt(form.validity_days) || 30,
        freight_cost: parseFloat(form.freight_cost) || 0,
        observations: form.observations || null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      alert("Erro ao enviar cotação: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <FileText className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Link Inválido</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Cotação Enviada!</h2>
        <p className="text-sm text-muted-foreground">Sua proposta foi recebida com sucesso. A VerticalParts irá analisá-la e entrará em contato.</p>
        <p className="text-xs text-muted-foreground">Você pode fechar esta página.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">VP Quotation</h1>
              <p className="text-xs text-muted-foreground">VerticalParts · Solicitação de Cotação</p>
            </div>
          </div>
          {supplier && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <span className="text-xl">{supplier.flag}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {supplier.country}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Detalhes do produto */}
        {rfq && (
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Produto Solicitado</h2>
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{rfq.code}</span>
            </div>
            <h3 className="text-base font-semibold text-foreground">{rfq.title}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {rfq.quantity && <div><span className="text-muted-foreground">Quantidade:</span> <span className="font-medium text-foreground">{rfq.quantity.toLocaleString()} unidades</span></div>}
              {rfq.material && <div><span className="text-muted-foreground">Material:</span> <span className="font-medium text-foreground">{rfq.material}</span></div>}
              {rfq.color && <div><span className="text-muted-foreground">Cor:</span> <span className="font-medium text-foreground">{rfq.color}</span></div>}
              {rfq.dimensions && <div><span className="text-muted-foreground">Dimensões:</span> <span className="font-medium text-foreground">{rfq.dimensions}</span></div>}
              {rfq.weight && <div><span className="text-muted-foreground">Peso:</span> <span className="font-medium text-foreground">{rfq.weight}</span></div>}
              {rfq.certifications && <div><span className="text-muted-foreground">Certificações:</span> <span className="font-medium text-foreground">{rfq.certifications}</span></div>}
              {rfq.packaging && <div><span className="text-muted-foreground">Embalagem:</span> <span className="font-medium text-foreground">{rfq.packaging}</span></div>}
              {rfq.deadline && <div><span className="text-muted-foreground">Prazo de resposta:</span> <span className="font-medium text-foreground">{new Date(rfq.deadline).toLocaleDateString("pt-BR")}</span></div>}
            </div>
            {rfq.usage_context && (
              <div className="p-3 rounded-lg bg-secondary/40 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Uso previsto: </span>{rfq.usage_context}
              </div>
            )}
          </div>
        )}

        {/* Formulário de cotação */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-foreground">Sua Proposta</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Preço Unitário *</Label>
                <Input type="number" step="0.0001" value={form.unit_price} onChange={set("unit_price")} placeholder="0.0000" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moeda</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">MOQ (Qtd Mínima) *</Label>
                <Input type="number" value={form.moq} onChange={set("moq")} className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Incoterm *</Label>
                <Select value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXW">EXW</SelectItem>
                    <SelectItem value="FOB">FOB</SelectItem>
                    <SelectItem value="CIF">CIF</SelectItem>
                    <SelectItem value="CFR">CFR</SelectItem>
                    <SelectItem value="DDP">DDP</SelectItem>
                    <SelectItem value="DAP">DAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de Produção (dias) *</Label>
                <Input type="number" value={form.production_days} onChange={set("production_days")} placeholder="Ex: 30" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de Entrega (dias) *</Label>
                <Input type="number" value={form.delivery_days} onChange={set("delivery_days")} placeholder="Ex: 45" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Custo de Frete ({form.currency})</Label>
                <Input type="number" step="0.01" value={form.freight_cost} onChange={set("freight_cost")} placeholder="0.00" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Validade da Proposta (dias)</Label>
                <Input type="number" value={form.validity_days} onChange={set("validity_days")} className="bg-secondary/50 border-border/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.observations} onChange={set("observations")} placeholder="Condições especiais, amostras disponíveis, certificados disponíveis..." className="bg-secondary/50 border-border/50 min-h-[80px]" />
            </div>
            <Button type="submit" className="w-full font-bold gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar Cotação
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground pb-4">
          VerticalParts · Plataforma de Cotação Internacional · suporte@vpsistema.com
        </p>
      </div>
    </div>
  );
}
