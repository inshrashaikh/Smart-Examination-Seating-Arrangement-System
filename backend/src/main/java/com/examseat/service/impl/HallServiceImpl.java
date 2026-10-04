package com.examseat.service.impl;

import com.examseat.dto.hall.HallRequest;
import com.examseat.dto.hall.HallResponse;
import com.examseat.entity.Exam;
import com.examseat.entity.Hall;
import com.examseat.exception.ApiException;
import com.examseat.mapper.HallMapper;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.service.HallService;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class HallServiceImpl implements HallService {

    private final HallRepository hallRepository;
    private final ExamHallRepository examHallRepository;
    private final ExamRepository examRepository;
    private final SeatAllocationRepository allocationRepository;
    private final HallMapper hallMapper;

    @Override
    @Transactional(readOnly = true)
    public List<HallResponse> list() {
        List<String> allocated = allocationRepository.findAllocatedHallIds();
        return hallMapper.toResponses(hallRepository.findAllByOrderByCodeAsc(), allocated);
    }

    @Override
    @Transactional(readOnly = true)
    public HallResponse get(String id) {
        Hall hall = hallRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Hall", id));
        return hallMapper.toResponse(hall,
                allocationRepository.findAllocatedHallIds().contains(hall.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public HallResponse getByCode(String code) {
        Hall hall = hallRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> ApiException.notFound("Hall", code));
        return hallMapper.toResponse(hall,
                allocationRepository.findAllocatedHallIds().contains(hall.getId()));
    }

    @Override
    @Transactional
    public HallResponse create(HallRequest request) {
        String code = normaliseCode(request.getCode());
        if (code != null && hallRepository.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("Hall code " + code + " is already in use");
        }
        validateGrid(request);

        Hall hall = hallMapper.toEntity(request);
        hall.setCode(code);
        hall.setId(IdFactory.next("H-", hallRepository.findAll().stream().map(Hall::getId).toList(), 1));
        hall.setBlockedSeats(sanitiseBlockedSeats(request));
        return hallMapper.toResponse(hallRepository.save(hall), false);
    }

    @Override
    @Transactional
    public HallResponse update(String id, HallRequest request) {
        Hall hall = hallRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Hall", id));
        validateGrid(request);

        String code = normaliseCode(request.getCode());
        if (code != null && !code.equalsIgnoreCase(hall.getCode())) {
            hallRepository.findByCodeIgnoreCase(code).filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw ApiException.conflict("Hall code " + code + " is already in use");
                    });
        }

        hallMapper.updateEntity(request, hall);
        hall.setBlockedSeats(sanitiseBlockedSeats(request));

        boolean allocated = allocationRepository.countByHallId(id) > 0
                || !examHallRepository.findByHallId(id).isEmpty();
        return hallMapper.toResponse(hallRepository.save(hall), allocated);
    }

    @Override
    @Transactional
    public void delete(String id) {
        Hall hall = hallRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Hall", id));

        long seating = allocationRepository.countByHallId(id);
        if (seating > 0) {
            throw ApiException.conflict(hall.getName() + " is used by " + seating
                    + " seating allocation(s). Reset those plans before deleting it.");
        }
        long attached = examHallRepository.findByHallId(id).size();
        if (attached > 0) {
            throw ApiException.conflict(hall.getName() + " is attached to " + attached
                    + " exam(s). Detach it first.");
        }
        hallRepository.delete(hall);
    }

    /**
     * Every hall annotated with whether it is already part of the exam's plan, so
     * the wizard's hall picker can pre-tick the allocated halls and show capacity.
     */
    @Override
    @Transactional(readOnly = true)
    public List<HallResponse> availability(String examId) {
        if (examId == null || examId.isBlank()) {
            return list();
        }
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> ApiException.notFound("Exam", examId));

        List<String> assigned = examHallRepository.findByExamId(examId).stream()
                .map(eh -> eh.getHall().getId())
                .toList();

        return hallMapper.toResponses(hallRepository.findAllByOrderByCodeAsc(), assigned);
    }

    /* ------------------------------------------------------------------ */

    private String normaliseCode(String code) {
        if (code == null || code.isBlank()) return null;
        return code.trim().toUpperCase(Locale.ROOT);
    }

    /** {@code capacity} is advisory; the real seat count is {@code rows * cols - blocked}. */
    private void validateGrid(HallRequest request) {
        int grid = request.getRows() * request.getCols();
        if (request.getCapacity() == null || request.getCapacity() > grid) {
            throw ApiException.badRequest("capacity (" + request.getCapacity()
                    + ") cannot exceed rows x cols (" + request.getRows() + " x "
                    + request.getCols() + " = " + grid + ")");
        }
        if (request.getBlockedSeats() != null && request.getBlockedSeats().size() > grid) {
            throw ApiException.badRequest("More blocked seats (" + request.getBlockedSeats().size()
                    + ") than seats in the hall (" + grid + ")");
        }
    }

    private List<Hall.BlockedSeat> sanitiseBlockedSeats(HallRequest request) {
        List<Hall.BlockedSeat> seats = new ArrayList<>();
        if (request.getBlockedSeats() == null) return seats;
        for (HallRequest.BlockedSeatRequest blocked : request.getBlockedSeats()) {
            if (blocked.getRow() == null || blocked.getCol() == null) continue;
            if (blocked.getRow() < 0 || blocked.getRow() >= request.getRows()
                    || blocked.getCol() < 0 || blocked.getCol() >= request.getCols()) {
                throw ApiException.badRequest("Blocked seat (" + blocked.getRow() + ", " + blocked.getCol()
                        + ") is outside the hall grid (" + request.getRows() + " x "
                        + request.getCols() + ")");
            }
            seats.add(Hall.BlockedSeat.builder()
                    .row(blocked.getRow())
                    .col(blocked.getCol())
                    .reason(blocked.getReason() == null || blocked.getReason().isBlank()
                            ? "Unavailable" : blocked.getReason())
                    .build());
        }
        return seats;
    }
}
