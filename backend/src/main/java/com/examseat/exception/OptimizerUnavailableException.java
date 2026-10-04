package com.examseat.exception;

import org.springframework.http.HttpStatus;

/**
 * The Python optimizer service could not produce a plan — it is down, timed
 * out, or answered with an error.
 *
 * <p>Distinct from {@link ApiException} so the seating service can tell apart
 * "the optimizer failed, fall back to the Java engine" (AUTO mode) from "the
 * optimizer failed, propagate" (PYTHON mode) without string-matching the
 * message.</p>
 */
public class OptimizerUnavailableException extends RuntimeException {

    private final HttpStatus status;

    public OptimizerUnavailableException(String message) {
        super(message);
        this.status = HttpStatus.BAD_GATEWAY;
    }

    public OptimizerUnavailableException(String message, Throwable cause) {
        super(message, cause);
        this.status = HttpStatus.BAD_GATEWAY;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
