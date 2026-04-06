import { useState, useEffect } from "react";
import { Star, Mail, Globe, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const COUNTRIES = [
  { name: "Brazil", flag: "🇧🇷", language: "pt" },
  { name: "China", flag: "🇨🇳", language: "zh" },
  { name: "United States", flag: "🇺🇸", language: "en" },
  { name: "Germany", flag: "🇩🇪", language: "de" },
  { name: "Japan", flag: "🇯🇵", language: "ja" },
  { name: "South Korea", flag: "🇰🇷", language: "ko" },
  { name: "India", flag: "🇮🇳", language: "en" },
  { name: "Italy", flag: "🇮🇹", language: "it" },
  { name: "France", flag: "🇫🇷", language: "fr" },
  { name: "Spain", flag: "🇪🇸", language: "es" },
  { name: "United Kingdom", flag: "🇬🇧", language: "en" },
  { name: "Mexico", flag: "🇲🇽", language: "es" },
  { name: "Taiwan", flag: "🇹🇼", language: "zh" },
  { name: "Vietnam", flag: "🇻🇳", language: "vi" },
  { name: "Thailand", flag: "🇹🇭", language: "th" },
  { name: "Indonesia", flag: "🇮🇩", language: "id" },
  { name: "Turkey", flag: "🇹🇷", language: "tr" },
  { name: "Poland", flag: "🇵🇱", language: "pl" },
  { name: "Portugal", flag: "🇵🇹", language: "pt" },
  { name: "Netherlands", flag: "🇳🇱", language: "nl" },
];

interface Supplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  email: string;
  language: string;
  rating: number | null;
  total_quotes: number | null;
}

const emptyForm = {
  name: "",
  country: "",
  flag: "",
  email: "",
  language: "",
};

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function deleteSupplier(id: string) {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir fornecedor", variant: "destructive" });
    } else {
      toast({ title: "Fornecedor excluído" });
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function fetchSuppliers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar fornecedores", variant: "destructive" });
    } else {
      setSuppliers(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  function handleCountryChange(countryName: string) {
    const found = COUNTRIES.find((c) => c.name === countryName);
    setForm((f) => ({
      ...f,
      country: countryName,
      flag: found?.flag ?? "🏳️",
      language: found?.language ?? "en",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.country || !form.email) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("suppliers").insert({
      name: form.name,
      country: form.country,
      flag: form.flag,
      email: form.email,
      language: form.language || "en",
      created_by: user?.id,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao cadastrar fornecedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fornecedor cadastrado com sucesso!" });
      setForm(emptyForm);
      setOpen(false);
      fetchSuppliers();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de fornecedores internacionais cadastrados
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Nenhum fornecedor cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="glass-card rounded-xl p-5 hover:border-primary/20 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">{supplier.flag}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {supplier.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {supplier.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {supplier.rating ?? "–"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {supplier.total_quotes ?? 0} cotações
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <button
                  onClick={() => deleteSupplier(supplier.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Excluir fornecedor"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Shenzhen Yutong Electronics"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">País *</Label>
              <Select onValueChange={handleCountryChange} value={form.country}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@fornecedor.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="language">Idioma de contato</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="zh">中文 (Chinês)</SelectItem>
                  <SelectItem value="ja">日本語 (Japonês)</SelectItem>
                  <SelectItem value="ko">한국어 (Coreano)</SelectItem>
                  <SelectItem value="de">Deutsch (Alemão)</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
