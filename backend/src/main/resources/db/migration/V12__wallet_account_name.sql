-- Account-holder name displayed to readers so they can confirm who they are transferring to (FR-6.1).
ALTER TABLE admin_wallets ADD COLUMN account_name VARCHAR(100);
