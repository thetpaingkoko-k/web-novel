-- Subscription payment QR: admins upload a scannable QR image per platform wallet (§3).
ALTER TABLE admin_wallets ADD COLUMN qr_image_url VARCHAR(500);
