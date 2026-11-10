// The emerald, dotted sign-in backdrop from the prototype, with the ivory card.
export default function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-emerald bg-[radial-gradient(rgba(230,203,142,0.14)_1px,transparent_1.4px)] bg-[length:22px_22px] p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-[24px] bg-ivory-white p-7 text-center shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
        <span className="th-medal mx-auto" aria-hidden="true">
          T
        </span>
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[30px] font-semibold text-emerald">{title}</h1>
        {children}
      </div>
    </main>
  );
}
