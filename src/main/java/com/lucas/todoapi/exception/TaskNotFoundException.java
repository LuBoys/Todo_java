package com.lucas.todoapi.exception;

public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(Long id) {
        super("Tache introuvable avec l'id " + id);
    }
}
