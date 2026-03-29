import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCheck,
  CheckCircle2,
  Circle,
  ListTodo,
  PencilLine,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";

const filters = ["toutes", "a_faire", "terminees"];

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("toutes");
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  // Calcul local de secours si la route de stats ne repond pas.
  const localActiveTasksCount = tasks.filter((task) => !task.completed).length;
  const localDoneTasksCount = tasks.length - localActiveTasksCount;
  const totalTasksCount = stats?.total ?? tasks.length;
  const activeTasksCount = stats?.remaining ?? localActiveTasksCount;
  const doneTasksCount = stats?.completed ?? localDoneTasksCount;
  const completionRate = totalTasksCount === 0 ? 0 : Math.round((doneTasksCount / totalTasksCount) * 100);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return tasks.filter((task) => {
      if (filter === "a_faire" && task.completed) {
        return false;
      }

      if (filter === "terminees" && !task.completed) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      // Recherche geree cote front.
      const searchableText = `${task.title} ${task.description || ""}`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [filter, searchText, tasks]);

  function getFilterCount(currentFilter) {
    if (currentFilter === "a_faire") {
      return activeTasksCount;
    }

    if (currentFilter === "terminees") {
      return doneTasksCount;
    }

    return totalTasksCount;
  }

  function resetEditingState() {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function beginTaskEdit(task) {
    setError("");
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
  }

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      // Recharge de la liste complete apres chaque action.
      // Recuperation des stats dans la meme sequence.
      const [tasksResult, statsResult] = await Promise.allSettled([
        fetch("/api/tasks"),
        fetch("/api/tasks/stats")
      ]);

      if (tasksResult.status !== "fulfilled" || !tasksResult.value.ok) {
        throw new Error("Impossible de charger les taches.");
      }

      const tasksData = await tasksResult.value.json();
      setTasks(tasksData);

      if (statsResult.status === "fulfilled" && statsResult.value.ok) {
        const statsData = await statsResult.value.json();
        setStats(statsData);
      } else {
        setStats(null);
      }
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
          description: newTaskDescription.trim(),
          completed: false
        })
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        throw new Error(apiError?.message || "Impossible d'ajouter la tache.");
      }

      setNewTaskText("");
      setNewTaskDescription("");
      setShowDescriptionField(false);
      // Recharge complete de la liste apres creation.
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
      // Envoi de toute la tache pour rester coherent avec le DTO du back.
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
    if (editingTaskId === id) {
      resetEditingState();
    }

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
      // Suppression en lot des taches deja terminees.
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

  async function saveTaskEdits(task) {
    const trimmedTitle = editingTitle.trim();

    if (!trimmedTitle) {
      setError("Le titre ne peut pas etre vide.");
      return;
    }

    setSavingTaskId(task.id);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: editingDescription.trim(),
          completed: task.completed
        })
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        throw new Error(apiError?.message || "Impossible d'enregistrer les modifications.");
      }

      resetEditingState();
      await loadTasks();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingTaskId(null);
    }
  }

  async function completeAllTasks() {
    if (activeTasksCount === 0) {
      return;
    }

    // Desactivation du bouton pendant la requete pour eviter les doubles clics.
    setBulkUpdating(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/complete-all", {
        method: "PUT"
      });

      if (!response.ok) {
        throw new Error("Impossible de terminer toutes les taches.");
      }

      await loadTasks();
    } catch (completeAllError) {
      setError(completeAllError.message);
    } finally {
      setBulkUpdating(false);
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Todo Lucas</h1>
            <p className="mt-1 text-sm text-slate-500">
              {totalTasksCount === 0
                ? "Suivi simple des taches du moment"
                : `${doneTasksCount} tache${doneTasksCount > 1 ? "s" : ""} terminee${doneTasksCount > 1 ? "s" : ""} sur ${totalTasksCount}`}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="mb-6 flex flex-wrap gap-3"
        >
          <SummaryPill label="Total" value={totalTasksCount} />
          <SummaryPill label="A faire" value={activeTasksCount} />
          <SummaryPill label="Terminees" value={doneTasksCount} />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            API connectee
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mb-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">Progression</span>
            <span className="text-slate-500">{completionRate}% termine</span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {activeTasksCount === 0 && totalTasksCount > 0
              ? "Tout est termine pour le moment."
              : `${activeTasksCount} tache${activeTasksCount > 1 ? "s" : ""} encore a faire.`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 p-6">
            <form onSubmit={addTask} className="space-y-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(event) => setNewTaskText(event.target.value)}
                  placeholder="Que devez-vous faire ?"
                  maxLength={120}
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
              </div>

              {showDescriptionField && (
                <textarea
                  value={newTaskDescription}
                  onChange={(event) => setNewTaskDescription(event.target.value)}
                  placeholder="Ajouter un detail utile si besoin"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setShowDescriptionField((currentValue) => !currentValue)}
                  className="font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  {showDescriptionField ? "Masquer le detail" : "Ajouter un detail"}
                </button>

                {showDescriptionField && (
                  <span className="text-xs text-slate-400">
                    {newTaskDescription.trim().length}/500 caracteres
                  </span>
                )}
              </div>
            </form>

            {tasks.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Rechercher une tache"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-20 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />

                  {searchText.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={completeAllTasks}
                  disabled={bulkUpdating || activeTasksCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck size={16} />
                  Tout terminer
                </button>
              </div>
            )}
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
                  {searchText.trim()
                    ? "Aucune tache ne correspond a votre recherche."
                    : filter === "terminees"
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
                    className={`group px-6 py-4 transition-colors ${
                      editingTaskId === task.id ? "bg-slate-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    {editingTaskId === task.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveTaskEdits(task);
                        }}
                        className="flex flex-col gap-4 sm:flex-row sm:items-start"
                      >
                        <span
                          className={`pt-1 ${
                            task.completed ? "text-blue-500" : "text-slate-300"
                          }`}
                        >
                          {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </span>

                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            maxLength={120}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />

                          <textarea
                            value={editingDescription}
                            onChange={(event) => setEditingDescription(event.target.value)}
                            placeholder="Ajouter un detail si besoin"
                            maxLength={500}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />

                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                            <span>Maj {formatTaskDate(task.updatedAt)}</span>
                            <span>{editingDescription.trim().length}/500 caracteres</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                          <button
                            type="submit"
                            disabled={savingTaskId === task.id || !editingTitle.trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                          >
                            <Save size={16} />
                            Enregistrer
                          </button>

                          <button
                            type="button"
                            onClick={resetEditingState}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                          >
                            <X size={16} />
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-4 text-left"
                          onClick={() => toggleTask(task)}
                        >
                          <span
                            className={`flex-shrink-0 transition-colors ${
                              task.completed ? "text-blue-500" : "text-slate-300 hover:text-blue-400"
                            }`}
                            aria-hidden="true"
                          >
                            {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </span>

                          <span className="min-w-0">
                            <span
                              className={`block text-base transition-all duration-200 ${
                                task.completed ? "text-slate-400 line-through" : "text-slate-700"
                              }`}
                            >
                              {task.title}
                            </span>

                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                              {task.description && (
                                <span className="max-w-xs truncate sm:max-w-sm">{task.description}</span>
                              )}
                              <span>Maj {formatTaskDate(task.updatedAt)}</span>
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => beginTaskEdit(task)}
                            className="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
                            aria-label="Modifier la tache"
                          >
                            <PencilLine size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                            aria-label="Supprimer la tache"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
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
          Appuyez sur Entree dans le champ titre pour ajouter une tache
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

function formatTaskDate(value) {
  if (!value) {
    return "--";
  }

  // Formatage de la date brute avant affichage dans l'UI.
  const parsedDate = new Date(value.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsedDate);
}

export default App;
