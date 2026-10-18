'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getApiBaseUrl, fetchLiveness } from '@/lib/api';

type ConnectionState = 'checking' | 'connected' | 'disconnected';

export default function HomePage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [connectionDetails, setConnectionDetails] = useState<string>('Verificando disponibilidad de la API...');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const apiBaseUrl = getApiBaseUrl();

  const handleRecheck = useCallback(() => {
    setConnectionState('checking');
    setConnectionDetails('Verificando disponibilidad de la API...');
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchLiveness()
      .then((live) => {
        if (!ignore) {
          if (live.ok) {
            setConnectionState('connected');
            setConnectionDetails(live.message || 'API conectada y operativa.');
          } else {
            setConnectionState('disconnected');
            setConnectionDetails(live.message || 'La API respondió con error.');
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setConnectionState('disconnected');
          setConnectionDetails('No se pudo establecer conexión con la API.');
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadTrigger]);

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Panel de Inicio
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Bienvenido al sistema de operaciones y control de laboratorio SimpleLab.
        </p>
      </header>

      {/* Indicador de conexión con la API configurada */}
      <section
        aria-labelledby="api-status-heading"
        className="mb-8 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 id="api-status-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Conexión con la API
              </h3>
              {connectionState === 'checking' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></span>
                  Comprobando...
                </span>
              )}
              {connectionState === 'connected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Conectada
                </span>
              )}
              {connectionState === 'disconnected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Sin conexión
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              URL configurada:{' '}
              <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                {apiBaseUrl}
              </code>
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
              {connectionDetails}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecheck}
            disabled={connectionState === 'checking'}
            className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Recomprobar conexión
          </button>
        </div>
      </section>

      {/* Accesos directos principales */}
      <nav aria-label="Accesos directos principales" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/tasks"
          className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-colors group block focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Gestión de Tareas
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Consulta, crea, edita, filtra y administra las tareas asignadas en el laboratorio.
          </p>
        </Link>

        <Link
          href="/system"
          className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group block focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Estado del Sistema
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Diagnóstico detallado e independiente de disponibilidad (liveness), dependencias (readiness) y versión de la API.
          </p>
        </Link>
      </nav>
    </div>
  );
}
