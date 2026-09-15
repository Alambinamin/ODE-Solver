// presets.js — built-in ODEs with known closed-form solutions.
// Each preset carries f(t, y), an exact(t) solution, and default parameters,
// so the dashboard can show true per-method error. Exposed on window.Presets.

window.Presets = [
  {
    id: 'exp-decay',
    name: 'Exponential decay  y′ = k·y',
    exprText: 'k * y', // shown in the custom box when selected (k folded below)
    // f uses a baked-in k so the custom expr stays simple; see note in app.js
    build: () => {
      const k = -0.8
      const y0 = 2
      const t0 = 0
      return {
        expr: '-0.8 * y',
        f: (t, y) => k * y,
        exact: (t) => y0 * Math.exp(k * (t - t0)),
        t0, y0, tEnd: 5, h: 0.5,
      }
    },
  },
  {
    id: 'logistic',
    name: 'Logistic growth  y′ = r·y·(1 − y/K)',
    exprText: '0.9 * y * (1 - y / 10)',
    build: () => {
      const r = 0.9
      const K = 10
      const y0 = 1
      const t0 = 0
      // Closed form: K / (1 + A e^{-r t}), A = (K - y0)/y0
      const A = (K - y0) / y0
      return {
        expr: '0.9 * y * (1 - y / 10)',
        f: (t, y) => r * y * (1 - y / K),
        exact: (t) => K / (1 + A * Math.exp(-r * (t - t0))),
        t0, y0, tEnd: 8, h: 0.5,
      }
    },
  },
  {
    id: 'linear',
    name: 'Linear  y′ = t − y',
    exprText: 't - y',
    build: () => {
      const t0 = 0
      const y0 = 1
      // Exact solution of y' = t - y, y(0)=1:  y = t - 1 + 2 e^{-t}
      return {
        expr: 't - y',
        f: (t, y) => t - y,
        exact: (t) => t - 1 + 2 * Math.exp(-t),
        t0, y0, tEnd: 6, h: 0.5,
      }
    },
  },
]
