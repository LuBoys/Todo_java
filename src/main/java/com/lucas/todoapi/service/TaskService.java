package com.lucas.todoapi.service;

import com.lucas.todoapi.dto.TaskRequest;
import com.lucas.todoapi.exception.TaskNotFoundException;
import com.lucas.todoapi.model.Task;
import com.lucas.todoapi.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public Task createTask(TaskRequest request) {
        Task task = new Task();
        task.setTitle(request.getTitle().trim());
        task.setDescription(cleanDescription(request.getDescription()));
        // Par securite je pars sur false si le front n'envoie rien.
        task.setCompleted(Boolean.TRUE.equals(request.getCompleted()));

        return taskRepository.save(task);
    }

    public List<Task> getAllTasks() {
        // Je remonte les plus recentes en premier, c'est plus naturel dans une todo.
        return taskRepository.findAllByOrderByCreatedAtDesc();
    }

    public Task getTaskById(Long id) {
        return findTaskById(id);
    }

    public Task updateTask(Long id, TaskRequest request) {
        Task task = findTaskById(id);

        // Je garde la logique ici pour que le controller reste leger.
        task.setTitle(request.getTitle().trim());
        task.setDescription(cleanDescription(request.getDescription()));

        if (request.getCompleted() != null) {
            task.setCompleted(request.getCompleted());
        }

        return taskRepository.save(task);
    }

    public void deleteTask(Long id) {
        Task task = findTaskById(id);
        taskRepository.delete(task);
    }

    private Task findTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    private String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            // Je prefère null plutot qu'une chaine vide en base.
            return null;
        }

        return description.trim();
    }
}
