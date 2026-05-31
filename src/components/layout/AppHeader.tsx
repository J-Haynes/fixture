export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center bg-zinc-950 border-b border-zinc-800 px-4">
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
        <span className="text-xl" aria-hidden="true">🏉</span>
        <span className="font-bold text-lg tracking-tight text-zinc-100">Fixture</span>
      </div>
    </header>
  );
}
