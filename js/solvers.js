// solvers.js — four numerical methods for a first-order IVP y' = f(t, y).
// Each solver is a pure function: (f, t0, y0, h, steps) -> [{ t, y }, ...].
// No dependencies; exported on window.Solvers for the no-build CDN setup.

// Euler's method: y_{n+1} = y_n + h*f(t_n, y_n)
function euler(f, t0, y0, h, steps) {
  const pts = [{ t: t0, y: y0 }]
  let t = t0
  let y = y0
  for (let i = 0; i < steps; i++) {
    y = y + h * f(t, y)
    t = t + h
    pts.push({ t, y })
  }
  return pts
}

// Heun's method (improved Euler / RK2): predictor + trapezoidal corrector.
function heun(f, t0, y0, h, steps) {
  const pts = [{ t: t0, y: y0 }]
  let t = t0
  let y = y0
  for (let i = 0; i < steps; i++) {
    const k1 = f(t, y)
    const yPred = y + h * k1
    const k2 = f(t + h, yPred)
    y = y + (h / 2) * (k1 + k2)
    t = t + h
    pts.push({ t, y })
  }
  return pts
}

// Classical 4th-order Runge-Kutta.
function rk4(f, t0, y0, h, steps) {
  const pts = [{ t: t0, y: y0 }]
  let t = t0
  let y = y0
  for (let i = 0; i < steps; i++) {
    const k1 = f(t, y)
    const k2 = f(t + h / 2, y + (h / 2) * k1)
    const k3 = f(t + h / 2, y + (h / 2) * k2)
    const k4 = f(t + h, y + h * k3)
    y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
    t = t + h
    pts.push({ t, y })
  }
  return pts
}

// Taylor method of order 2:
//   y_{n+1} = y_n + h*f + (h^2/2)*f'
// where f' is the total derivative df/dt = f_t + f_y * f.
// We approximate the partial derivatives numerically (finite differences)
// so this works for any f, including user-entered custom equations.
function taylor2(f, t0, y0, h, steps) {
  const eps = 1e-6
  const pts = [{ t: t0, y: y0 }]
  let t = t0
  let y = y0
  for (let i = 0; i < steps; i++) {
    const fv = f(t, y)
    const ft = (f(t + eps, y) - f(t - eps, y)) / (2 * eps) // partial wrt t
    const fy = (f(t, y + eps) - f(t, y - eps)) / (2 * eps) // partial wrt y
    const fp = ft + fy * fv // total derivative
    y = y + h * fv + (h * h / 2) * fp
    t = t + h
    pts.push({ t, y })
  }
  return pts
}

window.Solvers = {
  // key -> { label, color, fn }
  euler: { label: 'Euler', color: '#f59e0b', fn: euler },
  heun: { label: 'Heun (RK2)', color: '#22d3ee', fn: heun },
  taylor2: { label: 'Taylor (order 2)', color: '#a78bfa', fn: taylor2 },
  rk4: { label: 'Runge-Kutta (RK4)', color: '#34d399', fn: rk4 },
}
