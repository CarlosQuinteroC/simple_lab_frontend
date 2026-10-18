import { getSupabase } from './supabase';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface PagedTasksResponse {
  items: Task[];
  page: number;
  pageSize: number;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export class ApiError extends Error {
  status: number;
  isUnauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isUnauthorized = status === 401;
  }
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5084';
}

export async function fetchTasks(options: {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  token?: string;
}): Promise<PagedTasksResponse> {
  const baseUrl = getApiBaseUrl();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const url = new URL('/api/tasks', baseUrl);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pageSize));

  if (options.status) {
    url.searchParams.set('status', options.status);
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

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let errorMessage = 'Error al consultar las tareas.';
      if (res.status >= 500) {
        errorMessage = 'Error en el servidor al consultar las tareas.';
      } else {
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // use default
        }
      }
      throw new ApiError(errorMessage, res.status);
    }

    const data = await res.json();
    return {
      items: data.items ?? [],
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
    };
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

export async function createTask(
  data: { title: string },
  options?: { token?: string }
): Promise<Task> {
  const baseUrl = getApiBaseUrl();
  const url = new URL('/api/tasks', baseUrl);

  let authToken = options?.token;
  if (!authToken) {
    const supabase = getSupabase();
    const session = (await supabase.auth.getSession()).data.session;
    authToken = session?.access_token;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: data.title.trim() }),
    });

    if (!res.ok) {
      let errorMessage = 'Error al crear la tarea.';
      if (res.status >= 500) {
        errorMessage = 'Error en el servidor al crear la tarea.';
      } else {
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // use default
        }
      }
      throw new ApiError(errorMessage, res.status);
    }

    const createdTask = (await res.json()) as Task;
    return createdTask;
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

export async function updateTask(
  id: string,
  data: { title: string; status: TaskStatus },
  options?: { token?: string }
): Promise<Task> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`/api/tasks/${encodeURIComponent(id)}`, baseUrl);

  let authToken = options?.token;
  if (!authToken) {
    const supabase = getSupabase();
    const session = (await supabase.auth.getSession()).data.session;
    authToken = session?.access_token;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: data.title.trim(),
        status: data.status,
      }),
    });

    if (!res.ok) {
      let errorMessage = 'Error al actualizar la tarea.';
      if (res.status === 404) {
        errorMessage = 'La tarea solicitada no existe o no está disponible.';
      } else if (res.status >= 500) {
        errorMessage = 'Error en el servidor al actualizar la tarea.';
      } else {
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // use default
        }
      }
      throw new ApiError(errorMessage, res.status);
    }

    if (res.status === 204) {
      return {
        id,
        title: data.title.trim(),
        status: data.status,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const updatedTask = (await res.json()) as Task;
      return updatedTask;
    } catch {
      return {
        id,
        title: data.title.trim(),
        status: data.status,
        createdAt: new Date().toISOString(),
      };
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

export async function deleteTask(
  id: string,
  options?: { token?: string }
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`/api/tasks/${encodeURIComponent(id)}`, baseUrl);

  let authToken = options?.token;
  if (!authToken) {
    const supabase = getSupabase();
    const session = (await supabase.auth.getSession()).data.session;
    authToken = session?.access_token;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      let errorMessage = 'Error al eliminar la tarea.';
      if (res.status === 404) {
        errorMessage = 'La tarea solicitada no existe o ya fue eliminada.';
      } else if (res.status >= 500) {
        errorMessage = 'Error en el servidor al eliminar la tarea.';
      } else {
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // use default
        }
      }
      throw new ApiError(errorMessage, res.status);
    }

    // 204 No Content is success
    return;
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
