"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { Anatomy3D, type PickedObject } from "@/components/shared/anatomy-3d";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PanelEntry =
  | { kind: "scene"; id: string; label: string }
  | { kind: "model"; id: string; label: string };

// IDs do MyHuman (BioDigital). Substituir/adicionar entries conforme
// novas cenas forem criadas na conta.
const ENTRY_MASCULINO: PanelEntry = {
  kind: "model",
  id: "7Aj7",
  label: "Corpo inteiro (masculino)",
};
const ENTRY_FEMININO: PanelEntry = {
  kind: "model",
  id: "7AjE",
  label: "Corpo inteiro (feminino)",
};

function resolveEntriesForSexo(sexo?: string | null): PanelEntry[] {
  const normalized = sexo?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("f")) return [ENTRY_FEMININO];
  // Sem sexo informado ou qualquer outro valor → masculino como default
  // mais universal para demonstração clínica genérica.
  return [ENTRY_MASCULINO];
}

export interface AnatomyPanelProps {
  sexo?: string | null;
}

export function AnatomyPanel({ sexo }: AnatomyPanelProps = {}) {
  const entries = useMemo(() => resolveEntriesForSexo(sexo), [sexo]);
  const [pickedObject, setPickedObject] = useState<PickedObject | null>(null);
  const firstKey = `${entries[0].kind}:${entries[0].id}`;
  const [activeKey, setActiveKey] = useState<string>(firstKey);

  // Quando sexo mudar e as entries não contiverem mais o activeKey antigo,
  // reseta pra primeira entry (evita qualquer stale state defendendo contra
  // edge cases de StrictMode/Fast Refresh).
  useEffect(() => {
    const stillValid = entries.some((e) => `${e.kind}:${e.id}` === activeKey);
    if (!stillValid) {
      setActiveKey(firstKey);
    }
  }, [entries, activeKey, firstKey]);

  const active =
    entries.find((e) => `${e.kind}:${e.id}` === activeKey) ?? entries[0];

  return (
    <div className="flex flex-col gap-4">
      {entries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {entries.map((entry) => {
            const key = `${entry.kind}:${entry.id}`;
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveKey(key);
                  setPickedObject(null);
                }}
                className={[
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white"
                    : "border-app-border bg-app-bg text-app-text-secondary hover:bg-app-hover dark:border-app-border-dark dark:bg-app-card-dark dark:text-white",
                ].join(" ")}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      )}

      <Anatomy3D
        key={`${active.kind}:${active.id}`}
        modelId={active.kind === "model" ? active.id : undefined}
        scene={active.kind === "scene" ? active.id : undefined}
        height="450px"
        onObjectPicked={setPickedObject}
        onReady={(human) => {
          human.camera.flyTo({ eye: { z: -20 }, velocity: 15 });
        }}
      />

      {pickedObject && (
        <Card className="flex items-start gap-3 border-app-border bg-app-info-bg p-3 dark:border-app-border-dark dark:bg-app-card-dark">
          <div className="mt-0.5 rounded bg-[var(--app-primary)] p-1">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-app-text-secondary dark:text-white/60">
              Estrutura selecionada
            </p>
            <p className="truncate text-sm font-semibold text-app-text-primary dark:text-white">
              {pickedObject.objectId.replace(/-/g, " ").replace(/_/g, " ")}
            </p>
            <Badge className="mt-1 bg-app-info-bg text-xs text-app-info-text dark:bg-[var(--app-primary)]/20 dark:text-blue-300">
              {pickedObject.objectId}
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
