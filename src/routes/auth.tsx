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

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    void navigate({ to: "/painel", replace: true });
  }


  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
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
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Aguarde..." : "Entrar"}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm">
          <p className="text-muted-foreground">
            Contas são criadas apenas pelo administrador.
          </p>

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
