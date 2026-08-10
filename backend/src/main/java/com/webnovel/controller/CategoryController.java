package com.webnovel.controller;

import com.webnovel.dto.category.CategoryResponse;
import com.webnovel.service.CategoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public read of the admin-managed book categories (§5) — the source of truth for the
 * author's category picker, the browse filter pills and the home discovery tiles.
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Categories")
public class CategoryController {

    private final CategoryService categoryService;

    /** Active categories only, in admin-defined order. Anonymous-readable. */
    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.listActive();
    }
}
