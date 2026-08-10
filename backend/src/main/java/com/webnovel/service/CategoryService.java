package com.webnovel.service;

import com.webnovel.domain.entity.Category;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.dto.category.CategoryCreateRequest;
import com.webnovel.dto.category.CategoryResponse;
import com.webnovel.dto.category.CategoryUpdateRequest;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.CategoryRepository;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin-managed book categories (§5), the replacement for the old hardcoded {@code Genre}
 * enum. Readers and authors see only active categories; admins see and edit all of them.
 *
 * <p>A category's {@code code} is its permanent identity — books store it and browse links
 * carry it — so create fixes the code and update only touches the display label, the
 * icon, the ordering and the active flag. A category still filed against books cannot be deleted;
 * it is deactivated instead, which hides it from the pickers without orphaning anything.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categories;
    private final BookRepository books;
    private final AdminActionService adminActions;

    /** Active categories, in admin-defined order — the public picker/browse list. */
    @Transactional(readOnly = true)
    public List<CategoryResponse> listActive() {
        return categories.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(c -> toResponse(c, null))
                .toList();
    }

    /** Every category (active or not) with its book count, for the admin console. */
    @Transactional(readOnly = true)
    public List<CategoryResponse> listAll() {
        List<Category> all = categories.findAllByOrderBySortOrderAscNameAsc();
        Map<String, Long> counts = books.countBooksByGenre().stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (String) row[0], row -> ((Number) row[1]).longValue()));
        return all.stream()
                .map(c -> toResponse(c, counts.getOrDefault(c.getCode(), 0L)))
                .toList();
    }

    @Transactional
    public CategoryResponse create(Long adminId, CategoryCreateRequest req) {
        String code = req.code().trim();
        String name = req.name().trim();
        if (categories.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("category.code_taken");
        }
        if (categories.existsByNameIgnoreCase(name)) {
            throw new ConflictException("category.name_taken");
        }
        Category category = new Category();
        category.setCode(code);
        category.setName(name);
        category.setIcon(trimToNull(req.icon()));
        category.setActive(true);
        category.setSortOrder(req.sortOrder() == null ? nextSortOrder() : req.sortOrder());
        categories.save(category);
        adminActions.log(adminId, AdminActionType.category_create, "category", category.getId(), name);
        return toResponse(category, 0L);
    }

    @Transactional
    public CategoryResponse update(Long adminId, Long categoryId, CategoryUpdateRequest req) {
        Category category = requireCategory(categoryId);
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, categoryId)) {
            throw new ConflictException("category.name_taken");
        }
        category.setName(name);
        category.setIcon(trimToNull(req.icon()));
        category.setActive(req.active());
        if (req.sortOrder() != null) {
            category.setSortOrder(req.sortOrder());
        }
        adminActions.log(adminId, AdminActionType.category_update, "category", category.getId(), name);
        return toResponse(category, books.countBooksWithGenre(category.getCode()));
    }

    /**
     * Deletes an unused category. A category that still has books filed under it is kept
     * (409 {@code category.in_use}) — the admin deactivates it instead, so existing books
     * keep a resolvable label.
     */
    @Transactional
    public void delete(Long adminId, Long categoryId) {
        Category category = requireCategory(categoryId);
        if (books.countBooksWithGenre(category.getCode()) > 0) {
            throw new ConflictException("category.in_use");
        }
        String name = category.getName();
        categories.delete(category);
        adminActions.log(adminId, AdminActionType.category_delete, "category", categoryId, name);
    }

    /**
     * Validates the category codes on a book payload and returns them de-duplicated in the
     * submitted order. Unknown or retired codes are rejected so a book can never be newly
     * filed under a category the pickers no longer offer.
     *
     * <p>{@code alreadyOnBook} grandfathers the codes the book already carries: retiring a
     * category must not block its existing books from being edited, it only stops new ones
     * from choosing it.
     */
    @Transactional(readOnly = true)
    public Set<String> validateCodes(Collection<String> codes, Set<String> alreadyOnBook) {
        if (codes == null || codes.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<String> requested = new LinkedHashSet<>(codes);
        Set<String> allowed = new LinkedHashSet<>(categories.findActiveCodesIn(requested));
        allowed.addAll(alreadyOnBook);
        if (!allowed.containsAll(requested)) {
            throw new BadRequestException("category.unknown");
        }
        return requested;
    }

    private Category requireCategory(Long categoryId) {
        return categories.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("category.not_found"));
    }

    /** New categories land at the end of the picker unless the admin pins an order. */
    private int nextSortOrder() {
        return categories.findAll().stream().mapToInt(Category::getSortOrder).max().orElse(0) + 1;
    }

    /** Blank icon names are stored as null so the client falls back cleanly. */
    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static CategoryResponse toResponse(Category c, Long bookCount) {
        return new CategoryResponse(c.getId(), c.getCode(), c.getName(), c.getIcon(),
                c.isActive(), c.getSortOrder(), bookCount);
    }
}
