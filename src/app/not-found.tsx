import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass-panel w-full max-w-xl rounded-[32px] border border-border p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">
          No encontramos ese tablero o ruta.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Puede que ya no exista, no tengas permisos o la URL esté incompleta.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
          >
            Ir al dashboard
          </Link>
          <Link
            href="/search"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
          >
            Buscar tarjetas
          </Link>
        </div>
      </div>
    </div>
  );
}
