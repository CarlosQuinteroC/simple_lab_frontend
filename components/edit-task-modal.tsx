'use client';

import React, { useState, useRef } from 'react';
import { Task, TaskStatus, STATUS_LABELS, ApiError } from '@/lib/api';
import { validateTaskTitle } from '@/lib/task-validation';
import { useModalFocusTrap } from '@/components/use-modal-focus-trap';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSubmit: (id: string, updates: { title: string; status: TaskStatus }) => Promise<void>;
}

export function EditTaskModal({ task, onClose, onSubmit }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus trap, initial focus and background inerting
  useModalFocusTrap({
    modalRef,
    initialFocusRef: inputRef,
    onClose,
    isSubmitting,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const error = validateTaskTitle(title);
    if (error) {
      setValidationError(error);
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(task.id, {
        title: title.trim(),
        status,
      });
      onClose();
    } catch (err: unknown) {
      // Preserve edited title and status on failure!
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Ocurrió un error inesperado al actualizar la tarea.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3
            id="edit-task-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Editar tarea
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-50 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="edit-task-title"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Título
            </label>
            <input
              id="edit-task-title"
              name="title"
              type="text"
              ref={inputRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
                if (submitError) setSubmitError(null);
              }}
              disabled={isSubmitting}
              maxLength={200}
              placeholder="Ej. Análisis de muestra #104"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'edit-task-title-error' : undefined}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {validationError && (
              <p
                id="edit-task-title-error"
                role="alert"
                className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium"
              >
                {validationError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-task-status"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Estado
            </label>
            <select
              id="edit-task-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="pending">{STATUS_LABELS.pending}</option>
              <option value="in_progress">{STATUS_LABELS.in_progress}</option>
              <option value="completed">{STATUS_LABELS.completed}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
