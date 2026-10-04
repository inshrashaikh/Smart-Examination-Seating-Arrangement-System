package com.examseat.util;

import com.examseat.exception.ApiException;
import com.examseat.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Turns a {@link TableData} into a downloadable HTTP response.
 *
 * <p>Lives in {@code util} rather than inside {@code ReportController} because the
 * faculty attendance screen needs the same behaviour. The route lives under
 * {@code /api/duties/my/**} so it can be scoped to the invigilator's own hall, but
 * the file-format handling is identical, and duplicating the switch meant the two
 * could drift — which is exactly how {@code ?format=} ended up being silently
 * ignored on the duty routes.
 *
 * <p>Extracted with the controller's behaviour unchanged, including the 400 on an
 * unrecognised format.
 */
public final class TableDownloader {

    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private TableDownloader() {
    }

    /** True when the caller wants the JSON envelope rather than a file. */
    public static boolean wantsJson(String format) {
        return format == null || format.isBlank();
    }

    /**
     * @param slug    filename stem, e.g. {@code "attendance"}
     * @param suffix  second filename stem, e.g. {@code "EX-005-H-4"}
     * @param format  {@code pdf}, {@code excel}/{@code xlsx}/{@code xls}, or {@code csv}
     * @throws ApiException 400 when the format is not one of the three
     */
    public static ResponseEntity<byte[]> download(ReportService.TableData table, String format,
                                                  String slug, String suffix) {
        String normalised = format.trim().toLowerCase(Locale.ROOT);
        byte[] body;
        MediaType mediaType;
        String extension;

        switch (normalised) {
            case "pdf" -> {
                body = TableExporter.toPdf(table.title(), table.subtitle(),
                        table.headers(), table.rows());
                mediaType = MediaType.APPLICATION_PDF;
                extension = "pdf";
            }
            case "excel", "xlsx", "xls" -> {
                body = TableExporter.toExcel(slug, table.headers(), table.rows());
                mediaType = XLSX;
                extension = "xlsx";
            }
            case "csv" -> {
                body = TableExporter.toCsv(table.headers(), table.rows());
                mediaType = CSV;
                extension = "csv";
            }
            default -> throw ApiException.badRequest(
                    "Unsupported format '" + format + "'. Use pdf, excel or csv.");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + slug + "-" + suffix + "." + extension + "\"")
                .contentType(mediaType)
                .body(body);
    }
}