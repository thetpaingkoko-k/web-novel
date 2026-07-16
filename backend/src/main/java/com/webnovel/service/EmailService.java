package com.webnovel.service;

import com.webnovel.config.AppProperties;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Sends transactional email (verification codes) via the Resend HTTP API
 * (https://api.resend.com/emails) over HTTPS — chosen because outbound SMTP is
 * blocked on this network and on most PaaS, while 443 is not.
 *
 * <p>When {@code app.mail.enabled=false} or no API key is set, the code is logged
 * to the console instead of sent, so the flow is testable without a provider.
 * Transient failures (timeouts, connection resets, provider 5xx) are retried a
 * few times before giving up — the first outbound HTTPS call after a cold start
 * can be slow enough to time out, which is why the code previously appeared to
 * "only send on resend". Send failures are ultimately logged (with the code as a
 * fallback), never thrown: registration still succeeds and the user can resend.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_ENDPOINT = "https://api.resend.com/emails";
    /** Transient-failure retries — mirrors what a manual "resend" click does. */
    private static final int MAX_ATTEMPTS = 3;

    private final MessageSource messages;
    private final AppProperties props;
    private final RestClient restClient;

    /** Resend "send email" request body. */
    private record ResendEmail(String from, List<String> to, String subject, String text) {}

    public EmailService(MessageSource messages, AppProperties props) {
        this.messages = messages;
        this.props = props;
        this.restClient = RestClient.builder()
                .requestFactory(timeoutRequestFactory())
                .build();
    }

    /** Emails (or console-logs) a 6-digit verification code to {@code toEmail}. */
    public void sendVerificationCode(String toEmail, String code, Locale locale) {
        String apiKey = props.mail().resendApiKey();
        if (!props.mail().enabled() || apiKey == null || apiKey.isBlank()) {
            log.info("[MAIL DISABLED] Verification code for {}: {}", toEmail, code);
            return;
        }
        String subject = messages.getMessage("email.verification.subject", null, locale);
        String body = messages.getMessage("email.verification.body", new Object[] {code}, locale);
        var payload = new ResendEmail(props.mail().from(), List.of(toEmail), subject, body);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                restClient.post()
                        .uri(RESEND_ENDPOINT)
                        .header("Authorization", "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload)
                        .retrieve()
                        .toBodilessEntity();
                log.info("Verification email sent to {} (attempt {})", toEmail, attempt);
                return;
            } catch (HttpClientErrorException e) {
                // 4xx = the request itself is wrong (bad API key, unverified sender
                // domain, invalid recipient). Retrying won't help — surface Resend's
                // own message so the misconfiguration is obvious, then stop.
                log.error("Resend rejected verification email to {}: {} {} — fallback code: {}",
                        toEmail, e.getStatusCode(), e.getResponseBodyAsString(), code);
                return;
            } catch (Exception e) {
                // Transient (timeout, connection reset, provider 5xx). The first call
                // after a cold start is the usual culprit — retry before giving up.
                if (attempt < MAX_ATTEMPTS) {
                    log.warn("Verification email to {} failed (attempt {}/{}): {} — retrying",
                            toEmail, attempt, MAX_ATTEMPTS, e.getMessage());
                    backoff(attempt);
                } else {
                    // Non-fatal: don't fail registration. Log the code as a fallback so
                    // signup still works and the user can also resend.
                    log.error("Failed to send verification email to {} after {} attempts: {} — fallback code: {}",
                            toEmail, MAX_ATTEMPTS, e.getMessage(), code);
                }
            }
        }
    }

    /** Short, interrupt-safe pause between send retries (500ms, 1000ms, …). */
    private static void backoff(int attempt) {
        try {
            Thread.sleep(500L * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private static org.springframework.http.client.ClientHttpRequestFactory timeoutRequestFactory() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(8));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }
}
