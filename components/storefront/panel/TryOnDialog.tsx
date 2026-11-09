"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { photoUrl, type PublicProduct } from "@/lib/product";

type Props = {
  product: PublicProduct;
  open: boolean;
  onClose: () => void;
  primaryLabel: string;
  onPrimary: () => void;
};

export default function TryOnDialog({ product, open, onClose, primaryLabel, onPrimary }: Props) {
  const t = useTranslations("Panel");
  const photo = product.product_images[0];

  return (
    <Modal open={open} onClose={onClose} eyebrow={t("tryEyebrow")} title={t("tryTitle")}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {photo && (
          <div className="relative mx-auto aspect-[3/4] w-[200px] shrink-0 overflow-hidden rounded-t-full rounded-b-2xl border-[3px] border-gold">
            <Image src={photoUrl(photo.storage_path)} alt={photo.alt ?? product.name} fill sizes="200px" className="object-cover object-[center_18%]" />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[15px] text-emerald">
            <b className="font-medium">
              <bdi>{product.brand}</bdi>
            </b>{" "}
            · <bdi>{product.name}</bdi>
          </p>
          <p className="m-0 text-[14px] text-muted">{t("tryComingSoon")}</p>
          <p className="m-0 text-[13px] text-muted">{t("tryPrivacy")}</p>
          <button
            type="button"
            className="th-btn th-btn-pink"
            onClick={() => {
              onClose();
              onPrimary();
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
