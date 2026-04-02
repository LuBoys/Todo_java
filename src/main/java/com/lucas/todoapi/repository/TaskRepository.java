package com.lucas.todoapi.repository;

import com.lucas.todoapi.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByOrderByCreatedAtDesc();

    List<Task> findAllByCompletedFalse();

    List<Task> findAllByCompletedTrue();

    long countByCompletedTrue();

    long countByCompletedFalse();
}
