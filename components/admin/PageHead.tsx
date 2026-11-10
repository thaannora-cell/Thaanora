export default function PageHead({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="mb-[18px]">
      <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{title}</h1>
      {sub && <p className="m-0 text-[14px] text-muted">{sub}</p>}
    </div>
  );
}
