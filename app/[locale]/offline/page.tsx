export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 mx-auto flex items-center justify-center mb-6">
          <span className="text-4xl">📡</span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">
          Нет подключения
        </h1>
        <p className="text-on-surface-variant mb-6">
          Проверьте интернет-соединение. Ваши оценки сохранены локально и синхронизируются автоматически при восстановлении связи.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-medium"
        >
          Повторить подключение
        </button>
      </div>
    </div>
  )
}
