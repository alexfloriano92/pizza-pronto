import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: ehAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    return { user: data.user, ehAdmin: Boolean(ehAdmin) };
  },
  component: LayoutInterno,
});

function LayoutInterno() {
  const { ehAdmin } = Route.useRouteContext();

  if (!ehAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador para acessar esta área.
          </p>
          <div className="flex justify-center gap-2 text-sm">
            <Link to="/" className="rounded-lg bg-secondary px-4 py-2 font-medium">
              Ir para o cardápio
            </Link>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
