package com.webnovel.controller;

import com.webnovel.dto.admin.UpgradeRequestRow;
import com.webnovel.service.AdminUserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin author management — hobbyist→professional upgrade queue (§4.1.1). */
@RestController
@RequestMapping("/api/v1/admin/authors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Authors")
public class AdminAuthorController {

    private final AdminUserService adminUserService;

    @GetMapping("/upgrade-requests")
    public List<UpgradeRequestRow> upgradeRequests() {
        return adminUserService.upgradeRequests();
    }
}
