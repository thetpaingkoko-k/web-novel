package com.webnovel.security;

import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * The authenticated principal placed in the SecurityContext. Wraps the minimal
 * user identity the request needs (id, role, status) — never the password hash.
 */
@Getter
public class AppUserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final Role role;
    private final boolean blocked;

    public AppUserPrincipal(Long id, String username, Role role, boolean blocked) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.blocked = blocked;
    }

    public static AppUserPrincipal from(User user) {
        return new AppUserPrincipal(user.getId(), user.getUsername(), user.getRole(), user.isBlocked());
    }

    public boolean isAdmin() {
        return role == Role.admin;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring's hasRole('ADMIN') expects the ROLE_ prefix; role name is uppercased.
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name().toUpperCase()));
    }

    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return !blocked; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return !blocked; }
}
