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

/**
 * The three Season Passes on the paywall (Figma 1546:777). They map to the
 * current offering's packages:
 *  - Founding: a package with identifier "founding", else the Annual package.
 *    Its introductory price is the first year ($59); the base price is the
 *    renewal ($69/year).
 *  - Monthly: the Monthly package.
 *  - Weekly: the Weekly package, with its free trial when RevenueCat offers
 *    this customer one.
 * Founding is "fully claimed" (1547:777) when the offering no longer has that
 * package, or its metadata says `founding_sold_out: true` — so the owner can
 * close it from the RevenueCat dashboard without a deploy.
 */
export type PlanKind = "founding" | "monthly" | "weekly";

export const PLAN_NAMES: Record<PlanKind, string> = {
  founding: "Founding Season Pass",
  monthly: "Monthly Season Pass",
  weekly: "Weekly Season Pass",
};

export interface PassPlan {
  kind: PlanKind;
  pkg: Package;
  productId: string;
  /** Charged first: Founding's first year, otherwise the plan price. "$59" */
  firstPrice: string;
  firstPriceMicros: number;
  /** The renewing price. "$69" */
  price: string;
  priceMicros: number;
  unit: "year" | "month" | "week";
  /** Free days RevenueCat will give this customer before billing, if any. */
  trialDays: number | null;
}

export interface PassOffer {
  founding: PassPlan | null;
  monthly: PassPlan | null;
  weekly: PassPlan | null;
  foundingSoldOut: boolean;
}

const PHASE_DAYS = { day: 1, week: 7, month: 30, year: 365 } as const;

function toPlan(kind: PlanKind, pkg: Package | null | undefined): PassPlan | null {
  if (!pkg) return null;
  const product = pkg.webBillingProduct;
  const intro = product.introPricePhase?.price;
  const trial = product.freeTrialPhase?.period;
  const unit = product.period?.unit;
  return {
    kind,
    pkg,
    productId: product.identifier,
    firstPrice: (intro ?? product.price).formattedPrice,
    firstPriceMicros: (intro ?? product.price).amountMicros,
    price: product.price.formattedPrice,
    priceMicros: product.price.amountMicros,
    unit: unit === "week" || unit === "month" || unit === "year" ? unit : kind === "founding" ? "year" : kind === "monthly" ? "month" : "week",
    trialDays: trial ? trial.number * PHASE_DAYS[trial.unit] : null,
  };
}

export async function passOffer(purchases: Purchases): Promise<PassOffer> {
  const { current } = await purchases.getOfferings();
  const foundingPkg = current?.packagesById["founding"] ?? current?.annual ?? null;
  const soldOut = !foundingPkg || current?.metadata?.founding_sold_out === true;
  return {
    founding: soldOut ? null : toPlan("founding", foundingPkg),
    monthly: toPlan("monthly", current?.monthly),
    weekly: toPlan("weekly", current?.weekly),
    foundingSoldOut: soldOut,
  };
}

/** Which Season Pass a stored RevenueCat product id is. */
export function planKindOf(productId: string | null, offer?: PassOffer | null): PlanKind | null {
  if (!productId) return null;
  for (const plan of [offer?.founding, offer?.monthly, offer?.weekly]) {
    if (plan?.productId === productId) return plan.kind;
  }
  // The founding package may be gone from the offering once sold out.
  if (/week/i.test(productId)) return "weekly";
  if (/month/i.test(productId)) return "monthly";
  if (/found|annual|year/i.test(productId)) return "founding";
  return null;
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
