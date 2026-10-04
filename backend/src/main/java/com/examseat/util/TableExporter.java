package com.examseat.util;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Turns a table-shaped dataset (headers + rows) into an XLSX byte array or a
 * simple PDF table. Shared by every {@code ?format=} report endpoint.
 */
public final class TableExporter {

    private TableExporter() { }

    /* ------------------------------------------------------------------ Excel */

    public static byte[] toExcel(String sheetName, List<String> headers, List<List<Object>> rows) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet(sheetName == null || sheetName.isBlank() ? "Report" : sheetName);

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            border(headerStyle);

            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < headers.size(); c += 1) {
                var cell = headerRow.createCell(c);
                cell.setCellValue(headers.get(c));
                cell.setCellStyle(headerStyle);
            }

            CellStyle bodyStyle = workbook.createCellStyle();
            border(bodyStyle);

            for (int r = 0; r < rows.size(); r += 1) {
                Row row = sheet.createRow(r + 1);
                List<Object> values = rows.get(r);
                for (int c = 0; c < values.size(); c += 1) {
                    var cell = row.createCell(c);
                    Object value = values.get(c);
                    if (value instanceof Number number) {
                        cell.setCellValue(number.doubleValue());
                    } else {
                        cell.setCellValue(value == null ? "" : String.valueOf(value));
                    }
                    cell.setCellStyle(bodyStyle);
                }
            }

            // Auto-size so columns are readable without manual resizing.
            for (int c = 0; c < headers.size(); c += 1) {
                sheet.autoSizeColumn(c);
                sheet.setColumnWidth(c, Math.min(sheet.getColumnWidth(c) + 800, 20000));
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to build the Excel workbook", ex);
        }
    }

    private static void border(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    /* -------------------------------------------------------------------- PDF */

    public static byte[] toPdf(String title, String subtitle,
                               List<String> headers, List<List<Object>> rows) {
        Document document = new Document(PageSize.A4.rotate(), 28, 28, 40, 32);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);
        document.open();

        com.lowagie.text.Font titleFont =
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15);
        com.lowagie.text.Font subtitleFont =
                FontFactory.getFont(FontFactory.HELVETICA, 9);
        com.lowagie.text.Font headerFont =
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
        com.lowagie.text.Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

        Paragraph heading = new Paragraph(title == null ? "Report" : title, titleFont);
        heading.setSpacingAfter(2);
        document.add(heading);

        if (subtitle != null && !subtitle.isBlank()) {
            Paragraph sub = new Paragraph(subtitle, subtitleFont);
            sub.setSpacingAfter(10);
            document.add(sub);
        }

        PdfPTable table = new PdfPTable(headers.size());
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);

        // Header text is white on indigo, so it needs its own font instance.
        com.lowagie.text.Font headerTextFont =
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new java.awt.Color(255, 255, 255));

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header == null ? "" : header, headerTextFont));
            cell.setBackgroundColor(new java.awt.Color(79, 70, 229));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(4);
            table.addCell(cell);
        }

        boolean alternate = false;
        for (List<Object> row : rows) {
            for (Object value : row) {
                PdfPCell cell = new PdfPCell(
                        new Phrase(value == null ? "" : String.valueOf(value), bodyFont));
                cell.setPadding(3);
                if (alternate) {
                    cell.setBackgroundColor(new java.awt.Color(245, 246, 251));
                }
                table.addCell(cell);
            }
            alternate = !alternate;
        }

        document.add(table);
        document.close();
        return out.toByteArray();
    }

    /* -------------------------------------------------------------------- CSV */

    public static byte[] toCsv(List<String> headers, List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append('﻿'); // BOM so Excel detects UTF-8
        sb.append(String.join(",", headers.stream().map(TableExporter::escape).toList()));
        sb.append('\n');
        for (List<Object> row : rows) {
            sb.append(row.stream().map(v -> escape(v == null ? "" : String.valueOf(v)))
                    .collect(java.util.stream.Collectors.joining(",")));
            sb.append('\n');
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private static String escape(String value) {
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }
}