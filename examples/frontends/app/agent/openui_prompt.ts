/**
 * OpenUI draws generative UI from text: the model answers in "OpenUI Lang", and the page renders it
 * with the same component library. So the server has to tell the model that language — the
 * library's own `prompt()` — on every turn the OpenUI page sends.
 *
 * `openuiChatLibrary` is the library `<AgentInterface componentLibrary>` renders with on the page;
 * importing it in Node is fine (it pulls React, but touches no DOM). It is loaded on the first
 * OpenUI turn and kept: the prompt is ~54 KB, sent with every OpenUI turn — a real cost with a real
 * model.
 */
export const OPENUI_PROMPT_MARKER = 'You are an AI assistant that responds using openui-lang'

let cached: Promise<string> | undefined

export function openUiPrompt(): Promise<string> {
  cached ??= (async () => {
    const [{ openuiChatLibrary }, { openuiChatPromptOptions }] = await Promise.all([
      import('@openuidev/react-ui/genui-lib'),
      import('@openuidev/react-ui/genui-lib/prompt-options'),
    ])
    return openuiChatLibrary.prompt(openuiChatPromptOptions)
  })()
  return cached
}
