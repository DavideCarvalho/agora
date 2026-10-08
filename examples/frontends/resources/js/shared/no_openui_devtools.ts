/**
 * In development, `@openuidev/react-lang` auto-mounts OpenUI's Inspect widget (production builds
 * drop it). The CopilotKit page turns its inspector off too (`enableInspector={false}`), so the
 * screenshots compare the chats alone. Must be imported before `@openuidev/*`.
 */
;(globalThis as Record<symbol, unknown>)[Symbol.for('openui.devtools.autoMount')] = true
