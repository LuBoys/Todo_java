package com.lucas.todoapi.dto;

public class TaskStatsResponse {

    private final long total;
    private final long completed;
    private final long remaining;

    public TaskStatsResponse(long total, long completed, long remaining) {
        this.total = total;
        this.completed = completed;
        this.remaining = remaining;
    }

    public long getTotal() {
        return total;
    }

    public long getCompleted() {
        return completed;
    }

    public long getRemaining() {
        return remaining;
    }
}
