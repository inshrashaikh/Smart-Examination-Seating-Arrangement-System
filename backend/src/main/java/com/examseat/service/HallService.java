package com.examseat.service;

import com.examseat.dto.hall.HallRequest;
import com.examseat.dto.hall.HallResponse;

import java.util.List;

public interface HallService {

    List<HallResponse> list();

    HallResponse get(String id);

    HallResponse getByCode(String code);

    HallResponse create(HallRequest request);

    HallResponse update(String id, HallRequest request);

    void delete(String id);

    /** {@code GET /api/halls/availability?examId=} — halls with free capacity for the exam. */
    List<HallResponse> availability(String examId);
}
