import "server-only";
import { cookies } from "next/headers";

/**
 * New Home + Spaces (Phase 1) or the legacy screens (docs/legacy-home-spaces.md).
 *
 *  - GROUV_NEW_HOME=off on the server turns the new screens off for everyone.
 *  - /view/classic and /view/new set a cookie for one browser (internal QA).
 */
export const VIEW_COOKIE = "grouv_view";

export async function newExperienceOn(): Promise<boolean> {
  if (process.env.GROUV_NEW_HOME === "off") return false;
  return (await cookies()).get(VIEW_COOKIE)?.value !== "classic";
}
