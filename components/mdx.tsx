import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import { Screenshot } from '@/components/screenshot';
import { CodeFlow } from '@/components/code-flow';
import { DlqSim, RetrySim } from '@/components/failure-sims';
import { QueueSim, SingletonSim } from '@/components/queue-sim';
import { AdaptiveSim, FanoutSim, RateLimitSim } from '@/components/scale-sims';
import { ReplayDiagram } from '@/components/replay-diagram';
import { TenancyDiagram } from '@/components/tenancy-diagram';
import { TenantFlow } from '@/components/tenant-flow';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // Components the synced library docs use without always importing them.
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
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
