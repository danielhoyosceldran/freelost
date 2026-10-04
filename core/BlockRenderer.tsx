import { registry, type BlockEntry, type PageConfig } from "@/blocks/registry";
import type { BlockManifest } from "@/blocks/types";
import { BlockSlot } from "@/core/lifecycle/BlockSlot";
import { PageReady } from "@/core/lifecycle/LifecycleBoot";

interface Placed {
  entry: BlockEntry;
  manifest: BlockManifest;
  index: number;
  heldBy: number[];
}

/** Numera before, main y after seguidos y apunta qué bloques con holdsBelow tiene cada uno encima. */
function place(page: PageConfig) {
  const lists = [page.before ?? [], page.main, page.after ?? []];
  const holders: number[] = [];
  let index = 0;
  return lists.map((list) =>
    list.map((entry): Placed => {
      const manifest = registry[entry.type] as BlockManifest;
      const p = { entry, manifest, index: index++, heldBy: [...holders] };
      if (manifest.holdsBelow) holders.push(p.index);
      return p;
    }),
  );
}

/**
 * Traduce bloques a componentes. Es Server Component: con `output: 'export'` corre en el
 * build, así que un schema.parse fallido rompe `next build` en vez de llegar roto al navegador.
 */
function Blocks({ blocks }: { blocks: Placed[] }) {
  return blocks.map(({ entry, manifest, index, heldBy }) => {
    const props = manifest.schema.parse(entry.props) as object;
    const { Component } = manifest;
    return (
      <BlockSlot key={entry.id ?? `${entry.type}-${index}`} index={index} heldBy={heldBy} critical={!!manifest.critical}>
        <Component {...props} />
      </BlockSlot>
    );
  });
}

export function PageRenderer({ page }: { page: PageConfig }) {
  const [before, main, after] = place(page);
  const ownsReady = [before, main, after].some((list) => list.some((b) => b.manifest.ownsReady));
  return (
    <>
      {!ownsReady && <PageReady />}
      <Blocks blocks={before} />
      <main className="relative z-10">
        <Blocks blocks={main} />
      </main>
      <Blocks blocks={after} />
    </>
  );
}
