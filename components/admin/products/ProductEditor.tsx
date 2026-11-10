"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { photoUrl, salePrice } from "@/lib/product";
import type { AdminProduct } from "@/lib/admin/products";
import { arrangePhotos, saveProduct, uploadPhoto, type ProductInput } from "@/app/admin/(panel)/products/actions";
import { resizePhoto } from "./resizePhoto";
import { marginPct } from "./ProductsView";

const OCCASIONS = ["Everyday", "Eid", "Wedding", "Birthday", "Anniversary", "Gifts"] as const;
const FAMILIES = ["red", "earth", "green", "blue", "purple", "neutral"] as const;

type Photo =
  | { key: string; kind: "saved"; id: string; src: string }
  | { key: string; kind: "new"; blob: Blob; width: number; height: number; src: string };

type Props = {
  product: AdminProduct | null; // null = add a new product
  products: AdminProduct[];
  rate: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const field =
  "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none aria-[invalid=true]:border-rani";
const labelCls = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";

export default function ProductEditor({ product, products, rate, onClose, onSaved }: Props) {
  const t = useTranslations("Admin.products");
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const isNew = product === null;

  const [f, setF] = useState(() => ({
    code: product?.code ?? "",
    brand: product?.brand ?? "",
    name: product?.name ?? "",
    fabric: product?.fabric ?? "Khaddar",
    work: product?.work ?? "Embroidered",
    price_sar: String(product?.price_sar ?? ""),
    sale_pct: String(product?.sale_pct ?? 0),
    cost_pkr: product?.cost_pkr === null || product?.cost_pkr === undefined ? "" : String(product.cost_pkr),
    stock: String(product?.stock ?? 0),
    trending_rank: product?.trending_rank ? String(product.trending_rank) : "",
    is_new: product?.is_new ?? true,
    visible: product?.visible ?? true,
    colour_family: product?.colour_family ?? "green",
    colour_hex: product?.colour_hex ?? "#0E3B2E",
    accent_hex: product?.accent_hex ?? "#E6CB8E",
    occasions: product?.occasions ?? ["Everyday"],
  }));
  const [photos, setPhotos] = useState<Photo[]>(
    () => product?.product_images.map((p) => ({ key: p.id, kind: "saved" as const, id: p.id, src: photoUrl(p.storage_path) })) ?? [],
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(0);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  // While saving, Esc must not close the drawer half-way through the uploads.
  useEffect(() => {
    const d = ref.current;
    const onCancel = (e: Event) => {
      if (busy) e.preventDefault();
    };
    d?.addEventListener("cancel", onCancel);
    return () => d?.removeEventListener("cancel", onCancel);
  }, [busy]);
  // Free the preview images made in this browser.
  useEffect(() => () => photos.forEach((p) => p.kind === "new" && URL.revokeObjectURL(p.src)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const fabrics = [...new Set(products.map((p) => p.fabric))].sort();
  const price = Number(f.price_sar);
  const sale = Number(f.sale_pct) || 0;
  const liveMargin = marginPct(price, sale, f.cost_pkr === "" ? null : Number(f.cost_pkr), rate);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setPreparing(files.length);
    for (const file of Array.from(files).slice(0, 8)) {
      try {
        const r = await resizePhoto(file);
        setPhotos((ps) => [...ps, { key: crypto.randomUUID(), kind: "new", blob: r.blob, width: r.width, height: r.height, src: r.url }]);
      } catch {
        setError({ text: t("errors.photoUnreadable", { name: file.name }) });
      }
      setPreparing((n) => n - 1);
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  const makeMain = (key: string) => setPhotos((ps) => [...ps.filter((p) => p.key === key), ...ps.filter((p) => p.key !== key)]);
  const removePhoto = (p: Photo) => {
    setPhotos((ps) => ps.filter((x) => x.key !== p.key));
    if (p.kind === "saved") setRemoved((r) => [...r, p.id]);
    else URL.revokeObjectURL(p.src);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || preparing > 0) return;
    if (isNew && photos.length === 0) return setError({ text: t("errors.needPhoto") });
    if (f.occasions.length === 0) return setError({ text: t("errors.occasions"), field: "occasions" });
    setBusy(true);
    setError(null);
    const input: ProductInput = {
      ...f,
      price_sar: Number(f.price_sar),
      sale_pct: Number(f.sale_pct) || 0,
      cost_pkr: f.cost_pkr === "" ? null : Number(f.cost_pkr),
      stock: Number(f.stock),
      trending_rank: f.trending_rank === "" ? null : Number(f.trending_rank),
    };
    const saved = await saveProduct(product?.id ?? null, input);
    if (!saved.ok) {
      setBusy(false);
      return setError({ text: t(`errors.${saved.error}`), field: saved.field });
    }

    // Photos: upload the new ones, then save the order (first = main) and drop the removed ones.
    let failed = 0;
    const order: string[] = [];
    for (const p of photos) {
      if (p.kind === "saved") {
        order.push(p.id);
        continue;
      }
      const form = new FormData();
      form.set("productId", saved.id);
      form.set("file", new File([p.blob], `photo.${p.blob.type === "image/webp" ? "webp" : "jpg"}`, { type: p.blob.type }));
      form.set("width", String(p.width));
      form.set("height", String(p.height));
      const up = await uploadPhoto(form).catch(() => ({ ok: false as const, error: "photoFailed" }));
      if (up.ok) order.push(up.photo.id);
      else failed++;
    }
    if (order.length || removed.length) {
      const arranged = await arrangePhotos(saved.id, order, removed);
      if (!arranged.ok) failed++;
    }
    router.refresh();
    setBusy(false);
    if (failed) {
      setError({ text: t("errors.somePhotos", { count: failed }) });
      return;
    }
    ref.current?.close();
    onSaved(isNew ? t("added", { name: f.name }) : t("saved", { name: f.name }));
  };

  const invalid = (k: string) => (error?.field === k ? true : undefined);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && !busy && ref.current?.close()}
      className="th-drawer m-0 ms-auto h-dvh max-h-dvh w-full max-w-[560px] overflow-y-auto bg-ivory-white p-0 text-ink shadow-[0_0_60px_rgba(0,0,0,0.3)] backdrop:bg-emerald-deep/50"
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5 p-5 md:p-6" noValidate>
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold text-emerald">
            {isNew ? t("addTitle") : t("editTitle")}
          </h2>
          <button
            type="button"
            onClick={() => !busy && ref.current?.close()}
            aria-label={t("close")}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-[20px] text-emerald"
          >
            ×
          </button>
        </div>

        {/* Photos */}
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[13px] text-muted">{t("photos")}</legend>
          <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
            {photos.map((p, i) => (
              <li key={p.key} className="flex w-[96px] flex-col items-center gap-1">
                <span className={`relative block h-[124px] w-[96px] overflow-hidden rounded-t-[48px] rounded-b-[10px] ${i === 0 ? "border-2 border-gold" : "border border-[#E7E1D4]"}`}>
                  <Image src={p.src} alt={t("photoN", { n: i + 1 })} fill sizes="96px" unoptimized={p.kind === "new"} className="object-cover object-[center_20%]" />
                  {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-emerald/85 py-0.5 text-center text-[11px] font-medium text-gold-light">{t("main")}</span>}
                </span>
                {i > 0 && (
                  <button type="button" onClick={() => makeMain(p.key)} className="min-h-[30px] text-[12px] text-emerald underline underline-offset-2">
                    {t("makeMain")}
                  </button>
                )}
                <button type="button" onClick={() => removePhoto(p)} className="min-h-[30px] text-[12px] text-rani underline underline-offset-2">
                  {t("removePhoto")}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={preparing > 0}
                className="flex h-[124px] w-[96px] flex-col items-center justify-center gap-1 rounded-t-[48px] rounded-b-[10px] border-2 border-dashed border-[#CFC3AA] bg-white px-2 text-center text-[12px] text-emerald"
              >
                <span aria-hidden="true" className="text-[24px] leading-none">+</span>
                {preparing > 0 ? t("preparing") : t("addPhotos")}
              </button>
            </li>
          </ul>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => addFiles(e.target.files)} />
          <small className="text-[12px] text-muted">{t("photosHint")}</small>
        </fieldset>

        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls}>
            {t("brand")}
            <input className={field} list="th-brands" value={f.brand} onChange={(e) => set("brand", e.target.value)} required aria-invalid={invalid("brand")} />
            <datalist id="th-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
          <label className={labelCls}>
            {t("code")}
            <input className={field} dir="ltr" value={f.code} onChange={(e) => set("code", e.target.value)} readOnly={!isNew} required aria-invalid={invalid("code")} />
          </label>
        </div>
        <label className={labelCls}>
          {t("name")}
          <input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} required aria-invalid={invalid("name")} />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls}>
            {t("fabric")}
            <input className={field} list="th-fabrics" value={f.fabric} onChange={(e) => set("fabric", e.target.value)} required aria-invalid={invalid("fabric")} />
            <datalist id="th-fabrics">{fabrics.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <label className={labelCls}>
            {t("work")}
            <select className={field} value={f.work} onChange={(e) => set("work", e.target.value as typeof f.work)}>
              <option value="Embroidered">{t("workEmbroidered")}</option>
              <option value="Printed">{t("workPrinted")}</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <label className={labelCls}>
            {t("price")}
            <input className={field} type="number" inputMode="decimal" min="1" step="1" value={f.price_sar} onChange={(e) => set("price_sar", e.target.value)} required aria-invalid={invalid("price_sar")} />
          </label>
          <label className={labelCls}>
            {t("salePct")}
            <input className={field} type="number" inputMode="numeric" min="0" max="90" step="1" value={f.sale_pct} onChange={(e) => set("sale_pct", e.target.value)} aria-invalid={invalid("sale_pct")} />
          </label>
          <label className={labelCls}>
            {t("costPkr")}
            <input className={field} type="number" inputMode="numeric" min="0" step="1" value={f.cost_pkr} onChange={(e) => set("cost_pkr", e.target.value)} aria-invalid={invalid("cost_pkr")} />
          </label>
        </div>
        <p className="m-0 -mt-1 text-[13px] text-muted" aria-live="polite">
          {price > 0 && t("sellsAt", { price: salePrice({ price_sar: price, sale_pct: sale }) })}
          {liveMargin !== null && ` · ${t("marginIs", { pct: liveMargin })}`}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls}>
            {t("stock")}
            <input className={field} type="number" inputMode="numeric" min="0" step="1" value={f.stock} onChange={(e) => set("stock", e.target.value)} aria-invalid={invalid("stock")} />
          </label>
          <label className={labelCls}>
            {t("trending")}
            <select className={field} value={f.trending_rank} onChange={(e) => set("trending_rank", e.target.value)}>
              <option value="">{t("notTrending")}</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  #{i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!isNew && Number(f.stock) !== product.stock && <p className="m-0 -mt-1 text-[12px] text-walnut">{t("stockNote", { from: product.stock, to: Number(f.stock) || 0 })}</p>}
        <div className="grid grid-cols-3 gap-2.5">
          <label className={labelCls}>
            {t("family")}
            <select className={field} value={f.colour_family} onChange={(e) => set("colour_family", e.target.value as typeof f.colour_family)}>
              {FAMILIES.map((x) => (
                <option key={x} value={x}>
                  {t(`families.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            {t("colour")}
            <input className={`${field} p-1`} type="color" value={f.colour_hex} onChange={(e) => set("colour_hex", e.target.value)} />
          </label>
          <label className={labelCls}>
            {t("accent")}
            <input className={`${field} p-1`} type="color" value={f.accent_hex} onChange={(e) => set("accent_hex", e.target.value)} />
          </label>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 text-[13px] text-muted">{t("occasions")}</legend>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <label key={o} className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#E1D8C6] bg-white px-3 text-[14px] text-emerald">
                <input
                  type="checkbox"
                  checked={f.occasions.includes(o)}
                  onChange={(e) => set("occasions", e.target.checked ? [...f.occasions, o] : f.occasions.filter((x) => x !== o))}
                />
                {t(`occ.${o}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#E1D8C6] bg-white px-3 text-[14px] text-emerald">
            <input type="checkbox" checked={f.is_new} onChange={(e) => set("is_new", e.target.checked)} />
            {t("newLabel")}
          </label>
          <label className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#E1D8C6] bg-white px-3 text-[14px] text-emerald">
            <input type="checkbox" checked={f.visible} onChange={(e) => set("visible", e.target.checked)} />
            {t("showOnSite")}
          </label>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
            {error.text}
          </p>
        )}
        <button type="submit" disabled={busy || preparing > 0} className="th-btn th-btn-pink justify-center disabled:opacity-70">
          {busy ? t("saving") : isNew ? t("addSubmit") : t("saveSubmit")}
        </button>
      </form>
    </dialog>
  );
}
