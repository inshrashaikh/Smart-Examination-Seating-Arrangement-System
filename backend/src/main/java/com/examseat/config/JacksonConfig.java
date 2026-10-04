package com.examseat.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson tweaks that keep the JSON shape predictable for the React client:
 * ISO-8601 dates, enums as plain strings, and no surprise exceptions for
 * unknown request fields (the wizard posts optional booleans).
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
        return builder -> builder
                .modules(new JavaTimeModule())
                .featuresToDisable(
                        SerializationFeature.WRITE_DATES_AS_TIMESTAMPS,
                        DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .featuresToEnable(
                        DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT,
                        SerializationFeature.WRITE_ENUMS_USING_TO_STRING);
    }
}
