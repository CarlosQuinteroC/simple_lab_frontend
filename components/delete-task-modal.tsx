'use client';

import React, { useState, useRef } from 'react';
import { Task, ApiError } from '@/lib/api';
import { useModalFocusTrap } from '@/components/use-modal-focus-trap';

interface DeleteTaskModalProps {
  task: Task;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteTaskModal({ task, onClose, onConfirm }: DeleteTaskModalProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap, initial focus and background inerting
  useModalFocusTrap({
    modalRef,
    initialFocusRef: cancelButtonRef,
    onClose,
    isSubmitting: isDeleting,
  });

  const handleDelete = async () => {
    if (isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await onConfirm(task.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Ocurrió un error inesperado al eliminar la tarea.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-task-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3
            id="delete-task-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Eliminar tarea
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Cerrar modal"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-50 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {deleteError && (
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
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            ¿Está seguro de que desea eliminar la tarea{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              «{task.title}»
            </span>
            ? Esta acción no se puede deshacer.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Eliminando...</span>
                </>
              ) : (
                'Eliminar tarea'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
