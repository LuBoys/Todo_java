package com.lucas.todoapi.service;

import com.lucas.todoapi.dto.TaskRequest;
import com.lucas.todoapi.dto.TaskStatsResponse;
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
        // Valeur par defaut a false si le front n'envoie rien.
        task.setCompleted(Boolean.TRUE.equals(request.getCompleted()));

        return taskRepository.save(task);
    }

    public List<Task> getAllTasks() {
        // Tri par date de creation descendante.
        return taskRepository.findAllByOrderByCreatedAtDesc();
    }

    public Task getTaskById(Long id) {
        return findTaskById(id);
    }

    public TaskStatsResponse getTaskStats() {
        // Compteurs utilises par le bloc de stats du front.
        long completedCount = taskRepository.countByCompletedTrue();
        long remainingCount = taskRepository.countByCompletedFalse();

        return new TaskStatsResponse(
                completedCount + remainingCount,
                completedCount,
                remainingCount
        );
    }

    public Task updateTask(Long id, TaskRequest request) {
        Task task = findTaskById(id);

        // Logique conservee dans le service pour laisser le controller leger.
        task.setTitle(request.getTitle().trim());
        task.setDescription(cleanDescription(request.getDescription()));

        if (request.getCompleted() != null) {
            task.setCompleted(request.getCompleted());
        }

        return taskRepository.save(task);
    }

    public Task duplicateTask(Long id) {
        Task sourceTask = findTaskById(id);
        Task duplicatedTask = new Task();

        duplicatedTask.setTitle(sourceTask.getTitle());
        duplicatedTask.setDescription(sourceTask.getDescription());
        // Une copie repart ouverte pour pouvoir etre retravaillee sans toucher a l'originale.
        duplicatedTask.setCompleted(false);

        return taskRepository.save(duplicatedTask);
    }

    public void deleteTask(Long id) {
        Task task = findTaskById(id);
        taskRepository.delete(task);
    }

    public List<Task> completeAllTasks() {
        List<Task> tasksToComplete = taskRepository.findAllByCompletedFalse();

        if (tasksToComplete.isEmpty()) {
            return getAllTasks();
        }

        // Mise a jour uniquement des taches encore ouvertes.
        for (Task task : tasksToComplete) {
            task.setCompleted(true);
        }

        taskRepository.saveAll(tasksToComplete);
        return getAllTasks();
    }

    private Task findTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    private String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            // Stockage a null plutot qu'en chaine vide.
            return null;
        }

        return description.trim();
    }
}
