import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownUp,
  CornerUpLeft,
  CheckCheck,
  CheckCircle2,
  Circle,
  Copy,
  Flag,
  ListTodo,
  PencilLine,
  Plus,
  Save,
  Search,
  Target,
  Trash2,
  X
} from "lucide-react";

const filters = ["toutes", "a_faire", "terminees"];
const sortOptions = [
  { value: "priority", label: "Priorite" },
  { value: "recent", label: "Recents" },
  { value: "alphabetical", label: "A-Z" }
];
const priorityOptions = [
  {
    value: "LOW",
    label: "Basse",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
    activeClass: "border-slate-300 bg-slate-100 text-slate-700",
    dotClass: "bg-slate-400"
  },
  {
    value: "MEDIUM",
    label: "Moyenne",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    activeClass: "border-amber-300 bg-amber-100 text-amber-800",
    dotClass: "bg-amber-500"
  },
  {
    value: "HIGH",
    label: "Haute",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    activeClass: "border-rose-300 bg-rose-100 text-rose-800",
    dotClass: "bg-rose-500"
  }
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("toutes");
  const [sortBy, setSortBy] = useState("priority");
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingPriority, setEditingPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      // Raccourci simple pour sortir d'un mode de travail sans chercher le bon bouton.
      if (editingTaskId !== null) {
        resetEditingState();
        return;
      }

      if (searchText.trim()) {
        setSearchText("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editingTaskId, searchText]);

  // Calcul local de secours si la route de stats ne repond pas.
  const localActiveTasksCount = tasks.filter((task) => !task.completed).length;
  const localDoneTasksCount = tasks.length - localActiveTasksCount;
  const totalTasksCount = stats?.total ?? tasks.length;
  const activeTasksCount = stats?.remaining ?? localActiveTasksCount;
  const doneTasksCount = stats?.completed ?? localDoneTasksCount;
  const highPriorityTasksCount = tasks.filter(
    (task) => !task.completed && getTaskPriority(task.priority) === "HIGH"
  ).length;
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

      const searchableText = `${task.title} ${task.description || ""}`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [filter, searchText, tasks]);

  const sortedTasks = useMemo(() => {
    // Le tri reste cote client pour garder l'UI reactive sans multiplier les endpoints.
    return [...filteredTasks].sort((taskA, taskB) => compareTasks(taskA, taskB, sortBy));
  }, [filteredTasks, sortBy]);

  const focusTask = useMemo(() => {
    return [...tasks]
      .filter((task) => !task.completed)
      .sort((taskA, taskB) => compareTasks(taskA, taskB, "priority"))[0] ?? null;
  }, [tasks]);

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
    setEditingPriority("MEDIUM");
  }

  function beginTaskEdit(task) {
    setError("");
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
    setEditingPriority(getTaskPriority(task.priority));
  }

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      // Recharge de la liste complete apres chaque action.
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
          priority: newTaskPriority,
          completed: false
        })
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        throw new Error(apiError?.message || "Impossible d'ajouter la tache.");
      }

      setNewTaskText("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setShowDescriptionField(false);
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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          priority: getTaskPriority(task.priority),
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

  async function duplicateTask(task) {
    setDuplicatingTaskId(task.id);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${task.id}/duplicate`, {
        method: "POST"
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        throw new Error(apiError?.message || "Impossible de dupliquer la tache.");
      }

      await loadTasks();
    } catch (duplicateError) {
      setError(duplicateError.message);
    } finally {
      setDuplicatingTaskId(null);
    }
  }

  async function clearCompleted() {
    if (!tasks.some((task) => task.completed)) {
      return;
    }

    setClearingCompleted(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/completed", {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Impossible d'effacer les taches terminees.");
      }

      await loadTasks();
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setClearingCompleted(false);
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
          priority: editingPriority,
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

  async function reopenAllTasks() {
    if (doneTasksCount === 0) {
      return;
    }

    setBulkUpdating(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/reopen-all", {
        method: "PUT"
      });

      if (!response.ok) {
        throw new Error("Impossible de rouvrir les taches.");
      }

      await loadTasks();
    } catch (reopenAllError) {
      setError(reopenAllError.message);
    } finally {
      setBulkUpdating(false);
    }
  }

  async function cycleTaskPriority(task) {
    const nextPriority = getNextPriority(task.priority);

    setError("");

    try {
      // Le changement de priorite passe par la meme route que l'edition complete.
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          priority: nextPriority,
          completed: task.completed
        })
      });

      if (!response.ok) {
        throw new Error("Impossible de changer la priorite.");
      }

      await loadTasks();
    } catch (priorityError) {
      setError(priorityError.message);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-sm">
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
          </div>

          <div className="flex flex-wrap gap-3">
            <SummaryPill label="Total" value={totalTasksCount} />
            <SummaryPill label="A faire" value={activeTasksCount} />
            <SummaryPill label="Terminees" value={doneTasksCount} />
            <SummaryPill label="Haute prio" value={highPriorityTasksCount} accent="rose" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]"
        >
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">Progression</span>
              <span className="text-slate-500">{completionRate}% termine</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Charge active</p>
                <p className="mt-2 text-sm text-slate-600">
                  {activeTasksCount === 0 && totalTasksCount > 0
                    ? "Tout est boucle pour le moment."
                    : `${activeTasksCount} tache${activeTasksCount > 1 ? "s" : ""} encore a faire.`}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vigilance</p>
                <p className="mt-2 text-sm text-slate-600">
                  {highPriorityTasksCount > 0
                    ? `${highPriorityTasksCount} tache${highPriorityTasksCount > 1 ? "s" : ""} haute priorite en attente.`
                    : "Aucun sujet chaud en attente."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Target size={16} />
              <span>Focus du jour</span>
            </div>

            {focusTask ? (
              <div className="mt-4">
                <PriorityBadge priority={focusTask.priority} dark />
                <h2 className="mt-4 text-xl font-semibold leading-tight">{focusTask.title}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {focusTask.description || "Pas de detail ajoute pour cette tache."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>Cree le {formatTaskDate(focusTask.createdAt)}</span>
                  <span>Maj {formatTaskDate(focusTask.updatedAt)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTask(focusTask)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <CheckCircle2 size={16} />
                    Marquer faite
                  </button>
                  <button
                    type="button"
                    onClick={() => beginTaskEdit(focusTask)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                  >
                    <PencilLine size={16} />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleTaskPriority(focusTask)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                  >
                    <Flag size={16} />
                    Priorite suivante
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-xl font-semibold">Aucune tache en attente.</p>
                <p className="text-sm text-slate-300">
                  La liste est a jour. Tu peux ajouter le prochain sujet ou garder la session propre.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 p-6">
            <form onSubmit={addTask} className="space-y-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(event) => setNewTaskText(event.target.value)}
                  placeholder="Que devez-vous faire ?"
                  maxLength={120}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-5 pr-14 text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="submit"
                  disabled={submitting || !newTaskText.trim()}
                  className="absolute right-2 rounded-xl bg-slate-900 p-2 text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900"
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
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Priorite
                  </span>
                  <PriorityPicker value={newTaskPriority} onChange={setNewTaskPriority} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDescriptionField((currentValue) => !currentValue)}
                    className="font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    {showDescriptionField ? "Masquer le detail" : "Ajouter un detail"}
                  </button>

                  <span className="text-xs text-slate-400">
                    {showDescriptionField ? `${newTaskDescription.trim().length}/500 caracteres` : "120 caracteres pour le titre"}
                  </span>
                </div>
              </div>
            </form>

            {tasks.length > 0 && (
              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto_auto]">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Rechercher une tache"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-20 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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

                <label className="relative flex items-center">
                  <ArrowDownUp
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    aria-label="Trier les taches"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Trier par {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={completeAllTasks}
                  disabled={bulkUpdating || activeTasksCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck size={16} />
                  Tout terminer
                </button>

                <button
                  type="button"
                  onClick={reopenAllTasks}
                  disabled={bulkUpdating || doneTasksCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CornerUpLeft size={16} />
                  Tout rouvrir
                </button>
              </div>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 text-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {filters.map((currentFilter) => (
                  <button
                    key={currentFilter}
                    type="button"
                    onClick={() => setFilter(currentFilter)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition-colors ${
                      filter === currentFilter
                        ? "bg-slate-900 text-white"
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
                          ? "bg-white/10 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getFilterCount(currentFilter)}
                    </span>
                  </button>
                ))}
              </div>

              <span className="font-medium text-slate-500">
                {sortedTasks.length} resultat{sortedTasks.length > 1 ? "s" : ""}
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
              ) : sortedTasks.length === 0 ? (
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
                sortedTasks.map((task) => (
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
                        className="flex flex-col gap-4"
                      >
                        <div className="flex gap-4">
                          <span
                            className={`pt-1 ${
                              task.completed ? "text-slate-900" : "text-slate-300"
                            }`}
                          >
                            {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </span>

                          <div className="min-w-0 flex-1 space-y-3">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              maxLength={120}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                            />

                            <textarea
                              value={editingDescription}
                              onChange={(event) => setEditingDescription(event.target.value)}
                              placeholder="Ajouter un detail si besoin"
                              maxLength={500}
                              rows={3}
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                            />

                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  Priorite
                                </span>
                                <PriorityPicker value={editingPriority} onChange={setEditingPriority} compact />
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span>Cree le {formatTaskDate(task.createdAt)}</span>
                                <span>Maj {formatTaskDate(task.updatedAt)}</span>
                                <span>{editingDescription.trim().length}/500 caracteres</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="submit"
                            disabled={savingTaskId === task.id || !editingTitle.trim()}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                          >
                            <Save size={16} />
                            Enregistrer
                          </button>

                          <button
                            type="button"
                            onClick={resetEditingState}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                          >
                            <X size={16} />
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-start gap-4 text-left"
                          onClick={() => toggleTask(task)}
                        >
                          <span
                            className={`mt-1 flex-shrink-0 transition-colors ${
                              task.completed ? "text-slate-900" : "text-slate-300 hover:text-slate-700"
                            }`}
                            aria-hidden="true"
                          >
                            {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </span>

                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span
                                className={`block text-base transition-all duration-200 ${
                                  task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                }`}
                              >
                                {task.title}
                              </span>
                              <PriorityBadge priority={task.priority} onClick={() => cycleTaskPriority(task)} />
                            </span>

                            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                              {task.description && (
                                <span className="max-w-xl truncate">{task.description}</span>
                              )}
                              <span>Cree le {formatTaskDate(task.createdAt)}</span>
                              <span>Maj {formatTaskDate(task.updatedAt)}</span>
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center gap-1 self-end lg:self-auto">
                          <button
                            type="button"
                            onClick={() => duplicateTask(task)}
                            disabled={duplicatingTaskId === task.id}
                            className="rounded-xl p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:bg-transparent"
                            aria-label="Dupliquer la tache"
                          >
                            <Copy size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() => beginTaskEdit(task)}
                            className="rounded-xl p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
                            aria-label="Modifier la tache"
                          >
                            <PencilLine size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="rounded-xl p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
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
                disabled={clearingCompleted}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Effacer les taches terminees
              </button>
            </div>
          )}
        </motion.div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Entree ajoute une tache. Escape ferme l'edition ou efface la recherche.
        </p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, accent = "slate" }) {
  const accentClass =
    accent === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-600";
  const valueClass = accent === "rose" ? "text-rose-900" : "text-slate-900";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-sm ${accentClass}`}
    >
      <span className={`font-medium ${valueClass}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function PriorityPicker({ value, onChange, compact = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {priorityOptions.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors ${
              compact ? "py-1.5" : "py-2"
            } ${
              isActive
                ? option.activeClass
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <Flag size={14} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PriorityBadge({ priority, dark = false, onClick }) {
  const option = priorityOptions.find((entry) => entry.value === getTaskPriority(priority)) ?? priorityOptions[1];

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          dark
            ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
            : `${option.badgeClass} hover:border-slate-300`
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${dark ? "bg-white" : option.dotClass}`} />
        {option.label}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
        dark ? "border-white/15 bg-white/10 text-white" : option.badgeClass
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dark ? "bg-white" : option.dotClass}`} />
      {option.label}
    </span>
  );
}

function getTaskPriority(priority) {
  if (priority === "LOW" || priority === "HIGH") {
    return priority;
  }

  return "MEDIUM";
}

function getNextPriority(priority) {
  const normalizedPriority = getTaskPriority(priority);

  if (normalizedPriority === "LOW") {
    return "MEDIUM";
  }

  if (normalizedPriority === "MEDIUM") {
    return "HIGH";
  }

  return "LOW";
}

function getPriorityWeight(priority) {
  const normalizedPriority = getTaskPriority(priority);

  if (normalizedPriority === "HIGH") {
    return 3;
  }

  if (normalizedPriority === "LOW") {
    return 1;
  }

  return 2;
}

function compareTasks(taskA, taskB, sortBy) {
  const completionDiff = Number(taskA.completed) - Number(taskB.completed);

  if (completionDiff !== 0) {
    return completionDiff;
  }

  if (sortBy === "alphabetical") {
    return taskA.title.localeCompare(taskB.title, "fr", { sensitivity: "base" });
  }

  if (sortBy === "recent") {
    return getSortableDate(taskB.updatedAt) - getSortableDate(taskA.updatedAt);
  }

  const priorityDiff = getPriorityWeight(taskB.priority) - getPriorityWeight(taskA.priority);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return getSortableDate(taskB.updatedAt) - getSortableDate(taskA.updatedAt);
}

function getSortableDate(value) {
  if (!value) {
    return 0;
  }

  const parsedDate = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function formatTaskDate(value) {
  if (!value) {
    return "--";
  }

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
