package com.examseat.algorithm;

/** Raised when a manual seat swap would break a hard constraint. */
public class SeatConstraintException extends RuntimeException {

    public SeatConstraintException(String message) {
        super(message);
    }
}