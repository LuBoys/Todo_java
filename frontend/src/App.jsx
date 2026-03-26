import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Circle, ListTodo, Plus, Trash2 } from "lucide-react";

const filters = ["toutes", "a_faire", "terminees"];

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [filter, setFilter] = useState("toutes");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    // Le filtre reste volontairement simple, le back n'a pas besoin de le gerer pour ce projet.
    return tasks.filter((task) => {
      if (filter === "a_faire") {
        return !task.completed;
      }

      if (filter === "terminees") {
        return task.completed;
      }

      return true;
    });
  }, [filter, tasks]);

  const activeTasksCount = tasks.filter((task) => !task.completed).length;
  const doneTasksCount = tasks.length - activeTasksCount;

  function getFilterCount(currentFilter) {
    if (currentFilter === "a_faire") {
      return activeTasksCount;
    }

    if (currentFilter === "terminees") {
      return doneTasksCount;
    }

    return tasks.length;
  }

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      // Je repasse par l'API apres chaque action, c'est plus simple a garder coherent.
      const response = await fetch("/api/tasks");

      if (!response.ok) {
        throw new Error("Impossible de charger les taches.");
      }

      const data = await response.json();
      setTasks(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    const text = newTaskText.trim();

    if (!text) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: text,
          description: "",
          completed: false
        })
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        throw new Error(apiError?.message || "Impossible d'ajouter la tache.");
      }

      setNewTaskText("");
      // Ici je prefere recharger la liste plutot que de maintenir plusieurs mises a jour locales.
      await loadTasks();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(task) {
    setError("");

    try {
      // Je renvoie toute la tache ici pour rester coherent avec le DTO du back.
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          completed: !task.completed
        })
      });

      if (!response.ok) {
        throw new Error("Impossible de modifier la tache.");
      }

      await loadTasks();
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function deleteTask(id) {
    setError("");

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Suppression impossible.");
      }

      await loadTasks();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function clearCompleted() {
    const completedTasks = tasks.filter((task) => task.completed);

    if (completedTasks.length === 0) {
      return;
    }

    setError("");

    try {
      // Si plusieurs taches sont terminees, autant tout supprimer d'un coup.
      await Promise.all(
        completedTasks.map((task) =>
          fetch(`/api/tasks/${task.id}`, {
            method: "DELETE"
          }).then((response) => {
            if (!response.ok) {
              throw new Error();
            }
          })
        )
      );

      await loadTasks();
    } catch {
      setError("Impossible d'effacer les taches terminees.");
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 flex items-center gap-3"
        >
          <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm">
            <ListTodo size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Todo Lucas</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="mb-6 flex flex-wrap gap-3"
        >
          <SummaryPill label="Total" value={tasks.length} />
          <SummaryPill label="A faire" value={activeTasksCount} />
          <SummaryPill label="Terminees" value={doneTasksCount} />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            API connectee
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 p-6">
            <form onSubmit={addTask} className="relative flex items-center">
              <input
                type="text"
                value={newTaskText}
                onChange={(event) => setNewTaskText(event.target.value)}
                placeholder="Que devez-vous faire ?"
                className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-5 pr-14 text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={submitting || !newTaskText.trim()}
                className="absolute right-2 rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
                aria-label="Ajouter une tache"
              >
                <Plus size={20} />
              </button>
            </form>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {filters.map((currentFilter) => (
                  <button
                    key={currentFilter}
                    type="button"
                    onClick={() => setFilter(currentFilter)}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${
                      filter === currentFilter
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>
                      {currentFilter === "toutes" && "Toutes"}
                      {currentFilter === "a_faire" && "A faire"}
                      {currentFilter === "terminees" && "Terminees"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        filter === currentFilter
                          ? "bg-white text-slate-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getFilterCount(currentFilter)}
                    </span>
                  </button>
                ))}
              </div>

              <span className="font-medium text-slate-500">
                {activeTasksCount} tache{activeTasksCount > 1 ? "s" : ""} restante{activeTasksCount > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            <AnimatePresence initial={false} mode="popLayout">
              {loading ? (
                <motion.li
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  Chargement...
                </motion.li>
              ) : filteredTasks.length === 0 ? (
                <motion.li
                  key="empty"
                  initial={{ opacity: 0, paddingTop: 0, paddingBottom: 0 }}
                  animate={{ opacity: 1, paddingTop: 48, paddingBottom: 48 }}
                  exit={{ opacity: 0, paddingTop: 0, paddingBottom: 0 }}
                  className="text-center text-slate-400"
                >
                  {filter === "terminees"
                    ? "Aucune tache terminee."
                    : filter === "a_faire"
                      ? "Vous n'avez aucune tache en cours."
                      : "Votre liste est vide. Ajoutez une tache ci-dessus."}
                </motion.li>
              ) : (
                filteredTasks.map((task) => (
                  <motion.li
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-4"
                      onClick={() => toggleTask(task)}
                    >
                      <button
                        type="button"
                        className={`flex-shrink-0 transition-colors ${
                          task.completed ? "text-blue-500" : "text-slate-300 hover:text-blue-400"
                        }`}
                        aria-label="Changer le statut"
                      >
                        {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>

                      <span
                        className={`text-base transition-all duration-200 ${
                          task.completed ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                      aria-label="Supprimer la tache"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </ul>

          {tasks.some((task) => task.completed) && (
            <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={clearCompleted}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                Effacer les taches terminees
              </button>
            </div>
          )}
        </motion.div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Appuyez sur Entree pour ajouter une tache
        </p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
      <span className="font-medium text-slate-900">{value}</span>
      <span>{label}</span>
    </div>
  );
}

export default App;
