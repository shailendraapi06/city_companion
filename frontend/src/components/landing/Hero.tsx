import { Link } from 'react-router-dom'

const particles = [
  { left: '10%', top: '22%', size: 5, delay: '0s', duration: 9 },
  { left: '22%', top: '60%', size: 3, delay: '1.2s', duration: 11 },
  { left: '34%', top: '16%', size: 4, delay: '2.4s', duration: 8 },
  { left: '58%', top: '68%', size: 6, delay: '0.6s', duration: 12 },
  { left: '72%', top: '28%', size: 3, delay: '1.8s', duration: 10 },
  { left: '84%', top: '55%', size: 5, delay: '3s', duration: 9 },
  { left: '48%', top: '84%', size: 4, delay: '2s', duration: 13 },
  { left: '90%', top: '78%', size: 3, delay: '0.9s', duration: 8 },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="anim-float absolute -right-24 -top-40 h-96 w-96 rounded-full opacity-70 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgb(124 140 255 / 0.28), transparent 70%)',
          }}
        />
        <div
          className="anim-float absolute -left-24 top-24 h-80 w-80 rounded-full opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgb(94 226 194 / 0.2), transparent 70%)',
            animationDelay: '1.4s',
            animationDuration: '14s',
          }}
        />
        <div
          className="anim-glow absolute bottom-0 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(124 140 255 / 0.14), transparent 70%)' }}
        />
        {particles.map((p, i) => (
          <span
            key={i}
            className="anim-float absolute rounded-full bg-accent-1/50"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[75vh] sm:px-6 sm:py-24">
        <h1 className="anim-fade-up max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
          Every new city deserves a <span className="text-gradient">familiar friend</span>.
        </h1>
        <p
          className="anim-fade-up mt-6 max-w-xl text-base text-text-secondary sm:text-lg"
          style={{ animationDelay: '120ms' }}
        >
          Tell City Companion what you need — a PG near your college, affordable food, a nearby hospital
          — and get ranked, verified places matched to your budget and location in seconds.
        </p>
        <div className="anim-fade-up mt-10" style={{ animationDelay: '240ms' }}>
          <Link to="/chat" className="btn-primary px-8 py-3.5 text-base">
            Start Exploring
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
