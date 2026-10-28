function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 sm:p-12">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-200">
          <span className="size-2 rounded-full bg-cyan-300" />
          Ready for your next idea
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          React, Vite
          <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            and Tailwind CSS.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
          Your project is set up. Start building in{' '}
          <code className="rounded-md bg-white/10 px-2 py-1 font-mono text-sm text-cyan-200">
            src/App.jsx
          </code>
          .
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            href="https://react.dev/"
            target="_blank"
            rel="noreferrer"
          >
            React docs
          </a>
          <a
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            href="https://tailwindcss.com/docs"
            target="_blank"
            rel="noreferrer"
          >
            Tailwind docs
          </a>
        </div>
      </section>
    </main>
  )
}

export default App
