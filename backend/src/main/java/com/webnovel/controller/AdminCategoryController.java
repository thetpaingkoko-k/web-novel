package com.webnovel.controller;

import com.webnovel.dto.category.CategoryCreateRequest;
import com.webnovel.dto.category.CategoryResponse;
import com.webnovel.dto.category.CategoryUpdateRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.CategoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin management of book categories (§5, FR-13). Every mutation is audited. */
@RestController
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Categories")
public class AdminCategoryController {

    private final CategoryService categoryService;

    /** All categories — inactive ones included — each with the number of books filed under it. */
    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.listAll();
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryCreateRequest req) {
        CategoryResponse created = categoryService.create(SecurityUtils.requirePrincipal().getId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Rename / reorder / (de)activate. The {@code code} is immutable and is not accepted here. */
    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategoryUpdateRequest req) {
        return categoryService.update(SecurityUtils.requirePrincipal().getId(), id, req);
    }

    /** Delete an unused category; 409 {@code category.in_use} when books still reference it. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        categoryService.delete(SecurityUtils.requirePrincipal().getId(), id);
    }
}
