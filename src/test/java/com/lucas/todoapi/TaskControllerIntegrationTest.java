package com.lucas.todoapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.todoapi.dto.TaskRequest;
import com.lucas.todoapi.model.Task;
import com.lucas.todoapi.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TaskRepository taskRepository;

    @BeforeEach
    void setup() {
        taskRepository.deleteAll();
    }

    @Test
    void shouldCreateTask() throws Exception {
        TaskRequest request = new TaskRequest();
        request.setTitle("Faire les tests");
        request.setDescription("Verifier que l'API repond bien");
        request.setCompleted(false);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Faire les tests"))
                .andExpect(jsonPath("$.completed").value(false));
    }

    @Test
    void shouldReturnBadRequestWhenTitleIsMissing() throws Exception {
        TaskRequest request = new TaskRequest();
        request.setTitle("   ");
        request.setDescription("Pas de titre valide");

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Le titre est obligatoire")));
    }

    @Test
    void shouldUpdateTask() throws Exception {
        Task task = new Task("Tache initiale", "Description de base", false);
        Task savedTask = taskRepository.save(task);

        TaskRequest request = new TaskRequest();
        request.setTitle("Tache modifiee");
        request.setDescription("Description mise a jour");
        request.setCompleted(true);

        mockMvc.perform(put("/api/tasks/{id}", savedTask.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tache modifiee"))
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    void shouldDuplicateTask() throws Exception {
        Task task = new Task("Preparer le sprint", "Reprendre la meme base pour lundi", true);
        Task savedTask = taskRepository.save(task);

        mockMvc.perform(post("/api/tasks/{id}/duplicate", savedTask.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Preparer le sprint"))
                .andExpect(jsonPath("$.description").value("Reprendre la meme base pour lundi"))
                .andExpect(jsonPath("$.completed").value(false));

        org.assertj.core.api.Assertions.assertThat(taskRepository.count()).isEqualTo(2);
    }

    @Test
    void shouldReturnTaskStats() throws Exception {
        taskRepository.save(new Task("Tache 1", "A faire", false));
        taskRepository.save(new Task("Tache 2", "Deja terminee", true));
        taskRepository.save(new Task("Tache 3", "Encore en cours", false));

        mockMvc.perform(get("/api/tasks/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.completed").value(1))
                .andExpect(jsonPath("$.remaining").value(2));
    }

    @Test
    void shouldCompleteAllTasks() throws Exception {
        taskRepository.save(new Task("Premiere tache", "Encore ouverte", false));
        taskRepository.save(new Task("Deuxieme tache", "Encore ouverte aussi", false));
        taskRepository.save(new Task("Deja faite", "Pas a modifier", true));

        mockMvc.perform(put("/api/tasks/complete-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].completed").value(true));

        mockMvc.perform(get("/api/tasks/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remaining").value(0))
                .andExpect(jsonPath("$.completed").value(3));
    }

    @Test
    void shouldDeleteTask() throws Exception {
        Task task = new Task("A supprimer", "On teste la suppression", false);
        Task savedTask = taskRepository.save(task);

        mockMvc.perform(delete("/api/tasks/{id}", savedTask.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/{id}", savedTask.getId()))
                .andExpect(status().isNotFound());
    }
}
