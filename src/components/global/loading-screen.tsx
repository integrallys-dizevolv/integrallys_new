import Image from "next/image";

export function LoadingScreen() {
  return (
    <main className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.10),_transparent_34%),linear-gradient(180deg,_rgba(248,250,252,0.92)_0%,_rgba(241,245,249,0.95)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.10),_transparent_34%),linear-gradient(180deg,_rgba(10,18,16,0.98)_0%,_rgba(15,23,42,0.98)_100%)]" />
      <div className="absolute left-0 top-0 h-52 w-52 animate-pulse rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
      <div className="animate-in fade-in duration-700 absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/10" />

      <section className="animate-in fade-in zoom-in-95 duration-500 relative z-10 w-full max-w-md rounded-[28px] border border-white/60 bg-white/85 p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-10">
        <div className="animate-in fade-in slide-in-from-top-2 duration-500 mb-8 flex justify-center">
          <Image
            src="/images/Integrallys-Logo.png"
            alt="Integrallys"
            width={180}
            height={56}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </div>

        <div className="animate-in zoom-in duration-500 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-primary/10 ring-1 ring-app-primary/15">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--app-primary)]/20 border-t-[var(--app-primary)]" />
        </div>

        <p className="animate-in fade-in slide-in-from-top-2 duration-500 mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--app-primary)]">
          Carregando
        </p>
        <h2 className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-3 text-2xl font-semibold tracking-[-0.03em] text-app-text-primary dark:text-white">
          Preparando sua experiencia
        </h2>
        <p className="animate-in fade-in slide-in-from-bottom-2 duration-700 mt-4 text-sm leading-7 text-app-text-muted dark:text-white/65">
          Estamos organizando os dados desta area para exibir tudo da melhor forma.
        </p>

        <div className="animate-in fade-in duration-700 mt-6 grid grid-cols-3 gap-2">
          <div className="h-2 rounded-full bg-app-primary/20" />
          <div className="h-2 rounded-full bg-app-primary/40" />
          <div className="h-2 rounded-full bg-app-primary/20" />
        </div>
      </section>
    </main>
  );
}
