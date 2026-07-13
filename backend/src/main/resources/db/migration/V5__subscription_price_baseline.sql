-- Subscription price becomes a system baseline (not author-set); admins may adjust it.
-- 1) Backfill: any monetization-enabled author still missing a price gets the 5000 MMK baseline
--    so their subscribe button appears immediately.
UPDATE author_profiles
   SET monthly_subscription_price = 5000
 WHERE is_monetization_enabled = TRUE
   AND monthly_subscription_price IS NULL;

-- 2) Allow the new audited action type for admin price adjustments.
ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check;
ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check
    CHECK (action_type IN (
        'user_approval','content_approval','content_rejection',
        'content_removal','ban','report_resolution','withdrawal_approval',
        'subscription_price_update'
    ));
