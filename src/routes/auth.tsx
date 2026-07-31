import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso da equipe — Pizza Frita" },
      {
        name: "description",
        content: "Área de login da equipe da Pizza Frita para painel da cozinha e cadastro.",
      },
      { property: "og:title", content: "Acesso da equipe — Pizza Frita" },
      { property: "og:description", content: "Login da equipe da Pizza Frita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [modo, setModo] = React.useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);

  React.useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setCarregando(false);
      if (error) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }
      void navigate({ to: "/painel", replace: true });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Conta criada! Confirme o e-mail para entrar.");
      setModo("entrar");
      return;
    }
    void navigate({ to: "/painel", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <ChefHat className="mx-auto size-8 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight">Acesso da equipe</h1>
          <p className="text-sm text-muted-foreground">
            Painel da cozinha e cadastro de produtos
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={6}
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm">
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          >
            {modo === "entrar" ? "Criar uma conta" : "Já tenho conta"}
          </button>
          <p>
            <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
              Voltar ao cardápio
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
