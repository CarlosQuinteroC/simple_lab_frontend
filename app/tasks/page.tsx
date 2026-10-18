'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/login-form';
import { CreateTaskModal } from '@/components/create-task-modal';
import { EditTaskModal } from '@/components/edit-task-modal';
import { fetchTasks, createTask, updateTask, Task, TaskStatus, ApiError, STATUS_LABELS, STATUS_COLORS } from '@/lib/api';

type FilterType = 'all' | TaskStatus;

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'En curso', value: 'in_progress' },
  { label: 'Completadas', value: 'completed' },
];

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mb-4">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function TasksList() {
  const { token, handleSessionExpired } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Create Task Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Edit Task Modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const editButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    let ignore = false;

    if (token) {
      fetchTasks({
        page: currentPage,
        pageSize: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        token,
      })
        .then((response) => {
          if (!ignore) {
            setTasks(response.items);
            setIsLoadingTasks(false);
          }
        })
        .catch((err: unknown) => {
          if (ignore) return;
          if (err instanceof ApiError && err.isUnauthorized) {
            handleSessionExpired('Su sesión ha expirado o no es válida. Inicie sesión nuevamente.');
            return;
          }
          setTasks([]);
          setTasksError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado al cargar las tareas.');
          setIsLoadingTasks(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [token, currentPage, statusFilter, reloadTrigger, handleSessionExpired]);

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === statusFilter) return;
    setIsLoadingTasks(true);
    setTasksError(null);
    setTasks([]);
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setIsLoadingTasks(true);
    setTasksError(null);
    setTasks([]);
    setCurrentPage(newPage);
  };

  const handleRetry = () => {
    setIsLoadingTasks(true);
    setTasksError(null);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    createButtonRef.current?.focus();
  };

  const handleCreateTask = async (title: string) => {
    try {
      await createTask({ title }, { token: token ?? undefined });
      setReloadTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        handleSessionExpired('Su sesión ha expirado o no es válida. Inicie sesión nuevamente.');
      }
      throw err;
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
  };

  const handleCloseEditModal = () => {
    const taskId = editingTask?.id;
    setEditingTask(null);
    if (taskId) {
      editButtonRefs.current.get(taskId)?.focus();
    }
  };

  const handleUpdateTask = async (id: string, updates: { title: string; status: TaskStatus }) => {
    try {
      await updateTask(id, updates, { token: token ?? undefined });
      setReloadTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        handleSessionExpired('Su sesión ha expirado o no es válida. Inicie sesión nuevamente.');
      }
      throw err;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const showPagination = !isLoadingTasks && (tasks.length > 0 || (tasksError !== null && currentPage > 1));

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Tareas de laboratorio
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Consulta y filtra las tareas registradas en el sistema.
          </p>
        </div>
        <button
          type="button"
          ref={createButtonRef}
          onClick={handleOpenCreateModal}
          className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva tarea</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 items-center" role="region" aria-label="Filtros por estado">
        {FILTER_OPTIONS.map((option) => {
          const isSelected = statusFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange(option.value)}
              aria-pressed={isSelected}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {tasksError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{tasksError}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoadingTasks ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center p-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Cargando tareas...</p>
        </div>
      ) : !tasksError && tasks.length === 0 ? (
        /* Empty states */
        currentPage > 1 ? (
          <EmptyState
            title="Página vacía"
            description={`No hay más tareas registradas en la página ${currentPage}.`}
            action={{
              label: 'Volver a la página anterior',
              onClick: () => handlePageChange(Math.max(1, currentPage - 1)),
            }}
          />
        ) : (
          <EmptyState
            title={statusFilter === 'all' ? 'No hay tareas registradas' : 'No hay tareas con este estado'}
            description={
              statusFilter === 'all'
                ? 'Actualmente no existen tareas en esta consulta.'
                : 'No se encontraron tareas con el filtro seleccionado.'
            }
          />
        )
      ) : tasks.length > 0 ? (
        /* Tasks List Table */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50">
                  <th scope="col" className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    Título
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    Estado
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    Fecha de creación
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    data-task-id={task.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_COLORS[task.status] || 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) {
                            editButtonRefs.current.set(task.id, el);
                          } else {
                            editButtonRefs.current.delete(task.id);
                          }
                        }}
                        onClick={() => handleOpenEditModal(task)}
                        aria-label={`Editar tarea ${task.title}`}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Pagination Controls */}
      {showPagination && (
        <nav
          aria-label="Paginación de tareas"
          className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
        >
          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            Página {currentPage}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoadingTasks}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={tasks.length < 20 || isLoadingTasks}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}

      {/* Modal de creación de tarea */}
      {isCreateModalOpen && (
        <CreateTaskModal
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Modal de edición de tarea */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={handleCloseEditModal}
          onSubmit={handleUpdateTask}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span className="text-sm font-medium">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  return <TasksList key={user.id} />;
}
