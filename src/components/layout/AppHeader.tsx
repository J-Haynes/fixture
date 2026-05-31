export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center bg-slate-900 text-white px-4 shadow-sm">
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
        <span className="text-xl" aria-hidden="true">🏟️</span>
        <span className="font-bold text-lg tracking-tight">Fixture</span>
      </div>
    </header>
  );
}
