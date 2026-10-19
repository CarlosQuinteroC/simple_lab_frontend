import { getSupabase } from './supabase';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

export interface PagedTasksResponse {
  items: Task[];
  page: number;
  pageSize: number;
  total?: number;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
};

export class ApiError extends Error {
  public status: number;
  public isUnauthorized: boolean;

  constructor(message: string, status: number = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isUnauthorized = status === 401;
  }
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5084';
}

/* ========================================================================= */
/* Authenticated HTTP transport helper                                       */
/* ========================================================================= */

interface ApiFetchOptions {
  method?: string;
  path: string;
  token?: string;
  body?: unknown;
  searchParams?: Record<string, string | undefined>;
  defaultErrorMessage: string;
  serverErrorMessage: string;
  notFoundErrorMessage?: string;
}

async function authenticatedFetch<T>(options: ApiFetchOptions): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(options.path, baseUrl);

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  let authToken = options.token;
  if (!authToken) {
    const supabase = getSupabase();
    const session = (await supabase.auth.getSession()).data.session;
    authToken = session?.access_token;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let errorMessage = options.defaultErrorMessage;
      if (res.status === 404 && options.notFoundErrorMessage) {
        errorMessage = options.notFoundErrorMessage;
      } else if (res.status >= 500) {
        errorMessage = options.serverErrorMessage;
      } else {
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // use default message
        }
      }
      throw new ApiError(errorMessage, res.status);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    try {
      return (await res.json()) as T;
    } catch {
      return undefined as T;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      'Error de red o comunicación al conectar con el servicio de tareas.',
      0
    );
  }
}

export async function fetchTasks(options: {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  token?: string;
}): Promise<PagedTasksResponse> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const data = await authenticatedFetch<{
    items?: Task[];
    page?: number;
    pageSize?: number;
  }>({
    method: 'GET',
    path: '/api/tasks',
    token: options.token,
    searchParams: {
      page: String(page),
      pageSize: String(pageSize),
      status: options.status,
    },
    defaultErrorMessage: 'Error al consultar las tareas.',
    serverErrorMessage: 'Error en el servidor al consultar las tareas.',
  });

  return {
    items: data.items ?? [],
    page: data.page ?? page,
    pageSize: data.pageSize ?? pageSize,
  };
}

export async function createTask(
  data: { title: string },
  options?: { token?: string }
): Promise<Task> {
  return authenticatedFetch<Task>({
    method: 'POST',
    path: '/api/tasks',
    token: options?.token,
    body: { title: data.title.trim() },
    defaultErrorMessage: 'Error al crear la tarea.',
    serverErrorMessage: 'Error en el servidor al crear la tarea.',
  });
}

export async function updateTask(
  id: string,
  data: { title: string; status: TaskStatus },
  options?: { token?: string }
): Promise<Task> {
  const res = await authenticatedFetch<Task | undefined>({
    method: 'PUT',
    path: `/api/tasks/${encodeURIComponent(id)}`,
    token: options?.token,
    body: {
      title: data.title.trim(),
      status: data.status,
    },
    defaultErrorMessage: 'Error al actualizar la tarea.',
    notFoundErrorMessage: 'La tarea solicitada no existe o no está disponible.',
    serverErrorMessage: 'Error en el servidor al actualizar la tarea.',
  });

  if (!res || !res.id) {
    return {
      id,
      title: data.title.trim(),
      status: data.status,
      createdAt: new Date().toISOString(),
    };
  }

  return res;
}

export async function deleteTask(
  id: string,
  options?: { token?: string }
): Promise<void> {
  return authenticatedFetch<void>({
    method: 'DELETE',
    path: `/api/tasks/${encodeURIComponent(id)}`,
    token: options?.token,
    defaultErrorMessage: 'Error al eliminar la tarea.',
    notFoundErrorMessage: 'La tarea solicitada no existe o ya fue eliminada.',
    serverErrorMessage: 'Error en el servidor al eliminar la tarea.',
  });
}

/* ========================================================================= */
/* System Diagnostics API (Ticket 06)                                       */
/* ========================================================================= */

export interface HealthCheckResult {
  ok: boolean;
  status: string;
  statusCode?: number;
  message: string;
}

export interface VersionResult {
  ok: boolean;
  version?: string;
  error?: string;
}

export async function fetchLiveness(): Promise<HealthCheckResult> {
  const url = new URL('/health/live', getApiBaseUrl());
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
    });

    if (res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch {
        // ignore
      }
      return {
        ok: true,
        status: 'Healthy',
        statusCode: res.status,
        message: text.trim() || 'Proceso en ejecución y respondiendo.',
      };
    }

    return {
      ok: false,
      status: 'Unhealthy',
      statusCode: res.status,
      message: `El servicio respondió con estado ${res.status}.`,
    };
  } catch {
    return {
      ok: false,
      status: 'Error',
      message: 'No se pudo conectar con el servicio (error de red o API no disponible).',
    };
  }
}

export async function fetchReadiness(): Promise<HealthCheckResult> {
  const url = new URL('/health/ready', getApiBaseUrl());
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
    });

    if (res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch {
        // ignore
      }
      return {
        ok: true,
        status: 'Healthy',
        statusCode: res.status,
        message: text.trim() || 'Acceso a la dependencia de datos operativo.',
      };
    }

    return {
      ok: false,
      status: 'Unhealthy',
      statusCode: res.status,
      message:
        res.status === 503
          ? 'Dependencia de datos no disponible o degradada.'
          : `El servicio respondió con estado ${res.status}.`,
    };
  } catch {
    return {
      ok: false,
      status: 'Error',
      message: 'No se pudo verificar la dependencia de datos (error de red).',
    };
  }
}

export async function fetchVersion(): Promise<VersionResult> {
  const url = new URL('/version', getApiBaseUrl());
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      let version = '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        version =
          typeof data === 'string'
            ? data
            : data.version || data.serviceVersion || data.appVersion || '';
      } else {
        version = (await res.text()).trim();
      }

      if (!version) {
        return {
          ok: false,
          error: 'La respuesta no proporcionó una versión válida.',
        };
      }

      return {
        ok: true,
        version,
      };
    }

    return {
      ok: false,
      error: `Error al consultar versión (código ${res.status}).`,
    };
  } catch {
    return {
      ok: false,
      error: 'No se pudo consultar la versión (error de red o API no disponible).',
    };
  }
}
