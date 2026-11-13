import "server-only";
import { getAccount } from "./account";
import { myAddresses } from "./addresses";
import { myTailorData } from "./tailor";
import { getPerks, toCheckoutPerks } from "./perks";
import type { SavedCustomer } from "@/components/storefront/selection/SelectionProvider";

// What the checkout may fill in for a signed-in customer: name, mobile (05… as she'd type it) and
// her saved addresses, and her Circle level, birthday gift and personal offers. Guests get null.
export async function checkoutCustomer(): Promise<SavedCustomer | null> {
  const account = await getAccount();
  if (account.state !== "customer") return null;
  const [addresses, tailor, perks] = await Promise.all([myAddresses(), myTailorData(account.customer.id), getPerks(account.customer.id, account.customer.birthday)]);
  return {
    name: account.customer.name,
    phone: `0${account.customer.phone.slice(4)}`,
    addresses: addresses.map((a) => ({ id: a.id, label: a.label, recipientName: a.recipientName, area: a.area, isDefault: a.isDefault, isGift: a.isGift })),
    measurements: tailor.measurements,
    tailorId: tailor.tailorId,
    perks: toCheckoutPerks(perks),
  };
}
