package com.examseat.util;

import com.examseat.dto.student.StudentUploadResult;
import com.examseat.entity.Student;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.exceptions.CsvValidationException;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Reads a student roster out of a CSV or Excel upload. The header row is matched
 * loosely (case/space/underscore insensitive) so the templates shipped from the UI
 * and hand-rolled spreadsheets both work.
 */
public final class StudentFileReader {

    private static final Set<String> KNOWN_DEPARTMENTS = Set.of("CSE", "IT", "ECE", "MECH", "CIVIL");

    private StudentFileReader() { }

    /** One parsed row plus any problems found while reading it. */
    public record Parsed(List<Student> students, List<StudentUploadResult.RowError> errors, int total) { }

    public static Parsed read(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        boolean excel = name.endsWith(".xlsx") || name.endsWith(".xls");
        List<String[]> raw = excel ? readExcel(file) : readCsv(file);
        return mapRows(raw);
    }

    private static List<String[]> readCsv(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        String content;
        try (InputStream in = file.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            content = sb.toString();
        }
        // Strip a UTF-8 BOM so the first header cell does not become "﻿rollNo".
        if (!content.isEmpty() && content.charAt(0) == '\uFEFF') {
            content = content.substring(1);
        }
        if (content.isBlank()) return rows;

        try (CSVReader csv = new CSVReaderBuilder(new java.io.StringReader(content))
                .withCSVParser(new CSVParserBuilder().build())
                .build()) {
            while (true) {
                String[] record;
                try {
                    record = csv.readNext();
                } catch (CsvValidationException ex) {
                    // An unbalanced quote makes the reader position unreliable, so stop
                    // here and surface the remainder as one unparseable row.
                    rows.add(new String[]{"Unparseable CSV row: " + ex.getMessage()});
                    break;
                }
                if (record == null) break;
                if (isBlankRow(record)) continue;
                rows.add(record);
            }
        }
        return rows;
    }

    private static List<String[]> readExcel(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (InputStream in = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(in)) {
            DataFormatter formatter = new DataFormatter();
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = sheet.getFirstRowNum(); i <= sheet.getLastRowNum(); i += 1) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                int lastCell = Math.max(row.getLastCellNum(), 0);
                String[] cells = new String[lastCell];
                for (int c = 0; c < lastCell; c += 1) {
                    Cell cell = row.getCell(c);
                    cells[c] = cell == null ? "" : formatter.formatCellValue(cell).trim();
                }
                if (isBlankRow(cells)) continue;
                rows.add(cells);
            }
        }
        return rows;
    }

    private static boolean isBlankRow(String[] cells) {
        for (String cell : cells) {
            if (cell != null && !cell.isBlank()) return false;
        }
        return true;
    }

    private static Parsed mapRows(List<String[]> raw) {
        List<Student> students = new ArrayList<>();
        List<StudentUploadResult.RowError> errors = new ArrayList<>();
        if (raw.isEmpty()) {
            return new Parsed(students, errors, 0);
        }

        Map<String, Integer> headerIndex = new LinkedHashMap<>();
        String[] header = raw.get(0);
        for (int i = 0; i < header.length; i += 1) {
            headerIndex.put(normalise(header[i]), i);
        }

        int dataRows = raw.size() - 1;
        for (int r = 1; r < raw.size(); r += 1) {
            String[] row = raw.get(r);
            int lineNumber = r + 1; // 1-based, header occupies line 1

            String rollNo = cell(row, headerIndex, "rollno", "rollnumber", "roll");
            String name = cell(row, headerIndex, "name", "studentname", "fullname");
            String email = cell(row, headerIndex, "email", "mail", "emailid");
            String department = cell(row, headerIndex, "department", "dept", "branch");
            String year = cell(row, headerIndex, "year", "semester", "sem", "stdyear");
            String section = cell(row, headerIndex, "section", "sec");
            String gender = cell(row, headerIndex, "gender", "sex");
            String phone = cell(row, headerIndex, "phone", "mobile", "contact");
            String prn = cell(row, headerIndex, "prn", "permanentregistrationnumber");

            if (rollNo.isBlank() && name.isBlank()) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo("").field("rollNo")
                        .message("Both rollNo and name are blank").build());
                continue;
            }
            if (rollNo.isBlank()) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo("").field("rollNo")
                        .message("rollNo is required").build());
                continue;
            }
            if (name.isBlank()) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(rollNo).field("name")
                        .message("name is required").build());
                continue;
            }

            String normalisedDept = department == null ? "" : department.trim().toUpperCase(Locale.ROOT);
            String yearLabel = year == null ? "" : year.trim();
            if (!normalisedDept.isEmpty() && !KNOWN_DEPARTMENTS.contains(normalisedDept)) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(rollNo).field("department")
                        .message("department '" + department + "' is not one of " + KNOWN_DEPARTMENTS).build());
                continue;
            }
            int parsedYear = 1;
            if (!yearLabel.isEmpty()) {
                try {
                    parsedYear = Integer.parseInt(yearLabel.replaceAll("[^0-9]", ""));
                } catch (NumberFormatException ex) {
                    errors.add(StudentUploadResult.RowError.builder()
                            .row(lineNumber).rollNo(rollNo).field("year")
                            .message("year '" + yearLabel + "' is not a number").build());
                    continue;
                }
            }
            if (parsedYear < 1 || parsedYear > 5) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(rollNo).field("year")
                        .message("year must be between 1 and 5").build());
                continue;
            }

            students.add(Student.builder()
                    .rollNo(rollNo.trim())
                    .name(name.trim())
                    .email(email == null || email.isBlank()
                            ? rollNo.trim().toLowerCase(Locale.ROOT) + "@university.edu"
                            : email.trim())
                    .phone(phone == null ? "" : phone.trim())
                    .department(normalisedDept.isEmpty() ? "CSE" : normalisedDept)
                    .year(parsedYear)
                    .section(section == null || section.isBlank() ? "A" : section.trim().toUpperCase(Locale.ROOT))
                    .gender(gender == null || gender.isBlank() ? "" : gender.trim())
                    .prn(prn == null ? "" : prn.trim())
                    .build());
        }
        return new Parsed(students, errors, dataRows);
    }

    private static String cell(String[] row, Map<String, Integer> index, String... aliases) {
        for (String alias : aliases) {
            Integer at = index.get(alias);
            if (at != null && at < row.length) {
                String value = row[at];
                if (value != null && !value.isBlank()) return value.trim();
            }
        }
        return "";
    }

    private static String normalise(String header) {
        return header == null ? "" : header.trim().toLowerCase(Locale.ROOT)
                .replace("_", "").replace(" ", "").replace(".", "");
    }
}