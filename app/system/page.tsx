'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchLiveness,
  fetchReadiness,
  fetchVersion,
  HealthCheckResult,
  VersionResult,
  getApiBaseUrl,
} from '@/lib/api';

interface DiagnosticState<T> {
  isLoading: boolean;
  data: T | null;
}

export default function SystemPage() {
  const [livenessState, setLivenessState] = useState<DiagnosticState<HealthCheckResult>>({
    isLoading: true,
    data: null,
  });
  const [readinessState, setReadinessState] = useState<DiagnosticState<HealthCheckResult>>({
    isLoading: true,
    data: null,
  });
  const [versionState, setVersionState] = useState<DiagnosticState<VersionResult>>({
    isLoading: true,
    data: null,
  });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const apiBaseUrl = getApiBaseUrl();

  const handleRefresh = useCallback(() => {
    setLivenessState((prev) => ({ ...prev, isLoading: true }));
    setReadinessState((prev) => ({ ...prev, isLoading: true }));
    setVersionState((prev) => ({ ...prev, isLoading: true }));
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    // 1. Liveness check
    fetchLiveness()
      .then((data) => {
        if (!ignore) setLivenessState({ isLoading: false, data });
      })
      .catch(() => {
        if (!ignore) {
          setLivenessState({
            isLoading: false,
            data: {
              ok: false,
              status: 'Error',
              message: 'Error de comunicación al consultar el estado de liveness.',
            },
          });
        }
      });

    // 2. Readiness check (independent)
    fetchReadiness()
      .then((data) => {
        if (!ignore) setReadinessState({ isLoading: false, data });
      })
      .catch(() => {
        if (!ignore) {
          setReadinessState({
            isLoading: false,
            data: {
              ok: false,
              status: 'Error',
              message: 'Error de comunicación al consultar el estado de readiness.',
            },
          });
        }
      });

    // 3. Version check (independent)
    fetchVersion()
      .then((data) => {
        if (!ignore) setVersionState({ isLoading: false, data });
      })
      .catch(() => {
        if (!ignore) {
          setVersionState({
            isLoading: false,
            data: {
              ok: false,
              error: 'Error de comunicación al consultar la versión de la API.',
            },
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadTrigger]);

  const isAnyLoading =
    livenessState.isLoading || readinessState.isLoading || versionState.isLoading;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Estado del sistema
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Diagnóstico de disponibilidad, dependencias y versión del servicio backend.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isAnyLoading}
          className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isAnyLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Consultando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar diagnósticos</span>
            </>
          )}
        </button>
      </header>

      {/* API URL Info banner */}
      <div className="mb-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Endpoint base configurado:</span>{' '}
          <code className="font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200">
            {apiBaseUrl}
          </code>
        </div>
        <span className="text-zinc-500 dark:text-zinc-400">Consultas públicas independientes sin credenciales requeridas</span>
      </div>

      {/* Cards de diagnósticos independientes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Liveness: Disponibilidad del proceso */}
        <section
          aria-labelledby="liveness-card-title"
          className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                /health/live
              </span>
              {livenessState.isLoading ? (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Consultando...
                </span>
              ) : livenessState.data?.ok ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Saludable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  No disponible
                </span>
              )}
            </div>

            <h3 id="liveness-card-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Disponibilidad del proceso
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Verifica si el proceso del servicio web de la API se encuentra en ejecución y puede responder peticiones HTTP.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            {livenessState.isLoading ? (
              <p className="text-xs text-zinc-400">Verificando liveness...</p>
            ) : livenessState.data ? (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium break-words">
                {livenessState.data.message}
              </p>
            ) : null}
          </div>
        </section>

        {/* 2. Readiness: Dependencia de datos */}
        <section
          aria-labelledby="readiness-card-title"
          className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                /health/ready
              </span>
              {readinessState.isLoading ? (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Consultando...
                </span>
              ) : readinessState.data?.ok ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Saludable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Degradado
                </span>
              )}
            </div>

            <h3 id="readiness-card-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Dependencia de datos
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Verifica el acceso y conectividad a la base de datos subyacente. No comprueba ni garantiza el funcionamiento del inicio de sesión (Supabase Auth).
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            {readinessState.isLoading ? (
              <p className="text-xs text-zinc-400">Verificando readiness...</p>
            ) : readinessState.data ? (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium break-words">
                {readinessState.data.message}
              </p>
            ) : null}
          </div>
        </section>

        {/* 3. Versión de la API */}
        <section
          aria-labelledby="version-card-title"
          className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                /version
              </span>
              {versionState.isLoading ? (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Consultando...
                </span>
              ) : versionState.data?.ok ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Disponible
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                  Error
                </span>
              )}
            </div>

            <h3 id="version-card-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Versión de la API
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Versión informada directamente por el servicio backend sin métricas inventadas.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            {versionState.isLoading ? (
              <p className="text-xs text-zinc-400">Consultando versión...</p>
            ) : versionState.data?.ok ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Versión:</span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {versionState.data.version}
                </span>
              </div>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {versionState.data?.error || 'No se pudo obtener la versión.'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
