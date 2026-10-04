package com.examseat.dto.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** Pagination envelope matching the shape the React {@code Table} expects. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {

    private List<T> items;
    private long total;
    private int page;
    private int pageSize;
    private int totalPages;
    private boolean first;
    private boolean last;

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        List<T> items = page.getContent().stream().map(mapper).toList();
        return PageResponse.<T>builder()
                .items(items)
                .total(page.getTotalElements())
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalPages(Math.max(1, page.getTotalPages()))
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }

    public static <T> PageResponse<T> of(List<T> items, long total, int page, int pageSize) {
        int totalPages = pageSize <= 0 ? 1 : (int) Math.max(1, Math.ceil((double) total / pageSize));
        return PageResponse.<T>builder()
                .items(items)
                .total(total)
                .page(page)
                .pageSize(pageSize)
                .totalPages(totalPages)
                .first(page <= 1)
                .last(page >= totalPages)
                .build();
    }
}