"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AlertCircle, Loader2, Maximize2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HumanInstance {
  on: (event: string, callback: (data: unknown) => void) => void;
  camera: {
    flyTo: (opts: {
      eye?: { x?: number; y?: number; z?: number };
      velocity?: number;
    }) => void;
    reset: () => void;
  };
  scene: {
    setHighlight: (opts: { objectIds: string[]; opacity?: number }) => void;
  };
  pick: {
    on: (
      event: "picked",
      callback: (e: { objectId: string; worldPos: unknown }) => void,
    ) => void;
  };
  timeline: {
    pause: () => void;
    play: () => void;
  };
}

// BioDigital Human API 1.2.x — window.HumanAPI é o próprio construtor,
// não um objeto com propriedade .Human.
type HumanAPIConstructor = new (iframeId: string) => HumanInstance;

declare global {
  interface Window {
    HumanAPI?: HumanAPIConstructor;
  }
}

export interface PickedObject {
  objectId: string;
  worldPos: unknown;
}

export interface Anatomy3DProps {
  modelId?: string;
  scene?: string;
  objects?: string;
  height?: string;
  onObjectPicked?: (obj: PickedObject) => void;
  onReady?: (human: HumanInstance) => void;
  showControls?: boolean;
}

const HUMAN_API_SCRIPT =
  "https://human-api.biodigital.com/build/1.2.1/human-api-1.2.1.min.js";
const IFRAME_ID = "integrallys-biodigital-iframe";

export function Anatomy3D({
  modelId,
  scene,
  objects,
  height = "400px",
  onObjectPicked,
  onReady,
  showControls = true,
}: Anatomy3DProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== "undefined" && typeof window.HumanAPI === "function",
  );
  const humanRef = useRef<HumanInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const developerKey = process.env.NEXT_PUBLIC_BIODIGITAL_KEY;

  const buildSrc = () => {
    // Endpoint /viewer/ aceita content IDs curtos (ex: "7Aj7") via param id=.
    // O /widget/ legado com m= só aceita slugs longos do tipo
    // "production/maleAdult/...". Migramos pro /viewer/ para suportar IDs
    // gerados pela UI do MyHuman (que são sempre curtos).
    const base = "https://human.biodigital.com/viewer/";
    const params = new URLSearchParams();
    const contentId = modelId ?? scene;
    if (contentId) params.set("id", contentId);
    if (objects) params.set("o", objects);
    if (developerKey) params.set("dk", developerKey);
    params.set("ui-panel", "true");
    params.set("ui-nav", "true");
    params.set("ui-search", "true");
    params.set("ui-info", "true");
    params.set("ui-anatomy-labels", "true");
    params.set("ui-layers", "true");
    params.set("ui-tools", "true");
    params.set("lang", "pt");
    params.set("ui-language", "pt");
    params.set("locale", "pt-BR");
    params.set("content-language", "pt");
    params.set("anatomy-labels-language", "pt");
    return `${base}?${params.toString()}`;
  };

  useEffect(() => {
    if (!developerKey) {
      setStatus("error");
      setErrorMsg("NEXT_PUBLIC_BIODIGITAL_KEY não configurada no .env.local");
      return;
    }
    if (!scriptLoaded) return;

    const api = window.HumanAPI as unknown;

    // BioDigital Human API 1.2.x expõe um objeto com múltiplos padrões
    // dependendo da versão. Tenta cada um em ordem — o que funcionar atribui
    // a instância em humanRef e registra os listeners. Se nenhum funcionar,
    // o iframe ainda renderiza o modelo (status flipa via iframe.onLoad);
    // só perdemos picking/camera-control.
    const tryInstantiate = (): HumanInstance | null => {
      const apiObj = api as Record<string, unknown>;

      // Padrão A: HumanAPI.ready(iframeId, callback)
      if (apiObj && typeof apiObj.ready === "function") {
        try {
          (apiObj.ready as (id: string, cb: (h: HumanInstance) => void) => void)(
            IFRAME_ID,
            (human) => {
              humanRef.current = human;
              human.pick?.on("picked", (e) => onObjectPicked?.(e as PickedObject));
              onReady?.(human);
            },
          );
          return humanRef.current;
        } catch (err) {
          console.warn("[Anatomy3D] Padrão .ready falhou:", err);
        }
      }

      // Padrão B: new HumanAPI.Human(iframeId)
      if (apiObj && typeof apiObj.Human === "function") {
        try {
          const Ctor = apiObj.Human as HumanAPIConstructor;
          const human = new Ctor(IFRAME_ID);
          humanRef.current = human;
          human.on?.("human.ready", () => onReady?.(human));
          human.pick?.on("picked", (e) => onObjectPicked?.(e as PickedObject));
          return human;
        } catch (err) {
          console.warn("[Anatomy3D] Padrão .Human falhou:", err);
        }
      }

      // Padrão C: new HumanAPI(iframeId) — se for uma função construtora
      if (typeof api === "function") {
        try {
          const Ctor = api as HumanAPIConstructor;
          const human = new Ctor(IFRAME_ID);
          humanRef.current = human;
          human.on?.("human.ready", () => onReady?.(human));
          human.pick?.on("picked", (e) => onObjectPicked?.(e as PickedObject));
          return human;
        } catch (err) {
          console.warn("[Anatomy3D] Padrão new HumanAPI falhou:", err);
        }
      }

      console.warn("[Anatomy3D] Nenhum padrão de bridge funcionou — picking e controle de câmera desabilitados");
      return null;
    };

    tryInstantiate();

    return () => {
      humanRef.current = null;
    };
  }, [developerKey, scriptLoaded, modelId, scene, objects, onReady, onObjectPicked]);

  const handleReset = () => {
    humanRef.current?.camera.reset();
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <Script
        src={HUMAN_API_SCRIPT}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={(e) => {
          console.error("[Anatomy3D] Falha ao carregar script BioDigital:", e);
          setStatus("error");
          setErrorMsg("Falha ao carregar o script da BioDigital API.");
        }}
      />
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-integrallys-lg border border-app-border bg-app-bg-secondary dark:border-app-border-dark dark:bg-app-bg-dark"
        style={{ height }}
      >
        {developerKey && (
          <iframe
            id={IFRAME_ID}
            src={buildSrc()}
            width="100%"
            height="100%"
            allow="fullscreen"
            onLoad={() => setStatus("ready")}
            style={{
              border: "none",
              display: status === "error" ? "none" : "block",
            }}
            title="BioDigital Human Anatomy Viewer"
          />
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-app-bg-secondary dark:bg-app-bg-dark">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--app-primary)]" />
            <p className="text-sm text-app-text-secondary">
              Carregando modelo anatômico...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-app-danger-bg p-3">
              <AlertCircle className="h-7 w-7 text-app-danger-text" />
            </div>
            <div>
              <p className="font-semibold text-app-text-primary dark:text-white">
                Visualizador indisponível
              </p>
              <p className="mt-1 text-xs text-app-text-muted">{errorMsg}</p>
            </div>
            {errorMsg?.includes("NEXT_PUBLIC_BIODIGITAL_KEY") && (
              <p className="rounded-md bg-app-bg-tertiary px-3 py-2 font-mono text-xs text-app-text-secondary dark:bg-app-card-dark">
                Adicione NEXT_PUBLIC_BIODIGITAL_KEY no .env.local
              </p>
            )}
          </div>
        )}

        {status === "ready" && showControls && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-white/80 backdrop-blur-sm dark:bg-app-card-dark/80"
              onClick={handleReset}
              title="Resetar câmera"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-white/80 backdrop-blur-sm dark:bg-app-card-dark/80"
              onClick={handleFullscreen}
              title="Tela cheia"
            >
              {isFullscreen ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
