package com.examseat.mapper;

import com.examseat.dto.hall.HallRequest;
import com.examseat.dto.hall.HallResponse;
import com.examseat.entity.Hall;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class HallMapper {

    public HallResponse toResponse(Hall hall, boolean allocated) {
        if (hall == null) return null;
        List<HallResponse.BlockedSeat> blocked = new ArrayList<>();
        if (hall.getBlockedSeats() != null) {
            hall.getBlockedSeats().forEach(bs -> blocked.add(HallResponse.BlockedSeat.builder()
                    .row(bs.getRow()).col(bs.getCol()).reason(bs.getReason())
                    .build()));
        }
        return HallResponse.builder()
                .id(hall.getId())
                .code(hall.getCode())
                .name(hall.getName())
                .building(hall.getBuilding())
                .block(hall.getBlock())
                .floor(hall.getFloor())
                .capacity(hall.getCapacity())
                .rows(hall.getRowsCount())
                .cols(hall.getColsCount())
                .rowsCount(hall.getRowsCount())
                .colsCount(hall.getColsCount())
                .usable(hall.usableCapacity())
                .type(hall.getType())
                .board(hall.getBoard())
                .facilities(hall.getFacilities())
                .blockedSeats(blocked)
                .allocated(allocated)
                .build();
    }

    public List<HallResponse> toResponses(List<Hall> halls, List<String> allocatedHallIds) {
        return halls == null ? List.of() : halls.stream()
                .map(h -> toResponse(h, allocatedHallIds != null && allocatedHallIds.contains(h.getId())))
                .toList();
    }

    public void updateEntity(HallRequest request, Hall hall) {
        if (request.getCode() != null && !request.getCode().isBlank()) hall.setCode(request.getCode());
        hall.setName(request.getName());
        hall.setBuilding(request.getBuilding());
        hall.setBlock(request.getBlock());
        hall.setFloor(request.getFloor());
        hall.setCapacity(request.getCapacity());
        hall.setRowsCount(request.getRows());
        hall.setColsCount(request.getCols());
        hall.setType(request.getType());
        hall.setBoard(request.getBoard());

        if (request.getFacilities() != null) {
            hall.setFacilities(new ArrayList<>(request.getFacilities()));
        }
        if (request.getBlockedSeats() != null) {
            List<Hall.BlockedSeat> seats = new ArrayList<>();
            request.getBlockedSeats().forEach(bs -> seats.add(Hall.BlockedSeat.builder()
                    .row(bs.getRow()).col(bs.getCol()).reason(bs.getReason())
                    .build()));
            hall.setBlockedSeats(seats);
        }
    }

    public Hall toEntity(HallRequest request) {
        Hall hall = new Hall();
        updateEntity(request, hall);
        hall.setCode(request.getCode());
        return hall;
    }
}