package com.examseat.util;

import java.util.Collection;

/**
 * Generates the human-readable string primary keys the React UI expects
 * ({@code S-0001}, {@code H-3}, {@code EX-004}, {@code D-0012}).
 *
 * <p>Sequence is derived from the ids already in the database so a restart or a
 * deleted row can never produce a duplicate key.</p>
 */
public final class IdFactory {

    private IdFactory() { }

    /** Exam-hall mapping ids are derived, never sequential. */
    public static String examHall(String examId, String hallId) {
        return examId + "-" + hallId;
    }

    /** Seat allocation ids are derived from exam + hall + seat so a re-save is idempotent. */
    public static String allocation(String examId, String hallId, int row, int col) {
        return String.format("%s-%s-%d-%d", examId, hallId, row, col);
    }

    /**
     * @param prefix  e.g. {@code "S-"}
     * @param existing all ids currently stored
     * @param width   zero-padding width, e.g. 4 turns 1 into {@code 0001}
     */
    public static String next(String prefix, Collection<String> existing, int width) {
        return prefix + String.format("%0" + width + "d", maxSuffix(prefix, existing) + 1);
    }

    public static String next(String prefix, Collection<String> existing, int width, long bumpFrom) {
        return prefix + String.format("%0" + width + "d", Math.max(maxSuffix(prefix, existing) + 1, bumpFrom));
    }

    private static long maxSuffix(String prefix, Collection<String> existing) {
        if (existing == null) return 0L;
        long max = 0L;
        for (String id : existing) {
            if (id == null || !id.startsWith(prefix)) continue;
            String tail = id.substring(prefix.length());
            try {
                max = Math.max(max, Long.parseLong(tail));
            } catch (NumberFormatException ignored) {
                // Non-numeric suffix (e.g. a plan id) simply does not advance the sequence.
            }
        }
        return max;
    }
}
