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
 * vite.config.ts, `sandbox: { kit: true, tailwind: true }` in config/agent.ts): JSX using the app's
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
