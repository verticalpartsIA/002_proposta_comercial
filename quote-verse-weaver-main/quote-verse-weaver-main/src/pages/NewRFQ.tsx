import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, FileText, Send, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Supplier { id: string; name: string; country: string; flag: string; rating: number | null; email: string; }

const emptyForm = {
  title: "", supplier_code: "", category: "", color: "", material: "",
  dimensions: "", weight: "", certifications: "", packaging: "", usage_context: "",
  quantity: "1", currency: "USD", deadline: "",
};

export default function NewRFQ() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.from("suppliers").select("id, name, country, flag, rating, email").order("name")
      .then(({ data }) => { setSuppliers(data ?? []); setLoadingSuppliers(false); });
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleSupplier = (id: string) =>
    setSelectedSuppliers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 6));
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
  };

  const uploadFiles = async (rfqId: string) => {
    const uploaded: string[] = [];
    for (const photo of photos) {
      const path = `rfqs/${rfqId}/${Date.now()}_${photo.name}`;
      const { error } = await supabase.storage.from("rfq-files").upload(path, photo);
      if (!error) uploaded.push(path);
    }
    if (pdfFile) {
      const path = `rfqs/${rfqId}/technical_${pdfFile.name}`;
      await supabase.storage.from("rfq-files").upload(path, pdfFile);
    }
    return uploaded;
  };

  const sendEmails = async (rfqId: string, rfqCode: string, suppliersSelected: Supplier[]) => {
    try {
      await fetch("https://cotacao-importacao.vpsistema.com/api/send_rfq_email.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_id: rfqId,
          rfq_code: rfqCode,
          product: form.title,
          suppliers: suppliersSelected.map(s => ({ id: s.id, name: s.name, email: s.email })),
          base_url: window.location.origin,
        }),
      });
    } catch (e) {
      console.warn("Email service unavailable:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Descrição do produto é obrigatória"); return; }
    if (!isDraft && selectedSuppliers.length === 0) { toast.error("Selecione ao menos 1 fornecedor"); return; }
    if (!isDraft && !form.deadline) { toast.error("Prazo limite é obrigatório"); return; }

    setSubmitting(true);
    try {
      // 1. Gerar código RFQ
      const { data: codeData } = await supabase.rpc("generate_rfq_code");
      const rfqCode = codeData as string;

      // 2. Inserir RFQ
      const { data: rfq, error: rfqError } = await supabase.from("rfqs").insert({
        code: rfqCode,
        title: form.title,
        supplier_code: form.supplier_code || null,
        category: form.category || null,
        color: form.color || null,
        material: form.material || null,
        dimensions: form.dimensions || null,
        weight: form.weight || null,
        certifications: form.certifications || null,
        packaging: form.packaging || null,
        usage_context: form.usage_context || null,
        quantity: parseInt(form.quantity) || 1,
        currency: form.currency,
        deadline: form.deadline || null,
        status: isDraft ? "draft" : "sent",
        created_by: user!.id,
      }).select().single();

      if (rfqError) throw rfqError;

      // 3. Upload de arquivos
      if (photos.length > 0 || pdfFile) await uploadFiles(rfq.id);

      // 4. Vincular fornecedores
      if (selectedSuppliers.length > 0) {
        const rfqSuppliers = selectedSuppliers.map(sid => ({ rfq_id: rfq.id, supplier_id: sid }));
        const { error: suppError } = await supabase.from("rfq_suppliers").insert(rfqSuppliers);
        if (suppError) throw suppError;
      }

      // 5. Enviar e-mails (apenas se não for rascunho)
      if (!isDraft && selectedSuppliers.length > 0) {
        const suppliersToEmail = suppliers.filter(s => selectedSuppliers.includes(s.id));
        await sendEmails(rfq.id, rfqCode, suppliersToEmail);
        toast.success(`RFQ ${rfqCode} enviada!`, { description: `${selectedSuppliers.length} fornecedor(es) notificado(s)` });
      } else {
        toast.success(`Rascunho ${rfqCode} salvo!`);
      }

      navigate("/quotations");
    } catch (err: any) {
      toast.error("Erro ao criar RFQ", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova RFQ</h1>
        <p className="text-sm text-muted-foreground mt-1">Crie uma requisição de cotação para enviar aos fornecedores</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Dados do Produto */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Dados do Produto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">Descrição do Produto *</Label>
              <Input value={form.title} onChange={set("title")} placeholder="Nome técnico + nome comercial (ex: Conector IP67 12 Pinos)" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Código VP para o Fornecedor</Label>
              <Input value={form.supplier_code} onChange={set("supplier_code")} placeholder="Ex: VP-CON-0042" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connectors">Conectores</SelectItem>
                  <SelectItem value="plastics">Plásticos</SelectItem>
                  <SelectItem value="metals">Metais</SelectItem>
                  <SelectItem value="electronics">Eletrônicos</SelectItem>
                  <SelectItem value="fasteners">Fixadores</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Cor</Label>
              <Input value={form.color} onChange={set("color")} placeholder="Pantone 293C, Hex #003DA5 ou descrição" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Material / Composição</Label>
              <Input value={form.material} onChange={set("material")} placeholder="Ex: ABS Grau Alimentício, Aço Inox 304" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Dimensões (C × L × P)</Label>
              <Input value={form.dimensions} onChange={set("dimensions")} placeholder="Ex: 120mm × 80mm × 45mm" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Peso (Líquido / Bruto)</Label>
              <Input value={form.weight} onChange={set("weight")} placeholder="Ex: 250g / 320g" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Certificações Necessárias</Label>
              <Input value={form.certifications} onChange={set("certifications")} placeholder="ISO 9001, CE, FDA, RoHS..." className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Embalagem Desejada</Label>
              <Select value={form.packaging} onValueChange={v => setForm(f => ({ ...f, packaging: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="master_carton">Master Carton</SelectItem>
                  <SelectItem value="pallet">Pallet</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">Uso Previsto</Label>
              <Textarea value={form.usage_context} onChange={set("usage_context")} placeholder="Descreva para que serve o produto" className="bg-secondary/50 border-border/50 min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Quantidade & Prazo */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-foreground">Quantidade & Prazo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Quantidade *</Label>
              <Input type="number" value={form.quantity} onChange={set("quantity")} placeholder="5000" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Moeda Base</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="CNY">CNY - Yuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Prazo Limite *</Label>
              <Input type="date" value={form.deadline} onChange={set("deadline")} className="bg-secondary/50 border-border/50" />
            </div>
          </div>
        </div>

        {/* Fotos & Arquivos */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Fotos & Arquivos
          </h2>
          <p className="text-[10px] text-muted-foreground">Mínimo 3 fotos em ângulos diferentes + desenho técnico (PDF)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="aspect-square rounded-lg border border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-1 relative">
                <img src={URL.createObjectURL(photo)} className="h-full w-full object-cover rounded-lg" alt="" />
                <button type="button" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-destructive rounded-full p-0.5">
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors cursor-pointer">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{photos.length === 0 ? "Adicionar fotos" : "Mais fotos"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>
          <label className={`flex items-center gap-2 p-3 rounded-lg border border-dashed transition-colors cursor-pointer ${pdfFile ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/50"}`}>
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {pdfFile ? pdfFile.name : "Clique para anexar desenho técnico (PDF)"}
            </span>
            {pdfFile && (
              <button type="button" onClick={(e) => { e.preventDefault(); setPdfFile(null); }} className="ml-auto text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <input type="file" accept=".pdf" className="hidden" onChange={handlePdfChange} />
          </label>
        </div>

        {/* Selecionar Fornecedores */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Selecionar Fornecedores
            </h2>
            <span className="text-[10px] text-muted-foreground font-medium">{selectedSuppliers.length} selecionado(s)</span>
          </div>
          {loadingSuppliers ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum fornecedor cadastrado. Acesse <strong>Fornecedores</strong> para adicionar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suppliers.map(supplier => (
                <label key={supplier.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSuppliers.includes(supplier.id) ? "border-primary/50 bg-primary/5" : "border-border/30 hover:border-border/60"}`}>
                  <Checkbox checked={selectedSuppliers.includes(supplier.id)} onCheckedChange={() => toggleSupplier(supplier.id)} />
                  <span className="text-lg">{supplier.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{supplier.name}</p>
                    <p className="text-[10px] text-muted-foreground">{supplier.country} · ⭐ {supplier.rating ?? "–"}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" className="text-xs" disabled={submitting} onClick={(e) => handleSubmit(e, true)}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Salvar Rascunho
          </Button>
          <Button type="submit" className="text-xs font-bold gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar RFQ
          </Button>
        </div>
      </form>
    </div>
  );
}
