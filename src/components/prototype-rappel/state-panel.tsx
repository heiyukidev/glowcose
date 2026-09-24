"use client";

import { entries, map } from "lodash";

import type { PrototypeRappelState } from "@/components/prototype-rappel/mock";

/** Surface full prototype state after every action. */
export function PrototypeRappelStatePanel({
  state,
}: {
  state: PrototypeRappelState;
}) {
  return (
    <pre className="mt-6 overflow-x-auto rounded-xl bg-foreground/95 p-3 font-mono text-[11px] leading-relaxed text-background">
      {map(entries(state), ([key, value]) => (
        <div key={key}>
          <span className="opacity-60">{key}</span>:{" "}
          {value === null ? "null" : JSON.stringify(value)}
        </div>
      ))}
    </pre>
  );
}
