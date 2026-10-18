export default function SystemPage() {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Estado del sistema
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Diagnósticos y salud de los servicios del laboratorio (entrega ticket 06).
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Esta sección se completará en el ticket 06.
        </p>
      </div>
    </div>
  );
}
