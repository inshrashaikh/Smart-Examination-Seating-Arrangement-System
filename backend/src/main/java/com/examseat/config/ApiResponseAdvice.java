package com.examseat.config;

import com.examseat.dto.common.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Fills in {@code ApiResponse.path} on successful responses.
 *
 * <p>Error responses already set it in {@code GlobalExceptionHandler}, which has the
 * request in scope. Success responses are built by static factory methods that know
 * nothing about the request, so the path is filled in here instead of threading a
 * request through every controller. Report downloads are unaffected: they return raw
 * bytes, never an {@code ApiResponse}.</p>
 */
@Component
@RestControllerAdvice
public class ApiResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(@NonNull MethodParameter returnType,
                            @NonNull Class<? extends org.springframework.http.converter.HttpMessageConverter<?>> converterType) {
        return ApiResponse.class.isAssignableFrom(returnType.getParameterType());
    }

    @Override
    @Nullable
    public Object beforeBodyWrite(@Nullable Object body,
                                  @NonNull MethodParameter returnType,
                                  @NonNull MediaType selectedContentType,
                                  @NonNull Class<? extends org.springframework.http.converter.HttpMessageConverter<?>> converterType,
                                  @NonNull ServerHttpRequest request,
                                  @NonNull ServerHttpResponse response) {
        if (body instanceof ApiResponse<?> envelope && envelope.getPath() == null) {
            envelope.setPath(request.getURI().getPath());
        }
        return body;
    }
}
