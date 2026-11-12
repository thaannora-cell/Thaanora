import "server-only";
import { getAccount } from "./account";
import { myAddresses } from "./addresses";
import type { SavedCustomer } from "@/components/storefront/selection/SelectionProvider";

// What the checkout may fill in for a signed-in customer: name, mobile (05… as she'd type it) and
// her saved addresses. Guests get null.
export async function checkoutCustomer(): Promise<SavedCustomer | null> {
  const account = await getAccount();
  if (account.state !== "customer") return null;
  const addresses = await myAddresses();
  return {
    name: account.customer.name,
    phone: `0${account.customer.phone.slice(4)}`,
    addresses: addresses.map((a) => ({ id: a.id, label: a.label, recipientName: a.recipientName, area: a.area, isDefault: a.isDefault, isGift: a.isGift })),
  };
}
