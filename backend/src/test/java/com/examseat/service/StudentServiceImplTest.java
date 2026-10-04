package com.examseat.service;

import com.examseat.dto.student.StudentRequest;
import com.examseat.dto.student.StudentUploadResult;
import com.examseat.entity.Student;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.util.StudentFileReader;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Roster import tests.
 *
 * <p>The interesting failure this guards against is a 500 on every upload: the id
 * minting loop has to append to the set of taken ids, which silently breaks if that
 * list comes from {@code Stream.toList()} or {@code List.of()}, both of which are
 * immutable.</p>
 */
@SpringBootTest
@ActiveProfiles("h2")
@TestPropertySource(properties = {
        "app.seed.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
@DisplayName("Student roster import")
class StudentServiceImplTest {

    @Autowired
    private StudentService studentService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SeatAllocationRepository allocationRepository;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void clear() {
        allocationRepository.deleteAll();
        studentRepository.deleteAll();
    }

    @Test
    @DisplayName("a multi-row CSV import mints distinct ids without throwing")
    void csvImportMintsDistinctIds() {
        String csv = header()
                + row("UP0001", "Asha Patel", "CSE", 2, "A")
                + row("UP0002", "Bharat Rao", "IT", 3, "B")
                + row("UP0003", "Chitra Iyer", "ECE", 2, "A")
                + row("UP0004", "Dinesh Kumar", "MECH", 4, "C")
                + row("UP0005", "Esha Nair", "CIVIL", 1, "B");

        StudentUploadResult result = upload("students.csv", csv);

        assertThat(result.getAdded()).isEqualTo(5);
        assertThat(result.getInvalid()).isZero();
        assertThat(result.getTotal()).isEqualTo(5);
        assertThat(studentRepository.count()).isEqualTo(5);

        List<String> ids = studentRepository.findAll().stream().map(Student::getId).sorted().toList();
        assertThat(ids).allMatch(id -> id.startsWith("S-"));
        assertThat(ids).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("a UTF-8 BOM does not corrupt the first header cell")
    void byteOrderMarkIsStripped() {
        String csv = "\uFEFF" + header()
                + row("UP0010", "Fatima Sheikh", "CSE", 2, "A");

        StudentUploadResult result = upload("bom.csv", csv);

        assertThat(result.getAdded()).isEqualTo(1);
        assertThat(result.getInvalid()).as("errors=%s", result.getErrors()).isZero();
        assertThat(onlyStudent().getRollNo()).isEqualTo("UP0010");
    }

    @Test
    @DisplayName("importing twice keeps minting fresh ids rather than colliding")
    void repeatedImportsKeepIdsUnique() {
        upload("first.csv", header() + row("UP0001", "First", "CSE", 2, "A"));
        // The second batch collides on UP0001 and adds two new rows.
        StudentUploadResult second = upload("second.csv",
                header() + row("UP0001", "Dupe", "CSE", 2, "A")
                        + row("UP0002", "Second", "IT", 3, "B")
                        + row("UP0003", "Third", "ECE", 1, "A"));

        assertThat(second.getAdded()).isEqualTo(2);
        assertThat(second.getDuplicates()).isEqualTo(1);
        assertThat(studentRepository.count()).isEqualTo(3);
        assertThat(studentRepository.findAll().stream().map(Student::getId))
                .doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("bad rows are reported without discarding the good ones")
    void badRowsAreReportedNotFatal() {
        String csv = header()
                + row("UP0001", "Good One", "CSE", 2, "A")
                + row("", "No Roll Number", "CSE", 2, "A")
                + row("UP0003", "", "CSE", 2, "A")
                + row("UP0004", "Bad Year", "CSE", 99, "A")
                + row("UP0005", "Good Two", "IT", 3, "B");

        StudentUploadResult result = upload("mixed.csv", csv);

        assertThat(result.getAdded()).isEqualTo(2);
        assertThat(result.getInvalid()).isEqualTo(3);
        assertThat(result.getErrors()).isNotEmpty()
                .allSatisfy(e -> assertThat(e.getMessage()).isNotBlank());
        assertThat(studentRepository.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("the same roll number twice in one file is one insert and one error")
    void duplicateInsideOneFileIsReported() {
        String csv = header()
                + row("UP0001", "First", "CSE", 2, "A")
                + row("UP0001", "Second", "CSE", 2, "A");

        StudentUploadResult result = upload("dupe.csv", csv);

        assertThat(result.getAdded()).isEqualTo(1);
        assertThat(result.getErrors()).anySatisfy(e ->
                assertThat(e.getMessage()).contains("more than once"));
    }

    @Test
    @DisplayName("header order and alternative header spellings do not matter")
    void headersAreMatchedByName() {
        String csv = "Student Name,Dept,STD Year,ROLL NUMBER\n"
                + "Reverse Order,CSE,2,UP0001\n";

        StudentUploadResult result = upload("headers.csv", csv);

        assertThat(result.getAdded()).isEqualTo(1);
        Student saved = onlyStudent();
        assertThat(saved.getName()).isEqualTo("Reverse Order");
        assertThat(saved.getDepartment()).isEqualTo("CSE");
        assertThat(saved.getYear()).isEqualTo(2);
        assertThat(saved.getRollNo()).isEqualTo("UP0001");
    }

    @Test
    @DisplayName("an Excel workbook is read the same way as the CSV")
    void excelUploadIsRead() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            var sheet = workbook.createSheet("Students");
            var headerRow = sheet.createRow(0);
            String[] headers = {"rollNo", "name", "email", "phone", "department",
                    "year", "section", "gender", "prn"};
            for (int c = 0; c < headers.length; c++) {
                headerRow.createCell(c).setCellValue(headers[c]);
            }
            var dataRow = sheet.createRow(1);
            String[] values = {"UP0020", "Grace Fernandes", "grace@uni.edu", "9000000020",
                    "CIVIL", "3", "B", "Female", "PRN0020"};
            for (int c = 0; c < values.length; c++) {
                dataRow.createCell(c).setCellValue(values[c]);
            }
            workbook.write(out);
        }

        StudentUploadResult result = upload("students.xlsx", out.toByteArray());

        assertThat(result.getAdded()).isEqualTo(1);
        Student saved = onlyStudent();
        assertThat(saved.getRollNo()).isEqualTo("UP0020");
        assertThat(saved.getName()).isEqualTo("Grace Fernandes");
        assertThat(saved.getDepartment()).isEqualTo("CIVIL");
        assertThat(saved.getYear()).isEqualTo(3);
    }

    @Test
    @DisplayName("the reader never puts a partial row into the student list")
    void readerKeepsValidRowsOnly() throws IOException {
        String csv = header()
                + row("UP0001", "Valid", "CSE", 2, "A")
                + row("", "Broken", "CSE", 2, "A");

        StudentFileReader.Parsed parsed = StudentFileReader.read(csvFile(csv));

        assertThat(parsed.total()).isEqualTo(2);
        assertThat(parsed.students()).hasSize(1);
        assertThat(parsed.errors()).hasSize(1);
    }

    @Test
    @DisplayName("importRows behaves identically to a file upload")
    void importRowsMatchesFileUpload() {
        StudentUploadResult result = studentService.importRows(List.of(
                StudentRequest.builder().rollNo("UP0030").name("Row One")
                        .department("CSE").year(2).section("A").build(),
                StudentRequest.builder().rollNo("").name("Broken")
                        .department("CSE").year(2).build()));

        assertThat(result.getAdded()).isEqualTo(1);
        assertThat(result.getInvalid()).isEqualTo(1);
        assertThat(studentRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("a roster row becomes a fully populated student")
    void rosterRowIsFullyMapped() {
        upload("full.csv", header() + "UP0040,Ida Kaur,ida@uni.edu,9000000040,CSE,4,C,Female,PRN0040\n");

        Student saved = onlyStudent();
        assertThat(saved.getRollNo()).isEqualTo("UP0040");
        assertThat(saved.getName()).isEqualTo("Ida Kaur");
        assertThat(saved.getEmail()).isEqualTo("ida@uni.edu");
        assertThat(saved.getPhone()).isEqualTo("9000000040");
        assertThat(saved.getDepartment()).isEqualTo("CSE");
        assertThat(saved.getYear()).isEqualTo(4);
        assertThat(saved.getSection()).isEqualTo("C");
        assertThat(saved.getGender()).isEqualTo("Female");
        assertThat(saved.getPrn()).isEqualTo("PRN0040");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    /* ------------------------------------------------------------------ helpers */

    private String header() {
        return "rollNo,name,email,phone,department,year,section,gender,prn\n";
    }

    /** The single seeded student, with a clear failure when the count is wrong. */
    private Student onlyStudent() {
        List<Student> all = studentRepository.findAll();
        assertThat(all).as("expected exactly one student").hasSize(1);
        return all.get(0);
    }

    private String row(String rollNo, String name, String department, int year, String section) {
        return String.join(",", rollNo, name, name.toLowerCase() + "@uni.edu", "9000000000",
                department, Integer.toString(year), section, "Male", "PRN-" + rollNo) + "\n";
    }

    private StudentUploadResult upload(String name, String csv) {
        return studentService.upload(csvFile(csv));
    }

    private StudentUploadResult upload(String name, byte[] bytes) {
        MultipartFile file = new MockMultipartFile("file", name,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
        return studentService.upload(file);
    }

    private MockMultipartFile csvFile(String csv) {
        return new MockMultipartFile("file", "students.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));
    }
}

