/**
 * Scenario 8: what the scripted model writes into a `Sandbox` — a small bill splitter, as a model
 * would write it: props in the order they stream (placeholder first, then styles, markup, code).
 * Its button hands the numbers back with `agent.send(...)`, which starts the next turn.
 */
export interface Bill {
  total: number
  people: number
  tip: number
}

/** "Split a $120 bill between 3 people with a 15% tip" → the numbers, with defaults. */
export function readBill(text: string): Bill {
  const total = Number(/\$\s*(\d+(?:\.\d+)?)/.exec(text)?.[1] ?? 120)
  const people = Number(/(\d+)\s*(?:people|persons|friends|ways)/.exec(text)?.[1] ?? 3)
  const tip = Number(/(\d+(?:\.\d+)?)\s*%/.exec(text)?.[1] ?? 15)
  return { total, people, tip }
}

/** The same arithmetic the view does: what each person pays, to the cent. */
export function settle(bill: Bill) {
  const tipAmount = Math.round(bill.total * bill.tip) / 100
  const grand = bill.total + tipAmount
  const perPerson = Math.ceil((grand / bill.people) * 100) / 100
  return { tipAmount, grand, perPerson }
}

const css = `
.bs{padding:14px 16px;border:1px solid #d8dbe2;border-radius:10px;background:#fafbff}
.bs h4{margin:0 0 10px;font-size:15px}
.bs label{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:6px 0}
.bs input{width:120px;padding:5px 8px;border:1px solid #c4c8d0;border-radius:6px;font:inherit}
.bs input[aria-invalid="true"]{border-color:#d33;background:#fff4f4}
.bs .out{margin:12px 0 4px;font-size:15px}
.bs .out strong{font-size:22px;color:#2f49d1}
.bs .detail{color:#666;font-size:12px;margin:0 0 6px}
.bs .err{color:#c22;min-height:1.3em;font-size:13px;margin:0 0 8px}
.bs button{padding:7px 14px;border:0;border-radius:6px;background:#4f6bed;color:#fff;font:inherit;cursor:pointer}
.bs button:disabled{background:#aab3d9;cursor:not-allowed}
`.trim()

const html = (bill: Bill) =>
  `
<div class="bs" data-testid="bill-splitter">
  <h4>Bill splitter</h4>
  <label for="total">Bill total ($) <input id="total" type="number" min="0" step="0.01" value="${bill.total}"></label>
  <label for="people">People <input id="people" type="number" min="1" step="1" value="${bill.people}"></label>
  <label for="tip">Tip (%) <input id="tip" type="number" min="0" max="100" step="1" value="${bill.tip}"></label>
  <p class="out" aria-live="polite">Each person pays <strong id="each">—</strong></p>
  <p class="detail" id="detail"></p>
  <p class="err" id="err" role="alert"></p>
  <button id="settle" type="button">Ask the assistant to settle it</button>
</div>
`.trim()

const jsFunctions = `
function money(n) { return '$' + n.toFixed(2) }
function read() {
  var total = Number(document.getElementById('total').value)
  var people = Number(document.getElementById('people').value)
  var tip = Number(document.getElementById('tip').value)
  var errors = []
  if (!(isFinite(total) && total > 0)) errors.push(['total', 'Enter a bill total above $0.'])
  if (!(Number.isInteger(people) && people >= 1 && people <= 100)) errors.push(['people', 'People must be a whole number from 1 to 100.'])
  if (!(isFinite(tip) && tip >= 0 && tip <= 100)) errors.push(['tip', 'Tip must be between 0% and 100%.'])
  ;['total', 'people', 'tip'].forEach(function (id) {
    document.getElementById(id).setAttribute('aria-invalid', String(errors.some(function (e) { return e[0] === id })))
  })
  return { total: total, people: people, tip: tip, errors: errors }
}
function update() {
  var v = read()
  var button = document.getElementById('settle')
  document.getElementById('err').textContent = v.errors.map(function (e) { return e[1] }).join(' ')
  button.disabled = v.errors.length > 0
  if (v.errors.length > 0) {
    document.getElementById('each').textContent = '—'
    document.getElementById('detail').textContent = ''
    return null
  }
  var tipAmount = Math.round(v.total * v.tip) / 100
  var grand = v.total + tipAmount
  var perPerson = Math.ceil(grand / v.people * 100) / 100
  document.getElementById('each').textContent = money(perPerson)
  document.getElementById('detail').textContent = money(v.total) + ' + ' + v.tip + '% tip (' + money(tipAmount) + ') = ' + money(grand) + ', split ' + v.people + ' ways'
  return { total: v.total, people: v.people, tip: v.tip, perPerson: perPerson }
}
function settle() {
  var s = update()
  if (!s) return
  agent.send({ text: 'Settle it for ' + s.people + ' people', total: s.total, people: s.people, tip: s.tip, perPerson: s.perPerson })
  var button = document.getElementById('settle')
  button.disabled = true
  button.textContent = 'Sent to the assistant'
}
`.trim()

/** The `ui__render` input: one `Sandbox` node, its props in streaming order. */
export function billSplitterTree(bill: Bill) {
  return {
    type: 'Sandbox',
    props: {
      initialHeight: 270,
      placeholderMessages: ['Setting up the bill splitter…', 'Wiring up the inputs…'],
      title: 'Bill splitter',
      summary: `Splits a $${bill.total} bill with a ${bill.tip}% tip between ${bill.people} people; change any number to recompute.`,
      css,
      html: html(bill),
      jsFunctions,
      jsExpressions: [
        "['total', 'people', 'tip'].forEach(function (id) { document.getElementById(id).addEventListener('input', update) })",
        "document.getElementById('settle').addEventListener('click', settle)",
        'update()',
      ],
    },
  }
}

/**
 * Scenario 9: the same splitter as a model writes it with the app's kit (`genuiSandboxKit()` in
 * vite.config.ts, `defineSandbox({ kit: true })` in app/genui/catalog.ts): JSX using the app's
 * own Button, Card, Input and Slider, Tailwind classes mapped to the app's theme — so it is drawn
 * in the app's look, light and dark. Streamed as JSX: it draws as soon as what has arrived parses.
 */
const jsx = (bill: Bill) =>
  `
function App() {
  const [total, setTotal] = useState(${bill.total})
  const [people, setPeople] = useState(${bill.people})
  const [tip, setTip] = useState(${bill.tip})
  const [sent, setSent] = useState(false)
  const valid = total > 0 && people >= 1
  const tipAmount = Math.round(total * tip) / 100
  const each = valid ? Math.ceil(((total + tipAmount) / people) * 100) / 100 : 0
  const money = (n) => '$' + n.toFixed(2)
  return (
    <Card data-testid="kit-bill-splitter" className="max-w-md">
      <CardHeader>
        <CardTitle>Split the bill</CardTitle>
        <CardDescription>Drawn with the app's own components.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          Bill total ($)
          <Input id="total" type="number" className="w-32" value={total} aria-invalid={!(total > 0)} onChange={(e) => setTotal(Number(e.target.value))} />
        </label>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>People</span><span className="font-medium">{people}</span></div>
          <Slider aria-label="People" min={1} max={12} value={[people]} onValueChange={(v) => setPeople(v[0])} />
        </div>
        <div className="flex gap-2">
          {[0, 10, 15, 20].map((p) => (
            <Button key={p} size="sm" variant={p === tip ? 'default' : 'outline'} onClick={() => setTip(p)}>{p}%</Button>
          ))}
        </div>
        <div className="rounded-lg bg-muted p-3">
          <div className="text-sm text-muted-foreground">Each person pays</div>
          <div id="each" className="text-2xl font-semibold text-primary">{valid ? money(each) : '—'}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button id="settle" disabled={!valid || sent} onClick={() => { setSent(true); agent.send({ text: 'Settle the bill: ' + money(total) + ' with a ' + tip + '% tip, split ' + people + ' ways.', total, people, tip, perPerson: each }) }}>
          {sent ? 'Sent to the assistant' : 'Ask the assistant to settle it'}
        </Button>
      </CardFooter>
    </Card>
  )
}
`.trim()

/** The `ui__render` input for scenario 9: a `Sandbox` written as JSX (no html, no scripts). */
export function billSplitterJsxTree(bill: Bill) {
  return {
    type: 'Sandbox',
    props: {
      initialHeight: 360,
      placeholderMessages: ['Setting up the bill splitter…', 'Using the app components…'],
      title: 'Bill splitter',
      summary: `Splits a $${bill.total} bill with a ${bill.tip}% tip between ${bill.people} people.`,
      jsx: jsx(bill),
    },
  }
}

/**
 * Scenario 9 with the Bootstrap kit (CSS only, no components): HTML with Bootstrap's classes, the
 * ones the kit listed for the model — no CSS of its own. The same arithmetic as the others.
 */
export function billSplitterBootstrapTree(bill: Bill) {
  return {
    type: 'Sandbox',
    props: {
      initialHeight: 360,
      placeholderMessages: ['Setting up the bill splitter…', 'Using the app’s Bootstrap classes…'],
      title: 'Bill splitter',
      summary: `Splits a $${bill.total} bill with a ${bill.tip}% tip between ${bill.people} people.`,
      html: `
<div class="card shadow-sm" data-testid="kit-bill-splitter" style="max-width:28rem">
  <div class="card-body">
    <h5 class="card-title mb-1">Split the bill</h5>
    <p class="card-subtitle text-body-secondary small mb-3">Drawn with the app’s Bootstrap theme.</p>
    <div class="input-group mb-3"><span class="input-group-text">$</span><input id="total" type="number" class="form-control" value="${bill.total}" aria-label="Bill total"></div>
    <label for="people" class="form-label d-flex justify-content-between mb-1"><span>People</span><strong id="people-count">${bill.people}</strong></label>
    <input id="people" type="range" class="form-range mb-3" min="1" max="12" value="${bill.people}" aria-label="People">
    <div class="btn-group mb-3" role="group" aria-label="Tip">
      ${[0, 10, 15, 20].map((p) => `<button type="button" class="btn ${p === bill.tip ? 'btn-primary' : 'btn-outline-primary'}" data-tip="${p}">${p}%</button>`).join('')}
    </div>
    <div class="alert alert-light border mb-3"><div class="small text-body-secondary">Each person pays</div><div id="each" class="fs-3 fw-semibold text-primary">—</div></div>
    <button id="settle" type="button" class="btn btn-primary w-100">Ask the assistant to settle it</button>
  </div>
</div>`.trim(),
      jsFunctions: `
var tip = ${bill.tip}
function money(n) { return '$' + n.toFixed(2) }
function each() {
  var total = Number(document.getElementById('total').value)
  var people = Number(document.getElementById('people').value)
  if (!(total > 0) || !(people >= 1)) return null
  var tipAmount = Math.round(total * tip) / 100
  return { total: total, people: people, tip: tip, perPerson: Math.ceil(((total + tipAmount) / people) * 100) / 100 }
}
function update() {
  var v = each()
  document.getElementById('people-count').textContent = document.getElementById('people').value
  document.getElementById('each').textContent = v ? money(v.perPerson) : '—'
  document.getElementById('settle').disabled = !v
}
function pickTip(button) {
  tip = Number(button.getAttribute('data-tip'))
  document.querySelectorAll('[data-tip]').forEach(function (b) { b.className = 'btn ' + (b === button ? 'btn-primary' : 'btn-outline-primary') })
  update()
}
function settleIt() {
  var v = each()
  if (!v) return
  agent.send({ text: 'Settle the bill: ' + money(v.total) + ' with a ' + v.tip + '% tip, split ' + v.people + ' ways.', total: v.total, people: v.people, tip: v.tip, perPerson: v.perPerson })
  var button = document.getElementById('settle')
  button.disabled = true
  button.textContent = 'Sent to the assistant'
}`.trim(),
      jsExpressions: [
        "['total', 'people'].forEach(function (id) { document.getElementById(id).addEventListener('input', update) })",
        "document.querySelectorAll('[data-tip]').forEach(function (b) { b.addEventListener('click', function () { pickTip(b) }) })",
        "document.getElementById('settle').addEventListener('click', settleIt)",
        'update()',
      ],
    },
  }
}

/**
 * Scenario 9 with the MUI kit: JSX with MUI's components and the app's own styled ones, inside the
 * kit's wrapper (the app's theme + CssBaseline) — a Menu included, whose portal opens in the frame.
 */
const muiJsx = (bill: Bill) =>
  `
function App() {
  const [total, setTotal] = useState(${bill.total})
  const [people, setPeople] = useState(${bill.people})
  const [tip, setTip] = useState(${bill.tip})
  const [round, setRound] = useState('cent')
  const [menu, setMenu] = useState(null)
  const [sent, setSent] = useState(false)
  const valid = total > 0 && people >= 1
  const raw = valid ? (total + Math.round(total * tip) / 100) / people : 0
  const each = round === 'dollar' ? Math.ceil(raw) : Math.ceil(raw * 100) / 100
  const money = (n) => '$' + n.toFixed(2)
  return (
    <Card data-testid="kit-bill-splitter" sx={{ maxWidth: 440 }}>
      <CardHeader title="Split the bill" subheader="Drawn with the app's MUI theme" />
      <CardContent>
        <Stack spacing={2}>
          <TextField label="Bill total" type="number" size="small" value={total} onChange={(e) => setTotal(Number(e.target.value))}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { 'aria-label': 'Bill total' } }} />
          <TextField label="People" type="number" size="small" value={people} onChange={(e) => setPeople(Number(e.target.value))} slotProps={{ htmlInput: { 'aria-label': 'People', min: 1 } }} />
          <ToggleButtonGroup exclusive size="small" color="primary" value={tip} onChange={(e, v) => v !== null && setTip(v)} aria-label="Tip">
            {[0, 10, 15, 20].map((p) => <ToggleButton key={p} value={p}>{p}%</ToggleButton>)}
          </ToggleButtonGroup>
          <Panel>
            <Typography variant="body2" color="text.secondary">Each person pays</Typography>
            <PriceTag id="each">{valid ? money(each) : '—'}</PriceTag>
          </Panel>
          <Stack direction="row" spacing={1}>
            <Button id="round" variant="outlined" onClick={(e) => setMenu(e.currentTarget)}>Round to the {round}</Button>
            <Menu anchorEl={menu} open={menu !== null} onClose={() => setMenu(null)}>
              <MenuItem id="round-cent" onClick={() => { setRound('cent'); setMenu(null) }}>Nearest cent</MenuItem>
              <MenuItem id="round-dollar" onClick={() => { setRound('dollar'); setMenu(null) }}>Next dollar</MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button id="settle" variant="contained" fullWidth disabled={!valid || sent} onClick={() => { setSent(true); agent.send({ text: 'Settle the bill: ' + money(total) + ' with a ' + tip + '% tip, split ' + people + ' ways.', total, people, tip, perPerson: each }) }}>
          {sent ? 'Sent to the assistant' : 'Ask the assistant to settle it'}
        </Button>
      </CardActions>
    </Card>
  )
}
`.trim()

/** The `ui__render` input for scenario 9 with the MUI kit. */
export function billSplitterMuiTree(bill: Bill) {
  return {
    type: 'Sandbox',
    props: {
      initialHeight: 440,
      placeholderMessages: ['Setting up the bill splitter…', 'Using the app’s MUI theme…'],
      title: 'Bill splitter',
      summary: `Splits a $${bill.total} bill with a ${bill.tip}% tip between ${bill.people} people.`,
      jsx: muiJsx(bill),
    },
  }
}
