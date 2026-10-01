-- Enum values that invited Bonds and the Bond Log (next migration) need. On
-- their own because a new enum value can't be used in the transaction that
-- adds it. 'bond_invitation' and 'bond_accepted' already exist.

-- "Morgan declined your Bond invite."
alter type public.notification_kind add value if not exists 'bond_declined';
-- Someone ended a Bond with you (the Release ritual).
alter type public.notification_kind add value if not exists 'bond_released';
-- "Jalen shared this week's reflection" in your Bond Log.
alter type public.notification_kind add value if not exists 'bond_log_shared';

-- WHO CAN SEE YOUR LOG → "Everyone: anyone on Grouv in your spaces can
-- scroll your log" (Figma 1307:22530).
alter type public.log_visibility add value if not exists 'everyone';
