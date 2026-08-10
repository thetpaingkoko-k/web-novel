package com.webnovel.repository;

import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /** All users in a role — drives admin fan-out for notifications. */
    List<User> findByRole(Role role);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    List<User> findAllByOrderByIdDesc();

    List<User> findByStatusOrderByIdDesc(UserStatus status);

    List<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByIdDesc(
            String username, String email);
}
