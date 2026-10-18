'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/login-form';
import { fetchTasks, Task, ApiError, STATUS_LABELS, STATUS_COLORS } from '@/lib/api';

function TasksList() {
  const { token, handleSessionExpired } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!token) return;

    setIsLoadingTasks(true);
    setTasksError(null);

    try {
      const response = await fetchTasks({ page: 1, pageSize: 20, token });
      setTasks(response.items);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isUnauthorized) {
          handleSessionExpired('Su sesión ha expirado o no es válida. Inicie sesión nuevamente.');
          return;
        }
        setTasksError(err.message);
      } else {
        setTasksError('Ocurrió un error inesperado al cargar las tareas.');
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }, [token, handleSessionExpired]);

  useEffect(() => {
    let ignore = false;

    if (token) {
      fetchTasks({ page: 1, pageSize: 20, token })
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
          setTasksError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado al cargar las tareas.');
          setIsLoadingTasks(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [token, handleSessionExpired]);

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

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Tareas de laboratorio
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Consulta las primeras 20 tareas registradas en el sistema.
          </p>
        </div>
      </header>

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
            onClick={loadTasks}
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
        /* Empty state */
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
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No hay tareas registradas</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
            Actualmente no existen tareas en esta consulta.
          </p>
        </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
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
