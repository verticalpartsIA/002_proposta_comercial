import { useState, useEffect } from "react";
import { Loader2, Save, User, Building2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "", company: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, company")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, company: profile.company })
      .eq("id", user!.id);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso!" });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ title: "A nova senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setSavingPassword(false);

    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setPasswords({ current: "", new: "", confirm: "" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil e preferências da conta
        </p>
      </div>

      {/* Perfil */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4 text-primary" />
          Dados do Perfil
        </div>
        <Separator />
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> E-mail
            </Label>
            <Input id="email" value={profile.email} disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-[11px] text-muted-foreground">O e-mail não pode ser alterado aqui.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Empresa
            </Label>
            <Input
              id="company"
              value={profile.company ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Perfil
            </Button>
          </div>
        </form>
      </div>

      {/* Senha */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          Alterar Senha
        </div>
        <Separator />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_password">Nova senha</Label>
            <Input
              id="new_password"
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirmar nova senha</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Repita a nova senha"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={savingPassword} variant="outline" className="gap-2">
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Alterar Senha
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
