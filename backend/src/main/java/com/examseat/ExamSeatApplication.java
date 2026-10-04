package com.examseat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Smart Examination Seating Arrangement System — API entry point.
 *
 * <p>Serves the React frontend on http://localhost:5173 (proxied to :8080 via Vite)
 * and Swagger UI on http://localhost:8080/swagger-ui.html.</p>
 */
@SpringBootApplication
@EnableJpaAuditing
public class ExamSeatApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamSeatApplication.class, args);
    }
}