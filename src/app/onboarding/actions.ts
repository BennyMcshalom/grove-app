"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth/viewer";
import { getChapter, MAX_CHAPTERS } from "@/lib/chapters";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const OnboardingSchema = z.object({
  chapters: z
    .array(z.object({ slug: z.string(), phase: z.string() }))
    .min(1, "Choose at least one chapter")
    .max(MAX_CHAPTERS, `You can only hold ${MAX_CHAPTERS} chapters at once`),
  profile: z.object({
    mind: z.string().max(1000),
    workingThrough: z.string().max(1000),
    lookingFor: z.string().max(1000),
  }),
});

export type OnboardingInput = z.input<typeof OnboardingSchema>;

/**
 * Saves the whole onboarding flow — chapters with their phase and the three
 * profile prompts — then sends the welcome email once, after the response.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<{ error?: string }> {
  const viewer = await requireViewer();

  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something in your answers didn't look right." };
  }

  const { chapters, profile } = parsed.data;
  for (const { slug, phase } of chapters) {
    const chapter = getChapter(slug);
    if (!chapter) return { error: "One of your chapters no longer exists. Go back and pick again." };
    if (!chapter.options.includes(phase)) {
      return { error: `Pick where you are in ${chapter.name} before continuing.` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_chapters: chapters,
    // The onboarding prompts are the profile's Sitting with / Honest tension /
    // Open to, worded for a first-timer.
    p_sitting_with: profile.mind,
    p_honest_tension: profile.workingThrough,
    p_open_to: profile.lookingFor,
  });

  if (error) {
    console.error("[onboarding] complete_onboarding failed", error);
    return { error: "We couldn't save your chapters. Try again." };
  }

  const firstTime = !viewer.profile.onboarded_at;
  if (firstTime && viewer.email) {
    const to = viewer.email;
    const origin = await siteUrl();
    after(async () => {
      try {
        await sendEmail(
          welcomeEmail({
            to,
            firstName: viewer.profile.first_name,
            chapterNames: chapters.map(({ slug }) => getChapter(slug)!.name),
            siteUrl: origin,
          }),
        );
      } catch (emailError) {
        console.error("[onboarding] welcome email failed", emailError);
      }
    });
  }

  redirect("/onboarding/ready");
}
