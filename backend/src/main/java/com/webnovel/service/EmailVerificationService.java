package com.webnovel.service;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.EmailVerificationCode;
import com.webnovel.domain.entity.User;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.repository.EmailVerificationCodeRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages 6-digit email-verification codes for manual signups: generates and
 * emails a code (one active per user), enforces a resend cooldown, and verifies
 * a submitted code against the stored SHA-256 hash within its TTL. The raw code
 * is only ever handed to {@link EmailService}; the DB holds a hash.
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationCodeRepository codes;
    private final EmailService emailService;
    private final AppProperties props;

    /** Generates a fresh code (replacing any existing one) and emails it. */
    @Transactional
    public void issueAndSend(User user, Locale locale) {
        String rawCode = generateCode();
        codes.deleteByUserId(user.getId());
        codes.flush(); // ensure the delete lands before the insert (user_id is UNIQUE)

        EmailVerificationCode entity = new EmailVerificationCode();
        entity.setUserId(user.getId());
        entity.setCodeHash(hash(rawCode));
        entity.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plus(props.mail().codeTtl()));
        codes.save(entity);

        emailService.sendVerificationCode(user.getEmail(), rawCode, locale);
    }

    /** Rejects a resend that arrives within the cooldown window (FR: anti-spam). */
    public void assertResendAllowed(User user) {
        codes.findByUserId(user.getId()).ifPresent(existing -> {
            OffsetDateTime earliestResend = existing.getCreatedAt().plus(props.mail().resendCooldown());
            if (OffsetDateTime.now().isBefore(earliestResend)) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.resend_too_soon,
                        "auth.resend_too_soon");
            }
        });
    }

    /**
     * Validates a submitted code for the user and consumes it on success.
     *
     * @throws BadRequestException if there is no code, it has expired, or it doesn't match.
     */
    @Transactional
    public void verifyAndConsume(User user, String submittedCode) {
        EmailVerificationCode code = codes.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException(
                        ErrorCode.invalid_verification_code, "auth.invalid_verification_code"));
        if (code.getExpiresAt().isBefore(OffsetDateTime.now())) {
            codes.delete(code);
            throw new BadRequestException(ErrorCode.invalid_verification_code, "auth.invalid_verification_code");
        }
        if (!constantTimeEquals(hash(submittedCode), code.getCodeHash())) {
            throw new BadRequestException(ErrorCode.invalid_verification_code, "auth.invalid_verification_code");
        }
        codes.delete(code);
    }

    private String generateCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    private String hash(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
