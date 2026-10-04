package com.examseat.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.examseat.algorithm.InsufficientCapacityException;
import com.examseat.algorithm.SeatConstraintException;
import com.examseat.dto.common.ApiResponse;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns every exception into the same JSON envelope so the React interceptor can
 * rely on a single error shape.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApi(ApiException ex, HttpServletRequest request) {
        log.warn("API error [{}] {}: {}", ex.getStatus().value(), request.getRequestURI(), ex.getMessage());
        return build(ex.getStatus(), ex.getMessage(), null, request);
    }

    @ExceptionHandler(InsufficientCapacityException.class)
    public ResponseEntity<ApiResponse<Void>> handleCapacity(InsufficientCapacityException ex,
                                                              HttpServletRequest request) {
        log.warn("Capacity error {}: {}", request.getRequestURI(), ex.getMessage());
        Map<String, Object> errors = new LinkedHashMap<>();
        errors.put("required", ex.getRequired());
        errors.put("available", ex.getAvailable());
        return build(HttpStatus.CONFLICT, ex.getMessage(), errors, request);
    }

    @ExceptionHandler(SeatConstraintException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(SeatConstraintException ex,
                                                              HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex,
                                                              HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        String message = errors.isEmpty() ? "Validation failed"
                : "Validation failed: " + String.join(", ",
                errors.entrySet().stream().map(e -> e.getKey() + " " + e.getValue()).toList());
        return build(HttpStatus.BAD_REQUEST, message, errors, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex,
                                                                       HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v ->
                errors.put(String.valueOf(v.getPropertyPath()), v.getMessage()));
        return build(HttpStatus.BAD_REQUEST, "Validation failed", errors, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex,
                                                                   HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), null, request);
    }

    /**
     * A missing query parameter, path variable or body is a malformed request, not a
     * server fault. Without these handlers Spring's defaults fall through to the 500
     * branch, which tells the client nothing useful.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex,
                                                                     HttpServletRequest request) {
        Map<String, Object> errors = Map.of(ex.getParameterName(), "is required");
        return build(HttpStatus.BAD_REQUEST,
                "Missing required parameter '" + ex.getParameterName() + "'", errors, request);
    }

    /**
     * Jackson rejects the request before any {@code @Valid} runs, so this is the
     * only place a type mismatch on a request field can be reported.
     *
     * <p>It used to answer a flat {@code "Request body is missing or malformed"}
     * for every cause, which is actively unhelpful: sending
     * {@code "role": "DUTY_OFFICER"} produced exactly that, with no hint that
     * {@code role} was the problem or what the allowed values were. The body was
     * neither missing nor malformed — one enum value was wrong.
     *
     * <p>Now the Jackson cause chain is inspected so the message names the field
     * and, for an enum, enumerates the permitted constants. Genuinely unparseable
     * JSON still gets the original wording.
     */
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(Exception ex, HttpServletRequest request) {
        if (ex instanceof MethodArgumentTypeMismatchException mismatch) {
            return build(HttpStatus.BAD_REQUEST,
                    "Parameter '" + mismatch.getName() + "' has the wrong type", null, request);
        }

        String detail = describeUnreadable((HttpMessageNotReadableException) ex);
        Map<String, Object> errors = fieldErrors((HttpMessageNotReadableException) ex);
        return build(HttpStatus.BAD_REQUEST, detail, errors, request);
    }

    /**
     * Turns a Jackson failure into a message that names the offending field.
     *
     * @return an explanatory sentence, or the original generic wording when the
     *         cause is not a field-level type problem (malformed JSON, empty body,
     *         truncated stream, …).
     */
    private String describeUnreadable(HttpMessageNotReadableException ex) {
        String generic = "Request body is missing or malformed";

        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof InvalidFormatException invalid) {
                // Jackson exposes the field only through the mapping path — there is no
                // getName() on InvalidFormatException — and only exposes the rejected
                // value plus the target type.
                String field = fieldFromPath(invalid);
                Class<?> target = invalid.getTargetType();
                String value = String.valueOf(invalid.getValue());

                if (field != null && target != null && target.isEnum()) {
                    return "Invalid value '" + value + "' for field '" + field + "'. "
                            + humanise(field) + " must be one of: " + allowedEnumValues(target);
                }
                if (field != null) {
                    return "Invalid value '" + value + "' for field '" + field
                            + "'. Expected " + (target == null ? "a valid value" : target.getSimpleName());
                }
            }
            if (cause instanceof JsonMappingException mapping) {
                String field = fieldFromPath(mapping);
                if (field != null) {
                    return "Field '" + field + "' could not be read. Check the type and format of the value sent.";
                }
            }
            cause = cause.getCause();
        }
        return generic;
    }

    /** Per-field detail map, mirroring the shape {@code @Valid} failures produce. */
    private Map<String, Object> fieldErrors(HttpMessageNotReadableException ex) {
        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof JsonMappingException mapping) {
                String field = fieldFromPath(mapping);
                if (field != null) {
                    Map<String, Object> one = new LinkedHashMap<>();
                    // Same sentence the caller receives, so a client rendering the
                    // `errors` map per input shows the same text as the toast.
                    one.put(field, describeUnreadable(ex));
                    return one;
                }
            }
            cause = cause.getCause();
        }
        return null;
    }

    /** Last field name on the Jackson path, e.g. {@code ["a", 0, "role"] -> "role"}. */
    private String fieldFromPath(JsonMappingException mapping) {
        if (mapping.getPath() == null) return null;
        for (int i = mapping.getPath().size() - 1; i >= 0; i--) {
            JsonMappingException.Reference ref = mapping.getPath().get(i);
            if (ref.getFieldName() != null) return ref.getFieldName();
        }
        return null;
    }

    /** Declared constants of an enum, in declaration order. */
    private String allowedEnumValues(Class<?> enumType) {
        StringBuilder sb = new StringBuilder();
        for (Object constant : enumType.getEnumConstants()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(constant);
        }
        return sb.toString();
    }

    /**
     * {@code dutyPreference} to {@code Duty preference}, so the "must be one of"
     * clause reads as a sentence rather than as a variable name.
     */
    private String humanise(String field) {
        String spaced = field.replaceAll("([a-z0-9])([A-Z])", "$1 $2");
        return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadSize(MaxUploadSizeExceededException ex,
                                                              HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE,
                "Upload exceeds the 10 MB limit", null, request);
    }

    /**
     * An unmatched URL is a client mistake, not a server fault. Without this the
     * static-resource handler's exception falls through to the 500 branch.
     */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ApiResponse<Void>> handleNoHandler(Exception ex,
                                                              HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND,
                "No endpoint " + request.getMethod() + " " + request.getRequestURI(),
                null, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                                      HttpServletRequest request) {
        return build(HttpStatus.METHOD_NOT_ALLOWED,
                request.getMethod() + " is not supported on " + request.getRequestURI(),
                null, request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaType(HttpMediaTypeNotSupportedException ex,
                                                             HttpServletRequest request) {
        MediaType sent = ex.getContentType();
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                sent == null
                        ? "This endpoint needs a Content-Type header; none was sent"
                        : "Unsupported content type " + sent,
                Map.of("expected", "application/json or multipart/form-data"),
                request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex,
                                                                   HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED,
                ex.getMessage() == null ? "Authentication failed" : ex.getMessage(), null, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex,
                                                               HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "You do not have permission to perform this action",
                null, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleEverything(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage() == null ? "Unexpected server error" : ex.getMessage(),
                null, request);
    }

    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String message,
                                                   Object errors, HttpServletRequest request) {
        ApiResponse<Void> body = ApiResponse.error(status.value(), message, errors);
        body.setPath(request == null ? null : request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}