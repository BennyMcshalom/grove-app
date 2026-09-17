import type { Package, Purchases } from "@revenuecat/purchases-js";

/**
 * The browser side of RevenueCat. The SDK is loaded only when Settings needs
 * it, and always identifies the customer by their Supabase user id.
 */
export async function purchasesFor(appUserId: string): Promise<Purchases> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_REVENUECAT_WEB_API_KEY is not set.");

  const { Purchases } = await import("@revenuecat/purchases-js");
  if (!Purchases.isConfigured()) return Purchases.configure({ apiKey, appUserId });

  const purchases = Purchases.getSharedInstance();
  // Someone else signed in on this tab since it was configured.
  if (purchases.getAppUserId() !== appUserId) await purchases.changeUser(appUserId);
  return purchases;
}

/** The plan on sale: the current offering's monthly package, or its first one. */
export async function planPackage(purchases: Purchases): Promise<Package | null> {
  const { current } = await purchases.getOfferings();
  return current?.monthly ?? current?.availablePackages[0] ?? null;
}

/** "$6.99 / month", "$59.99 / year", "$19.99 every 3 months". */
export function priceLabel(pkg: Package): string {
  const product = pkg.webBillingProduct;
  const price = product.price.formattedPrice;
  const period = product.period;
  if (!period) return price;
  return period.number === 1 ? `${price} / ${period.unit}` : `${price} every ${period.number} ${period.unit}s`;
}

export async function isCancelled(error: unknown) {
  const { ErrorCode, PurchasesError } = await import("@revenuecat/purchases-js");
  return error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError;
}
