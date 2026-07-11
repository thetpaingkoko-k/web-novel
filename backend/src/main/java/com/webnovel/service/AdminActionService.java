package com.webnovel.service;

import com.webnovel.domain.entity.AdminAction;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.dto.moderation.AdminActionRow;
import com.webnovel.repository.AdminActionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Writes and reads the append-only admin audit trail (§7.3, FR-13.7). */
@Service
@RequiredArgsConstructor
public class AdminActionService {

    private final AdminActionRepository adminActions;

    public void log(Long adminId, AdminActionType type, String targetType, Long targetId, String notes) {
        AdminAction action = new AdminAction();
        action.setAdminId(adminId);
        action.setActionType(type);
        action.setTargetType(targetType);
        action.setTargetId(targetId);
        action.setNotes(notes);
        adminActions.save(action);
    }

    /** Most-recent audit rows for the admin log view (FR-13.7). */
    @Transactional(readOnly = true)
    public List<AdminActionRow> recent(int limit) {
        return adminActions.findRecentRows(PageRequest.of(0, Math.min(limit, 500)));
    }
}
