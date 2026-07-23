package com.webnovel.service;

import com.webnovel.domain.entity.AdminAction;
import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Category;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.dto.moderation.AdminActionRow;
import com.webnovel.repository.AdminActionRepository;
import com.webnovel.repository.AuthorWithdrawalRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.CategoryRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.DebatePostRepository;
import com.webnovel.repository.ReportRepository;
import com.webnovel.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Writes and reads the append-only admin audit trail (§7.3, FR-13.7). */
@Service
@RequiredArgsConstructor
public class AdminActionService {

    private final AdminActionRepository adminActions;
    private final UserRepository users;
    private final BookRepository books;
    private final ChapterRepository chapters;
    private final ChapterCommentRepository comments;
    private final DebatePostRepository debatePosts;
    private final AuthorWithdrawalRepository withdrawals;
    private final ReportRepository reports;
    private final CategoryRepository categories;

    /** Removes a single audit-log entry (FR-13.7 admin housekeeping). 404 if it does not exist. */
    @Transactional
    public void delete(Long adminActionId) {
        if (!adminActions.existsById(adminActionId)) {
            throw new com.webnovel.exception.NotFoundException("adminaction.not_found");
        }
        adminActions.deleteById(adminActionId);
    }

    public void log(Long adminId, AdminActionType type, String targetType, Long targetId, String notes) {
        AdminAction action = new AdminAction();
        action.setAdminId(adminId);
        action.setActionType(type);
        action.setTargetType(targetType);
        action.setTargetId(targetId);
        action.setNotes(notes);
        adminActions.save(action);
    }

    /** Most-recent audit rows for the admin log view, with human-readable target labels (FR-13.7). */
    @Transactional(readOnly = true)
    public List<AdminActionRow> recent(int limit) {
        List<AdminActionRow> rows = adminActions.findRecentRows(PageRequest.of(0, Math.min(limit, 500)));
        Map<String, Map<Long, String>> labels = resolveTargetLabels(rows);
        return rows.stream()
                .map(r -> r.withTargetLabel(
                        labels.getOrDefault(r.targetType(), Map.of()).get(r.targetId())))
                .toList();
    }

    /** Batch-resolves display labels per target type; deleted targets simply resolve to no label. */
    private Map<String, Map<Long, String>> resolveTargetLabels(List<AdminActionRow> rows) {
        Map<String, Set<Long>> idsByType = rows.stream().collect(Collectors.groupingBy(
                AdminActionRow::targetType,
                Collectors.mapping(AdminActionRow::targetId, Collectors.toSet())));

        Map<String, Map<Long, String>> labels = new HashMap<>();
        idsByType.forEach((type, ids) -> labels.put(type, switch (type) {
            case "user" -> usernamesById(ids);
            case "book" -> books.findAllById(ids).stream()
                    .collect(Collectors.toMap(Book::getId, Book::getTitle));
            case "chapter" -> chapterLabels(ids);
            case "chapter_comment" -> comments.findAllById(ids).stream()
                    .collect(Collectors.toMap(c -> c.getId(), c -> excerpt(c.getContent())));
            case "debate_post" -> debatePosts.findAllById(ids).stream()
                    .collect(Collectors.toMap(p -> p.getId(), p -> excerpt(p.getContent())));
            case "withdrawal" -> withdrawalLabels(ids);
            case "category" -> categories.findAllById(ids).stream()
                    .collect(Collectors.toMap(Category::getId, Category::getName));
            case "report" -> reports.findAllById(ids).stream()
                    .collect(Collectors.toMap(r -> r.getId(), r -> excerpt(r.getReason())));
            default -> Map.of();
        }));
        return labels;
    }

    private Map<Long, String> usernamesById(Set<Long> ids) {
        return users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
    }

    /** "{book title} — Ch.{n} {chapter title}" so admins can tell chapters apart at a glance. */
    private Map<Long, String> chapterLabels(Set<Long> ids) {
        List<Chapter> found = chapters.findAllById(ids);
        Map<Long, String> bookTitles = books.findAllById(
                        found.stream().map(Chapter::getBookId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Book::getId, Book::getTitle));
        return found.stream().collect(Collectors.toMap(Chapter::getId, c -> {
            String book = bookTitles.get(c.getBookId());
            String chapter = "Ch.%d %s".formatted(c.getChapterNumber(), c.getTitle()).trim();
            return book == null ? chapter : book + " — " + chapter;
        }));
    }

    /** "{author username} — {amount} MMK" for withdrawal approvals. */
    private Map<Long, String> withdrawalLabels(Set<Long> ids) {
        var found = withdrawals.findAllById(ids);
        Map<Long, String> authorNames = usernamesById(
                found.stream().map(w -> w.getAuthorId()).collect(Collectors.toSet()));
        return found.stream().collect(Collectors.toMap(
                w -> w.getId(),
                w -> {
                    String amount = w.getAmount().stripTrailingZeros().toPlainString() + " MMK";
                    String author = authorNames.get(w.getAuthorId());
                    return author == null ? amount : author + " — " + amount;
                }));
    }

    private static String excerpt(String text) {
        if (text == null) {
            return "";
        }
        String oneLine = text.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 60 ? oneLine : oneLine.substring(0, 57) + "…";
    }
}
