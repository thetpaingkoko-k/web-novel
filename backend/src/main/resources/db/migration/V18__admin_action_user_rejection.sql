-- Allow auditing an admin's rejection of a hobbyist→professional upgrade request
-- (§4.1.1). Same pattern as V8: rebuild the action_type CHECK with the new value.
ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check;
ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check
    CHECK (action_type IN (
        'user_approval','user_rejection','content_approval','content_rejection',
        'content_removal','ban','report_resolution','withdrawal_approval',
        'subscription_price_update','payment_approval','payment_rejection'
    ));
