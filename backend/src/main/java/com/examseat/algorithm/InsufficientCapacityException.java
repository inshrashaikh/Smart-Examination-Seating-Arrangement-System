package com.examseat.algorithm;

/** Raised when the selected halls cannot seat every eligible student. */
public class InsufficientCapacityException extends RuntimeException {

    private final int required;
    private final int available;

    public InsufficientCapacityException(int required, int available) {
        super(String.format(
                "Insufficient seating capacity: %d eligible students but only %d usable seats. "
                        + "Select more halls or relax the eligibility filter.", required, available));
        this.required = required;
        this.available = available;
    }

    public int getRequired() {
        return required;
    }

    public int getAvailable() {
        return available;
    }
}