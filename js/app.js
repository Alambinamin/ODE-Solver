// app.js — reads controls, runs the four solvers on a shared grid,
// and renders solution/error charts plus comparison tables.

const els = {
  preset: document.getElementById('preset'),
  expr: document.getElementById('expr'),
  t0: document.getElementById('t0'),
  y0: document.getElementById('y0'),
  tEnd: document.getElementById('tEnd'),
  h: document.getElementById('h'),
  solve: document.getElementById('solve'),
  error: document.getElementById('error'),
  refLabel: document.getElementById('refLabel'),
  refNote: document.getElementById('refNote'),
  results: document.getElementById('results'),
  summary: document.getElementById('summary').querySelector('tbody'),
}

let solutionChart = null
let errorChart = null

// --- input helpers -------------------------------------------------------

// Build f(t, y) from a string. Scoped to t, y and Math only; client-side tool.
function compileExpr(expr) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('t', 'y', 'with (Math) { return (' + expr + '); }')
  // sanity check at a sample point
  const test = fn(0.1, 0.1)
  if (typeof test !== 'number' || !isFinite(test)) {
    throw new Error('Expression did not evaluate to a finite number.')
  }
  return fn
}

function num(el) {
  return parseFloat(el.value)
}

function currentExactFn() {
  const opt = els.preset.value
  if (opt === 'custom') return null
  const preset = window.Presets.find((p) => p.id === opt)
  if (!preset) return null
  // Rebuild to check the current expression still matches the preset.
  const built = preset.build()
  return els.expr.value.trim() === built.expr ? built.exact : null
}

// --- core run ------------------------------------------------------------

function run() {
  els.error.textContent = ''

  let f
  try {
    f = compileExpr(els.expr.value.trim())
  } catch (e) {
    els.error.textContent = 'Invalid equation: ' + e.message
    return
  }

  const t0 = num(els.t0)
  const y0 = num(els.y0)
  const tEnd = num(els.tEnd)
  const h = num(els.h)

  if ([t0, y0, tEnd, h].some((v) => !isFinite(v))) {
    els.error.textContent = 'Please fill t₀, y₀, t end and h with numbers.'
    return
  }
  if (h <= 0) {
    els.error.textContent = 'Step size h must be positive.'
    return
  }
  if (tEnd <= t0) {
    els.error.textContent = 't end must be greater than t₀.'
    return
  }

  const steps = Math.max(1, Math.round((tEnd - t0) / h))
  if (steps > 20000) {
    els.error.textContent = 'Too many steps (> 20000). Increase h.'
    return
  }

  const selected = Array.from(document.querySelectorAll('.method:checked')).map((c) => c.value)
  if (selected.length === 0) {
    els.error.textContent = 'Select at least one method.'
    return
  }

  // Run each selected solver over the same grid.
  const runs = {}
  try {
    selected.forEach((key) => {
      runs[key] = window.Solvers[key].fn(f, t0, y0, h, steps)
    })
  } catch (e) {
    els.error.textContent = 'Solver error: ' + e.message
    return
  }

  // Determine reference: exact solution (preset) or RK4 fallback.
  const exact = currentExactFn()
  const grid = (runs[selected[0]]).map((p) => p.t)

  let refValues
  let refIsExact
  if (exact) {
    refValues = grid.map((t) => exact(t))
    refIsExact = true
    els.refLabel.textContent = 'exact'
    els.refNote.textContent = 'Error is measured against the closed-form exact solution.'
  } else {
    // fallback: high-accuracy RK4 on a fine grid as pseudo-truth
    const fineSteps = steps * 8
    const fineH = (tEnd - t0) / fineSteps
    const fine = window.Solvers.rk4.fn(f, t0, y0, fineH, fineSteps)
    refValues = grid.map((t) => {
      const idx = Math.round((t - t0) / fineH)
      return fine[Math.min(idx, fine.length - 1)].y
    })
    refIsExact = false
    els.refLabel.textContent = 'RK4 reference'
    els.refNote.textContent = 'No exact solution for a custom equation — error is measured against a fine-step RK4 reference.'
  }

  renderSolutionChart(runs, selected, grid, refValues, refIsExact)
  renderErrorChart(runs, selected, grid, refValues, refIsExact)
  renderTables(runs, selected, grid, refValues, refIsExact)
}

// --- rendering -----------------------------------------------------------

function renderSolutionChart(runs, selected, grid, refValues, refIsExact) {
  const datasets = selected.map((key) => {
    const s = window.Solvers[key]
    return {
      label: s.label,
      data: runs[key].map((p) => p.y),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.15,
    }
  })
  datasets.push({
    label: refIsExact ? 'Exact' : 'RK4 reference',
    data: refValues,
    borderColor: '#e5e7eb',
    borderDash: [6, 4],
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.15,
  })

  const labels = grid.map((t) => t.toFixed(2))
  if (solutionChart) solutionChart.destroy()
  solutionChart = new Chart(document.getElementById('solutionChart'), {
    type: 'line',
    data: { labels, datasets },
    options: baseOptions('t', 'y'),
  })
}

function renderErrorChart(runs, selected, grid, refValues) {
  const datasets = selected.map((key) => {
    const s = window.Solvers[key]
    return {
      label: s.label,
      data: runs[key].map((p, i) => Math.abs(p.y - refValues[i])),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.15,
    }
  })
  const labels = grid.map((t) => t.toFixed(2))
  if (errorChart) errorChart.destroy()
  errorChart = new Chart(document.getElementById('errorChart'), {
    type: 'line',
    data: { labels, datasets },
    options: baseOptions('t', '|error|'),
  })
}

function renderTables(runs, selected, grid, refValues, refIsExact) {
  // Results table: t | each method y | reference
  const thead = els.results.querySelector('thead')
  const tbody = els.results.querySelector('tbody')
  const head = ['t', ...selected.map((k) => window.Solvers[k].label), refIsExact ? 'Exact' : 'RK4 ref']
  thead.innerHTML = '<tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr>'

  tbody.innerHTML = grid
    .map((t, i) => {
      const cells = [t.toFixed(3)]
      selected.forEach((k) => cells.push(runs[k][i].y.toFixed(5)))
      cells.push(refValues[i].toFixed(5))
      return '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>'
    })
    .join('')

  // Summary: max & final abs error per method
  els.summary.innerHTML = selected
    .map((k) => {
      const s = window.Solvers[k]
      const errs = runs[k].map((p, i) => Math.abs(p.y - refValues[i]))
      const maxE = Math.max(...errs)
      const finalE = errs[errs.length - 1]
      return `<tr><td><span class="sw-inline" style="background:${s.color}"></span>${s.label}</td><td>${maxE.toExponential(3)}</td><td>${finalE.toExponential(3)}</td></tr>`
    })
    .join('')
}

function baseOptions(xTitle, yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#cbd5e1', boxWidth: 14 } },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        title: { display: true, text: xTitle, color: '#94a3b8' },
        ticks: { color: '#94a3b8', maxTicksLimit: 12 },
        grid: { color: 'rgba(148,163,184,0.12)' },
      },
      y: {
        title: { display: true, text: yTitle, color: '#94a3b8' },
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148,163,184,0.12)' },
      },
    },
  }
}

// --- preset wiring -------------------------------------------------------

function fillFromPreset(id) {
  if (id === 'custom') {
    els.expr.value = 'sin(t) - y'
    els.t0.value = 0
    els.y0.value = 1
    els.tEnd.value = 6
    els.h.value = 0.5
    return
  }
  const preset = window.Presets.find((p) => p.id === id)
  const b = preset.build()
  els.expr.value = b.expr
  els.t0.value = b.t0
  els.y0.value = b.y0
  els.tEnd.value = b.tEnd
  els.h.value = b.h
}

function init() {
  // populate method color swatches
  document.querySelectorAll('.sw').forEach((sw) => {
    sw.style.background = window.Solvers[sw.dataset.k].color
  })

  // populate preset dropdown
  window.Presets.forEach((p) => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.name
    els.preset.appendChild(opt)
  })
  const customOpt = document.createElement('option')
  customOpt.value = 'custom'
  customOpt.textContent = 'Custom equation…'
  els.preset.appendChild(customOpt)

  els.preset.addEventListener('change', () => {
    fillFromPreset(els.preset.value)
    run()
  })
  els.solve.addEventListener('click', run)

  // start on the first preset
  els.preset.value = window.Presets[0].id
  fillFromPreset(els.preset.value)
  run()
}

document.addEventListener('DOMContentLoaded', init)
