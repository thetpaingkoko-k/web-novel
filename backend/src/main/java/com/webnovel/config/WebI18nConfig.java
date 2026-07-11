package com.webnovel.config;

import java.util.List;
import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * Stateless, header-driven localization (English / Myanmar). The MessageSource
 * is auto-configured from {@code spring.messages} (basename {@code messages}),
 * and Spring Boot wires it into bean validation automatically.
 */
@Configuration
public class WebI18nConfig {

    public static final Locale MY = Locale.of("my");

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(Locale.ENGLISH, MY));
        resolver.setDefaultLocale(Locale.ENGLISH);
        return resolver;
    }
}
