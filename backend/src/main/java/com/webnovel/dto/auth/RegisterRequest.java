package com.webnovel.dto.auth;

import com.webnovel.domain.enums.Gender;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank(message = "{validation.username.required}")
        @Size(min = 3, max = 50, message = "{validation.username.size}")
        String username,

        // @Email is lenient (accepts "a@b"); the extra @Pattern requires a dotted domain.
        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}")
        @Pattern(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "{validation.email.invalid}")
        String email,

        // Strong password: 8+ chars with at least one lowercase, uppercase, digit, and special.
        @NotBlank(message = "{validation.password.required}")
        @Size(min = 8, max = 100, message = "{validation.password.size}")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "{validation.password.weak}")
        String password,

        @NotNull(message = "{validation.gender.required}")
        Gender gender,

        @NotNull(message = "{validation.birthday.required}")
        @Past(message = "{validation.birthday.past}")
        LocalDate birthday,

        @AssertTrue(message = "{validation.terms.required}")
        boolean acceptedTerms) {

    /** Minimum age (years) required to register. */
    public static final int MIN_AGE_YEARS = 10;

    /**
     * Enforces the minimum registration age. Public so Bean Validation treats it as a
     * property getter; returns true when birthday is null ({@code @NotNull} reports that).
     */
    @AssertTrue(message = "{validation.birthday.min_age}")
    public boolean isOldEnough() {
        return birthday == null || !birthday.isAfter(LocalDate.now().minusYears(MIN_AGE_YEARS));
    }
}
