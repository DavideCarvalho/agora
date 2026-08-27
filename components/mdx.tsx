import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import { Screenshot } from '@/components/screenshot';
import { CodeFlow } from '@/components/code-flow';
import { DlqSim, RetrySim } from '@/components/failure-sims';
import { PaymentFlow } from '@/components/payment-flow';
import { QueueSim, SingletonSim } from '@/components/queue-sim';
import { AdaptiveSim, FanoutSim, RateLimitSim } from '@/components/scale-sims';
import { ReplayDiagram } from '@/components/replay-diagram';
import { TenancyDiagram } from '@/components/tenancy-diagram';
import { TenantFlow } from '@/components/tenant-flow';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // Components the synced library docs use without always importing them.
    // `Accordion(s)`/`Card(s)` entraram junto com o authkit, que os usa como tags
    // nuas em ~40 páginas — sem registro aqui o build do export estático morre com
    // "Expected component `Accordion` to be defined".
    Accordion,
    Accordions,
    Card,
    Cards,
    Tab,
    Tabs,
    Step,
    Steps,
    TypeTable,
    Screenshot,
    // Durable-lib interactive doc scenes (globally registered, used as bare tags in MDX).
    AdaptiveSim,
    CodeFlow,
    DlqSim,
    FanoutSim,
    QueueSim,
    RateLimitSim,
    RetrySim,
    SingletonSim,
    ReplayDiagram,
    TenancyDiagram,
    TenantFlow,
    // Payments-lib doc scene (bare tag in the payments overview, replacing the ASCII happy path).
    PaymentFlow,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
