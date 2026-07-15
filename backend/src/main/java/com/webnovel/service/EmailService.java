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
import org.springframework.web.client.RestClient;

/**
 * Sends transactional email (verification codes) via the Resend HTTP API
 * (https://api.resend.com/emails) over HTTPS — chosen because outbound SMTP is
 * blocked on this network and on most PaaS, while 443 is not.
 *
 * <p>When {@code app.mail.enabled=false} or no API key is set, the code is logged
 * to the console instead of sent, so the flow is testable without a provider.
 * Send failures are logged (with the code as a fallback), never thrown:
 * registration still succeeds and the user can request a resend.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_ENDPOINT = "https://api.resend.com/emails";

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
        try {
            restClient.post()
                    .uri(RESEND_ENDPOINT)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new ResendEmail(props.mail().from(), List.of(toEmail), subject, body))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            // Non-fatal: don't fail registration. Log the code as a fallback so signup
            // still works if the provider call fails (the user can also resend).
            log.error("Failed to send verification email to {}: {} — fallback code: {}",
                    toEmail, e.getMessage(), code);
        }
    }

    private static org.springframework.http.client.ClientHttpRequestFactory timeoutRequestFactory() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(8));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }
}
