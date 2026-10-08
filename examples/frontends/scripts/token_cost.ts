/**
 * Row 9 of the comparison: what each approach costs in model tokens, for the same dashboard.
 *   DEBUG_TOOLS=dump (a turn) → tmp/turn-dump.json ; this script → sizes of the two outputs.
 * The token counts in the README come from running these strings through an o200k tokenizer.
 */
import { writeFileSync } from 'node:fs'
import { ScriptedOrdersModel } from '../app/agent/scripted_model.ts'
import { OPENUI_PROMPT_MARKER } from '../app/agent/openui_prompt.ts'

async function answer(system: string) {
  let text = ''
  const result = await new ScriptedOrdersModel().runTurn({
    system,
    messages: [{ role: 'user', content: 'Show a dashboard with a chart of revenue by month plus the top 3 orders' }],
    tools: [],
    sink: { write: (frame: any) => void (frame.t === 'text' && (text += frame.v)), end: () => {} },
  })
  return { text, toolCalls: result.toolCalls }
}

const native = await answer('')
const openui = await answer(OPENUI_PROMPT_MARKER)
const tree = JSON.stringify(native.toolCalls[0]!.input)
writeFileSync('tmp/dashboard-tree.json', tree)
writeFileSync('tmp/dashboard-openui.txt', openui.text)
console.log(`ui__render input: ${tree.length} chars; OpenUI Lang: ${openui.text.length} chars`)
