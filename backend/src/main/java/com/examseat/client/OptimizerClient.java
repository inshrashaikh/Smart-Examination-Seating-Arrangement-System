package com.examseat.client;

import com.examseat.dto.seating.OptimizerRequest;
import com.examseat.dto.seating.OptimizerResponse;
import com.examseat.exception.OptimizerUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Talks to the Python OR-Tools optimizer service.
 *
 * <p>One method, {@link #optimize}: POST the allocation problem, get back the
 * per-hall seat assignments. Every failure mode — service down, timeout,
 * non-2xx, unparseable body — is funnelled into {@link
 * OptimizerUnavailableException} so the caller only has to catch one thing.
 * AUTO mode catches it and falls back; PYTHON mode lets it surface.</p>
 *
 * <p>When {@code app.optimizer.url} is blank the client is inert and reports
 * itself as {@link #isAvailable()} = false, so AUTO skips the HTTP call
 * entirely instead of failing over for a service that was never configured.</p>
 */
@Slf4j
@Component
public class OptimizerClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final boolean configured;

    public OptimizerClient(RestTemplateBuilder builder,
                           @Value("${app.optimizer.url:}") String baseUrl,
                           @Value("${app.optimizer.timeout-ms:30000}") long timeoutMs) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.configured = !this.baseUrl.isEmpty();
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofMillis(Math.min(timeoutMs, 5000)))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
    }

    /** False when no optimizer URL is configured — AUTO then uses the Java engine directly. */
    public boolean isAvailable() {
        return configured;
    }

    /**
     * Runs the optimizer.
     *
     * @throws OptimizerUnavailableException on any failure; the message is
     *         safe to show to the examination cell (it names the service, not
     *         internals).
     */
    public OptimizerResponse optimize(OptimizerRequest request) {
        if (!configured) {
            throw new OptimizerUnavailableException(
                    "No optimizer service is configured (app.optimizer.url is empty)");
        }
        String url = baseUrl + "/optimize";
        try {
            OptimizerResponse response = restTemplate.postForObject(url, request, OptimizerResponse.class);
            if (response == null || response.getHalls() == null) {
                throw new OptimizerUnavailableException(
                        "The optimizer service answered with an empty result");
            }
            return response;
        } catch (RestClientException ex) {
            HttpStatusCode status = ex instanceof org.springframework.web.client.HttpStatusCodeException http
                    ? http.getStatusCode() : null;
            if (status != null && status.is5xxServerError()) {
                log.error("Optimizer service error on {}: {} {}", url, status.value(), ex.getMessage());
                throw new OptimizerUnavailableException(
                        "The optimizer service is failing (HTTP " + status.value() + "). "
                                + "Try engine JAVA, or restart the optimizer.", ex);
            }
            log.error("Optimizer service unreachable on {}: {}", url, ex.getMessage());
            throw new OptimizerUnavailableException(
                    "The optimizer service at " + baseUrl + " could not be reached. "
                            + "Try engine JAVA, or start the optimizer (see optimizer/README.md).", ex);
        }
    }
}
