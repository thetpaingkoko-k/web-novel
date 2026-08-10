-- Audit subscription-payment approvals/rejections (§7): allow the new admin action types.
ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check;
ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check
    CHECK (action_type IN (
        'user_approval','content_approval','content_rejection',
        'content_removal','ban','report_resolution','withdrawal_approval',
        'subscription_price_update','payment_approval','payment_rejection'
    ));
