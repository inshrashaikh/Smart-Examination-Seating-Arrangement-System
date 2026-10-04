package com.examseat.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger / OpenAPI metadata served at {@code /v3/api-docs}. */
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI examSeatOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Examination Seating Arrangement System API")
                        .version("1.0.0")
                        .description("""
                                REST backend for the examination seating system.

                                **Auth** — call `POST /api/auth/login` with an admin or faculty
                                credential, then click *Authorize* above and paste the returned
                                bearer token.

                                **Demo credentials**
                                * `admin@exam.com` / `admin123`
                                * `faculty1@exam.com` … `faculty5@exam.com` / `faculty123`
                                """)
                        .contact(new Contact().name("Examination Cell"))
                        .license(new License().name("MIT")))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .name(BEARER)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
