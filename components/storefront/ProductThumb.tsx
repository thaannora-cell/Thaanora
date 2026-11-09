import Image from "next/image";
import { photoUrl, type PublicProduct } from "@/lib/product";

type Props = {
  product: Pick<PublicProduct, "name" | "brand" | "colour_hex" | "accent_hex" | "product_images">;
  width: number;
  priority?: boolean;
};

export default function ProductThumb({ product, width, priority = false }: Props) {
  const photo = product.product_images[0];

  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-t-full rounded-b-md aspect-[3/4]"
      style={{ width, background: product.colour_hex, boxShadow: photo ? undefined : `inset 0 -10px 0 ${product.accent_hex}` }}
    >
      {photo && (
        <Image
          src={photoUrl(photo.storage_path)}
          alt={photo.alt ?? `${product.brand} — ${product.name}`}
          fill
          sizes={`${width}px`}
          priority={priority}
          className="object-cover object-[center_22%]"
        />
      )}
    </span>
  );
}
