package com.examseat.service;

import com.examseat.dto.report.AttendanceSheet;
import com.examseat.dto.report.DepartmentWiseReport;
import com.examseat.dto.report.HallWiseReport;
import com.examseat.dto.report.StudentWiseRow;

import java.util.List;

public interface ReportService {

    HallWiseReport hallWise(String examId);

    DepartmentWiseReport departmentWise(String examId);

    /** Returned as a bare array so the React table can iterate the payload directly. */
    List<StudentWiseRow> studentWise(String examId, String search, String department);

    AttendanceSheet attendance(String examId, String hallId);

    /** Flat header/rows projection used by the PDF, Excel and CSV exporters. */
    TableData hallWiseTable(String examId);

    TableData departmentWiseTable(String examId);

    TableData studentWiseTable(String examId, String search, String department);

    TableData attendanceTable(String examId, String hallId);

    /** A report flattened for export. */
    record TableData(String title, String subtitle, List<String> headers, List<List<Object>> rows) { }
}
