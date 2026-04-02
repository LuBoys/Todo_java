package com.lucas.todoapi.model;

public enum TaskPriority {
    LOW,
    MEDIUM,
    HIGH;

    public static TaskPriority fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return MEDIUM;
        }

        return TaskPriority.valueOf(value.trim().toUpperCase());
    }
}
