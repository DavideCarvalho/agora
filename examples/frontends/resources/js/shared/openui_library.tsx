import { createLibrary, defineComponent, useTriggerAction } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import { z } from 'zod'
import { AgentActions, OrderList } from './renderers.js'

/**
 * The app's `OrderList` as an OpenUI component. One definition is both halves: its zod `props` and
 * `description` go into the prompt (the server imports this file — config/agent.ts → openui_prompt),
 * its `component` draws it in the page. Its Refund buttons use OpenUI's own action hook.
 */
export const OrderListComponent = defineComponent({
  name: 'OrderList',
  description: 'The customer’s orders as a table with a Refund button per row. Use it for list_orders results.',
  props: z.object({
    orders: z.array(
      z.object({ id: z.string(), customer: z.string(), totalCents: z.number(), status: z.string() })
    ),
  }),
  component: ({ props }) => {
    const trigger = useTriggerAction()
    return (
      <AgentActions.Provider value={{ send: (text) => void trigger(text) }}>
        <OrderList orders={props.orders} />
      </AgentActions.Provider>
    )
  },
})

/** OpenUI's chat library plus the app's component. */
export const library = createLibrary({
  components: [...Object.values(openuiChatLibrary.components), OrderListComponent] as any,
  componentGroups: openuiChatLibrary.componentGroups,
  root: 'Card',
})
