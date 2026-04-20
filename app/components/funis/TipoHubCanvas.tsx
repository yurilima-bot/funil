"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Funil } from "@/types/funil";
import { updateFunil } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 240;
const NODE_H = 148;
const NODE_GAP_Y = 24;

const HUB_W = 210;
const HUB_H = 130;

/** X positions for each status column (hub is at x=0) */
const COL_X = {
  Pausado: -580,
  Ativo: 360,
  EmTeste: 720,   // right of Ativo
} as const;

const DESC_GAP_Y = 64; // vertical gap between a parent card and its descartados

const STATUS_STROKE: Record<string, string> = {
  Ativo: "#059669",
  "Em teste": "#d97706",
  Pausado: "#64748b",
  Descartado: "#dc2626",
};

const STATUS_BG: Record<string, string> = {
  Ativo: "#f0fdf4",
  "Em teste": "#fffbeb",
  Pausado: "#f8fafc",
  Descartado: "#fff1f2",
};

const TIPO_META: Record<string, { icon: string; color: string; label: string }> = {
  Lead: { icon: "📈", color: "#10b981", label: "Leads" },
  Oferta: { icon: "🛒", color: "#1a56db", label: "Ofertas / VSL" },
  Upsell: { icon: "⬆️", color: "#f59e0b", label: "Upsell" },
};

const TIPO_ICON: Record<string, string> = {
  Lead: "📈",
  Oferta: "🛒",
  Upsell: "⬆️",
};

// ─── Hub Node ─────────────────────────────────────────────────────────────────

type HubNodeData = {
  label: string;
  icon: string;
  color: string;
  counts: { ativo: number; teste: number; pausado: number; descartado: number };
};

type HubFlowNode = Node<HubNodeData, "hub">;

function HubNode({ data }: NodeProps<HubFlowNode>) {
  return (
    <div
      style={{
        width: HUB_W,
        minHeight: HUB_H,
        padding: "14px 16px",
        borderRadius: 16,
        background: `linear-gradient(135deg, ${data.color}1a 0%, #ffffff 100%)`,
        border: `3px solid ${data.color}`,
        boxShadow: `0 6px 32px ${data.color}28`,
        textAlign: "center",
        fontSize: 12,
        cursor: "default",
      }}
    >
      {/* Left handle — receives connections from Pausado + Em teste */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: data.color, width: 10, height: 10 }}
      />

      <div style={{ fontSize: 28, marginBottom: 4 }}>{data.icon}</div>
      <div style={{ fontWeight: 900, fontSize: 15, color: data.color, marginBottom: 8 }}>
        {data.label}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "2px 6px", borderRadius: 6 }}>
          ✓ {data.counts.ativo}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: 6 }}>
          🧪 {data.counts.teste}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>
          ⏸ {data.counts.pausado}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fff1f2", padding: "2px 6px", borderRadius: 6 }}>
          🗑 {data.counts.descartado}
        </span>
      </div>

      {/* Right handle — sends connections to Ativo */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: data.color, width: 10, height: 10 }}
      />

      {/* Bottom handle — sends connections to unlinked Descartado */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: "#dc2626", width: 10, height: 10 }}
      />
    </div>
  );
}

// ─── Funnel Node ──────────────────────────────────────────────────────────────

type FunnelNodeData = {
  funil: Funil;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

type FunnelFlowNode = Node<FunnelNodeData, "funnel">;

const TAG_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#475569",
  background: "#f1f5f9",
  padding: "1px 6px",
  borderRadius: 5,
  whiteSpace: "nowrap" as const,
  maxWidth: 90,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function FunnelNode({ data }: NodeProps<FunnelFlowNode>) {
  const f = data.funil;
  const stroke = STATUS_STROKE[f.status] || "#94a3b8";
  const bg = STATUS_BG[f.status] || "#fff";

  return (
    <div
      style={{
        width: NODE_W - 8,
        minHeight: NODE_H - 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: bg,
        border: `2px solid ${stroke}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: stroke }} />

      {/* Top handle — receives connections from Descartado source */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: "#dc2626" }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>{f.codigo}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: stroke, background: `${stroke}18`, padding: "1px 6px", borderRadius: 5 }}>
          {f.status}
        </span>
      </div>

      {/* Name */}
      <div
        style={{
          fontWeight: 700,
          color: "#1e293b",
          lineHeight: 1.3,
          marginBottom: 7,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontSize: 12,
        }}
      >
        {f.nome}
      </div>

      {/* Tags: país, versão, checkout */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {f.pais && <span style={TAG_STYLE}>🌍 {f.pais}</span>}
        {f.versao && <span style={TAG_STYLE}>v{f.versao}</span>}
        {f.checkout && <span style={TAG_STYLE}>💳 {f.checkout}</span>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); data.onEdit(f.id); }}
        >
          Editar
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={(e) => { e.stopPropagation(); data.onDelete(f.id); }}
        >
          Excluir
        </button>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: stroke }} />

      {/* Bottom handle — source for Descartado connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: "#dc2626" }}
      />
    </div>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({
  funil,
  onClose,
  onEdit,
}: {
  funil: Funil;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const stroke = STATUS_STROKE[funil.status] || "#94a3b8";
  const bg = STATUS_BG[funil.status] || "#fff";

  const rows: { label: string; value: string | undefined; icon: string; link?: boolean }[] = [
    { label: "Código", value: funil.codigo, icon: "🔖" },
    { label: "Status", value: funil.status, icon: "●" },
    { label: "Tipo", value: funil.tipo, icon: TIPO_ICON[funil.tipo] || "📄" },
    { label: "País", value: funil.pais, icon: "🌍" },
    { label: "Checkout", value: funil.checkout, icon: "💳" },
    { label: "Versão", value: funil.versao ? `v${funil.versao}` : undefined, icon: "🔢" },
    { label: "Criado em", value: funil.dataCriacao, icon: "📅" },
    { label: "URL", value: funil.url, icon: "🔗", link: true },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 300,
        height: "100%",
        background: "#fff",
        borderLeft: `3px solid ${stroke}`,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 12px",
          background: bg,
          borderBottom: `1px solid ${stroke}40`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", marginBottom: 2 }}>
              {funil.codigo}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", lineHeight: 1.3, maxWidth: 230 }}>
              {funil.nome}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "#94a3b8",
              lineHeight: 1,
              padding: "2px 4px",
              marginLeft: 8,
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            color: stroke,
            background: `${stroke}18`,
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          {funil.status}
        </span>
      </div>

      {/* Info rows */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {rows.map(({ label, value, icon, link }) => {
          if (!value) return null;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginBottom: 10,
                padding: "8px 10px",
                background: "#f8fafc",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, minWidth: 20, textAlign: "center" }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label}
                </div>
                {link ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#3b82f6", wordBreak: "break-all", textDecoration: "underline" }}
                  >
                    {value}
                  </a>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", wordBreak: "break-word" }}>
                    {value}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Notas / Descrição */}
        {funil.descricao && (
          <div
            style={{
              padding: "10px",
              background: "#fffbeb",
              borderRadius: 8,
              border: "1px solid #fde68a",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📝 Notas
            </div>
            <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {funil.descricao}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0" }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => { onEdit(funil.id); onClose(); }}
        >
          ✎ Editar este step
        </button>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { hub: HubNode, funnel: FunnelNode };

// ─── Layout builder ──────────────────────────────────────────────────────────

/** Return the funil whose `codigo` matches f.oferta (excluding f itself), or null. */
function findLinkedFunil(f: Funil, all: Funil[]): Funil | null {
  const code = (f.oferta || "").trim().toUpperCase();
  if (!code) return null;
  return all.find((o) => o.id !== f.id && o.codigo.trim().toUpperCase() === code) ?? null;
}

function buildHubElements(
  tipo: string,
  funis: Funil[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void
): { nodes: (HubFlowNode | FunnelFlowNode)[]; edges: Edge[] } {
  const nodes: (HubFlowNode | FunnelFlowNode)[] = [];
  const edges: Edge[] = [];
  const meta = TIPO_META[tipo] || { icon: "📄", color: "#64748b", label: tipo };

  // ── Group by status ────────────────────────────────────────────────────────
  const byStatus: Record<string, Funil[]> = {};
  for (const f of funis) {
    const s = f.status || "Ativo";
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(f);
  }
  const pausados    = byStatus["Pausado"]   || [];
  const ativos      = byStatus["Ativo"]     || [];
  const emTeste     = byStatus["Em teste"]  || [];
  const descartados = byStatus["Descartado"] || [];

  // ── Hub node ───────────────────────────────────────────────────────────────
  const hubId = `hub-${tipo}`;
  nodes.push({
    id: hubId,
    type: "hub",
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    data: {
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      counts: {
        ativo: ativos.length,
        teste: emTeste.length,
        pausado: pausados.length,
        descartado: descartados.length,
      },
    },
  } as HubFlowNode);

  // Track every placed node's top-left position so descartados can align below them
  const nodePositions = new Map<string, { x: number; y: number }>();
  nodePositions.set(hubId, { x: 0, y: 0 });

  // Helper: add a funnel node and record its position
  function addFunnel(f: Funil, x: number, y: number) {
    nodes.push({ id: f.id, type: "funnel", position: { x, y }, data: { funil: f, onEdit, onDelete } } as FunnelFlowNode);
    nodePositions.set(f.id, { x, y });
  }

  // Vertical center reference aligned to hub center
  const centerY = HUB_H / 2 - NODE_H / 2;
  const SLOT_GAP = 20;

  // ── Pre-group Em teste by linked Ativo ────────────────────────────────────
  const emTesteByAtivoId = new Map<string, Funil[]>();
  const emTesteUnlinked: Funil[] = [];

  for (const f of emTeste) {
    const linked = findLinkedFunil(f, funis);
    if (linked && linked.status === "Ativo") {
      if (!emTesteByAtivoId.has(linked.id)) emTesteByAtivoId.set(linked.id, []);
      emTesteByAtivoId.get(linked.id)!.push(f);
    } else {
      emTesteUnlinked.push(f);
    }
  }

  // ── Compute Ativo slot heights (slot grows if it has Em teste children) ───
  type AtivoSlot = { funil: Funil; rawY: number; slotH: number; emTestes: Funil[] };
  const ativoSlots: AtivoSlot[] = [];
  let rawY = 0;

  for (const ativo of ativos) {
    const emTests = emTesteByAtivoId.get(ativo.id) || [];
    const testsH = emTests.length > 0
      ? emTests.length * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y
      : 0;
    const slotH = Math.max(NODE_H, testsH);
    ativoSlots.push({ funil: ativo, rawY, slotH, emTestes: emTests });
    rawY += slotH + SLOT_GAP;
  }

  const ativoTotalH = rawY - SLOT_GAP;
  const ativoStartY = centerY - ativoTotalH / 2;

  // ── Build Ativo + linked Em teste nodes/edges ─────────────────────────────
  for (const slot of ativoSlots) {
    const ativoY = ativoStartY + slot.rawY + (slot.slotH - NODE_H) / 2;

    addFunnel(slot.funil, COL_X.Ativo, ativoY);

    // Hub → Ativo (green, animated)
    edges.push({
      id: `hub-e-${hubId}-${slot.funil.id}`,
      source: hubId, sourceHandle: "right",
      target: slot.funil.id,
      type: "smoothstep", animated: true,
      style: { stroke: STATUS_STROKE["Ativo"], strokeWidth: 2.5 },
    });

    // Em teste children — positioned to the RIGHT of this Ativo, centered on it
    if (slot.emTestes.length > 0) {
      const totalTestH = slot.emTestes.length * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y;
      const testStartY = ativoY + NODE_H / 2 - totalTestH / 2;

      for (let i = 0; i < slot.emTestes.length; i++) {
        const et = slot.emTestes[i];
        const testY = testStartY + i * (NODE_H + NODE_GAP_Y);
        addFunnel(et, COL_X.EmTeste, testY);

        // Ativo → Em teste (yellow)
        edges.push({
          id: `e-ativo-et-${slot.funil.id}-${et.id}`,
          source: slot.funil.id,
          target: et.id,
          type: "smoothstep", animated: true,
          style: { stroke: STATUS_STROKE["Em teste"], strokeWidth: 2.5, strokeDasharray: "8 4" },
        });
      }
    }
  }

  // ── Unlinked Em teste (connected from hub) ────────────────────────────────
  const unlinkedStartY = ativoTotalH > 0
    ? ativoStartY + ativoTotalH + SLOT_GAP * 3
    : centerY - ((emTesteUnlinked.length * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y) / 2);

  for (let i = 0; i < emTesteUnlinked.length; i++) {
    const et = emTesteUnlinked[i];
    const y = unlinkedStartY + i * (NODE_H + NODE_GAP_Y);
    addFunnel(et, COL_X.EmTeste, y);

    edges.push({
      id: `hub-e-${hubId}-${et.id}`,
      source: hubId, sourceHandle: "right",
      target: et.id,
      type: "smoothstep", animated: true,
      style: { stroke: STATUS_STROKE["Em teste"], strokeWidth: 2.5, strokeDasharray: "8 4" },
    });
  }

  // ── Pausado nodes (left of hub, feed into hub) ────────────────────────────
  const pausadoTotalH = pausados.length * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y;
  const pausadoStartY = centerY - pausadoTotalH / 2;

  for (let i = 0; i < pausados.length; i++) {
    const f = pausados[i];
    addFunnel(f, COL_X.Pausado, pausadoStartY + i * (NODE_H + NODE_GAP_Y));

    edges.push({
      id: `hub-e-${hubId}-${f.id}`,
      source: f.id,
      target: hubId, targetHandle: "left",
      type: "smoothstep", animated: false,
      style: { stroke: STATUS_STROKE["Pausado"], strokeWidth: 2 },
    });
  }

  // ── Descartado nodes — below their linked card, or below hub if unlinked ──
  // Group by parent so multiple descartados under the same parent sit side-by-side
  const descByParentId = new Map<string, Funil[]>();
  for (const f of descartados) {
    const linked = findLinkedFunil(f, funis);
    const parentId = linked ? linked.id : hubId;
    if (!descByParentId.has(parentId)) descByParentId.set(parentId, []);
    descByParentId.get(parentId)!.push(f);
  }

  for (const [parentId, group] of descByParentId.entries()) {
    const parentPos = nodePositions.get(parentId) ?? { x: 0, y: 0 };
    const isHub    = parentId === hubId;
    const parentW  = isHub ? HUB_W  : NODE_W;
    const parentH  = isHub ? HUB_H  : NODE_H;

    const parentCenterX = parentPos.x + parentW / 2;
    const baseY         = parentPos.y + parentH + DESC_GAP_Y;

    // Center the sibling descartados horizontally under the parent
    const groupW  = group.length * NODE_W + (group.length - 1) * NODE_GAP_Y;
    const startX  = parentCenterX - groupW / 2;

    for (let i = 0; i < group.length; i++) {
      const f = group[i];
      addFunnel(f, startX + i * (NODE_W + NODE_GAP_Y), baseY);

      edges.push({
        id: `hub-e-${hubId}-${f.id}`,
        source: parentId,
        sourceHandle: "bottom",
        target: f.id,
        targetHandle: "top",
        type: "smoothstep", animated: false,
        style: { stroke: STATUS_STROKE["Descartado"], strokeWidth: 2 },
      });
    }
  }

  // ── Inter-funil edges (nextIds — custom manual connections) ──────────────
  const funisById = new Map(funis.map((f) => [f.id, f]));
  const edgeSeen = new Set<string>();

  for (const f of funis) {
    for (const targetId of f.nextIds || []) {
      if (targetId === f.id || !funisById.has(targetId)) continue;
      const key = `${f.id}->${targetId}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edges.push({
        id: `e-${f.id}-${targetId}`,
        source: f.id, target: targetId,
        type: "smoothstep",
        animated: f.status === "Ativo",
        style: { stroke: STATUS_STROKE[f.status] || "#94a3b8", strokeWidth: 2, strokeDasharray: "5 3" },
      });
    }
  }

  return { nodes, edges };
}

// ─── Inner Flow Component ─────────────────────────────────────────────────────

function TipoHubFlowInner({
  tipo,
  funis,
  onEdit,
  onDelete,
}: {
  tipo: string;
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<HubFlowNode | FunnelFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null);
  const { fitView } = useReactFlow();

  // Track whether we've already centered on first load
  const hasFittedRef = useRef(false);

  // Keep funis accessible in callbacks without stale closure
  const funisRef = useRef(funis);
  useEffect(() => { funisRef.current = funis; }, [funis]);

  useEffect(() => {
    const built = buildHubElements(tipo, funis, onEdit, onDelete);
    setNodes(built.nodes);
    setEdges(built.edges);

    // Center the canvas the first time nodes are loaded
    if (!hasFittedRef.current && built.nodes.length > 0) {
      hasFittedRef.current = true;
      // rAF gives ReactFlow one frame to measure node sizes before fitting
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 300 });
      });
    }
  }, [tipo, funis, onEdit, onDelete, setNodes, setEdges, fitView]);

  const isValidConnection = useCallback(
    (edge: Connection | Edge) =>
      Boolean(edge.source && edge.target && edge.source !== edge.target),
    []
  );

  const onNodeDragStop = useCallback(
    async (_: unknown, node: FunnelFlowNode) => {
      if (node.type !== "funnel") return;
      try {
        await updateFunil(node.id, { posX: node.position.x, posY: node.position.y });
      } catch (e) {
        console.error("Falha ao salvar posição:", e);
      }
    },
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: HubFlowNode | FunnelFlowNode) => {
    if (node.type !== "funnel") return;
    const funil = funisRef.current.find((f) => f.id === node.id);
    if (funil) setSelectedFunil(funil);
  }, []);

  const ativo = funis.filter((f) => f.status === "Ativo").length;
  const teste = funis.filter((f) => f.status === "Em teste").length;
  const pausado = funis.filter((f) => f.status === "Pausado").length;
  const descartado = funis.filter((f) => f.status === "Descartado").length;

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        minZoom={0.05}
        maxZoom={2}
        deleteKeyCode={null}
        nodesConnectable={false}
      >
        <Background gap={18} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          style={{ borderRadius: 10, border: "1px solid var(--border)" }}
        />
        <Panel position="top-left" className="funis-flow-panel">
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)" }}>
              Mapa de conexões
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Clique num card para ver detalhes</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>● {ativo} Ativos</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>● {teste} Em teste</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>● {pausado} Pausados</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>● {descartado} Descartados</span>
          </div>
        </Panel>
      </ReactFlow>

      {selectedFunil && (
        <DetailPanel
          funil={selectedFunil}
          onClose={() => setSelectedFunil(null)}
          onEdit={onEdit}
        />
      )}
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function TipoHubCanvas({
  tipo,
  funis,
  onEdit,
  onDelete,
}: {
  tipo: string;
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="funis-flow-wrap" style={{ position: "relative" }}>
      <ReactFlowProvider>
        <TipoHubFlowInner tipo={tipo} funis={funis} onEdit={onEdit} onDelete={onDelete} />
      </ReactFlowProvider>
    </div>
  );
}
