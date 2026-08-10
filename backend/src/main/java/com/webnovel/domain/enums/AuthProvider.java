package com.webnovel.domain.enums;

/**
 * How an account authenticates. {@code LOCAL} = email + password (bcrypt);
 * {@code GOOGLE} = Google Sign-In (no password). Persisted via
 * {@code EnumType.STRING} to match the {@code users.auth_provider} CHECK
 * constraint (V10 migration). Not part of the wire contract.
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
