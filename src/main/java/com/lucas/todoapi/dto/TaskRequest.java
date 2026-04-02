package com.lucas.todoapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class TaskRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 120, message = "Le titre ne doit pas depasser 120 caracteres")
    private String title;

    @Size(max = 500, message = "La description ne doit pas depasser 500 caracteres")
    private String description;

    @Pattern(
            regexp = "LOW|MEDIUM|HIGH",
            flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "La priorite doit etre LOW, MEDIUM ou HIGH"
    )
    private String priority;

    private Boolean completed;

    public TaskRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
}
