package com.webnovel.dto.auth;

import com.webnovel.domain.enums.Gender;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank(message = "{validation.username.required}")
        @Size(min = 3, max = 50, message = "{validation.username.size}")
        String username,

        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}")
        String email,

        @NotBlank(message = "{validation.password.required}")
        @Size(min = 8, max = 100, message = "{validation.password.size}")
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
