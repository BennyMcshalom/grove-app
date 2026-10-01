-- Season Pass, paused Spaces and referrals: the notification kinds they send.
-- On their own so the next migration can use them (a new enum value can't be
-- used in the transaction that adds it).

-- "Your trial ends in 3 days" — before expiry, with the plan comparison.
alter type public.notification_kind add value if not exists 'trial_ending';
-- Downgrade paused some Spaces; choose which four stay active.
alter type public.notification_kind add value if not exists 'spaces_paused';
-- Referral: a friend joined with your link / finished their first chapter /
-- the friend who invited you is cheering you on.
alter type public.notification_kind add value if not exists 'referral_joined';
alter type public.notification_kind add value if not exists 'referral_reward_earned';
alter type public.notification_kind add value if not exists 'referral_nudge';
