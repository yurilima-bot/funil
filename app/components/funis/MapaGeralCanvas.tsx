"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Funil } from "@/types/funil";

// ─── Hub overview node ────────────────────────────────────────────────────────

type OverviewHubData = {
  tipo: string;
  label: string;
  icon: string;
  color: string;
  counts: { ativo: number; teste: number; pausado: number; descartado: number };
};

type OverviewHubNode = Node<OverviewHubData, "overview-hub">;

function OverviewHubNode({ data }: NodeProps<OverviewHubNode>) {
  return (
    <div
      style={{
        width: 220,
        minHeight: 150,
        padding: "18px 20px",
        borderRadius: 18,
        background: `linear-gradient(145deg, ${data.color}1a 0%, #ffffff 100%)`,
        border: `3px solid ${data.color}`,
        boxShadow: `0 8px 40px ${data.color}30`,
        textAlign: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: data.color, width: 8, height: 8, opacity: 0 }}
      />

      <div style={{ fontSize: 36, marginBottom: 6 }}>{data.icon}</div>
      <div style={{ fontWeight: 900, fontSize: 16, color: data.color, marginBottom: 10 }}>
        {data.label}
      </div>

      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "3px 8px", borderRadius: 8 }}>
          ✓ {data.counts.ativo} Ativos
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "3px 8px", borderRadius: 8 }}>
          🧪 {data.counts.teste}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 8 }}>
          ⏸ {data.counts.pausado}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fff1f2", padding: "3px 8px", borderRadius: 8 }}>
          🗑 {data.counts.descartado}
        </span>
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: data.color,
          border: `1px solid ${data.color}`,
          borderRadius: 8,
          padding: "4px 12px",
          display: "inline-block",
        }}
      >
        Ver mapa →
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: data.color, width: 8, height: 8, opacity: 0 }}
      />
    </div>
  );
}

const overviewNodeTypes: NodeTypes = { "overview-hub": OverviewHubNode };

// ─── Build elements ───────────────────────────────────────────────────────────

function buildOverviewElements(db: Funil[]): { nodes: OverviewHubNode[]; edges: Edge[] } {
  const tipos = [
    { tipo: "Lead", label: "Leads", icon: "📈", color: "#10b981", x: -380 },
    { tipo: "Oferta", label: "Ofertas / VSL", icon: "🛒", color: "#1a56db", x: 0 },
    { tipo: "Upsell", label: "Upsell", icon: "⬆️", color: "#f59e0b", x: 380 },
  ];

  const nodes: OverviewHubNode[] = tipos.map(({ tipo, label, icon, color, x }) => ({
    id: `overview-hub-${tipo}`,
    type: "overview-hub" as const,
    position: { x, y: 0 },
    draggable: false,
    selectable: true,
    data: {
      tipo,
      label,
      icon,
      color,
      counts: {
        ativo: db.filter((f) => f.tipo === tipo && f.status === "Ativo").length,
        teste: db.filter((f) => f.tipo === tipo && f.status === "Em teste").length,
        pausado: db.filter((f) => f.tipo === tipo && f.status === "Pausado").length,
        descartado: db.filter((f) => f.tipo === tipo && f.status === "Descartado").length,
      },
    },
  }));

  const edges: Edge[] = [
    {
      id: "e-lead-oferta",
      source: "overview-hub-Lead",
      target: "overview-hub-Oferta",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#10b981", strokeWidth: 2.5 },
      label: "captação",
      labelStyle: { fontSize: 10, fontWeight: 700, fill: "#10b981" },
      labelBgStyle: { fill: "#f0fdf4" },
    },
    {
      id: "e-oferta-upsell",
      source: "overview-hub-Oferta",
      target: "overview-hub-Upsell",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#1a56db", strokeWidth: 2.5 },
      label: "conversão",
      labelStyle: { fontSize: 10, fontWeight: 700, fill: "#1a56db" },
      labelBgStyle: { fill: "#eff4ff" },
    },
  ];

  return { nodes, edges };
}

// ─── Inner component ──────────────────────────────────────────────────────────

function MapaGeralFlowInner({
  db,
  onSelect,
}: {
  db: Funil[];
  onSelect: (tipo: string) => void;
}) {
  const [nodes, setNodes] = useNodesState<OverviewHubNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();
  const hasFittedRef = useRef(false);

  // Keep onSelect in a ref so onNodeClick never goes stale
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const built = buildOverviewElements(db);
    setNodes(built.nodes);
    setEdges(built.edges);

    if (!hasFittedRef.current && built.nodes.length > 0) {
      hasFittedRef.current = true;
      requestAnimationFrame(() => {
        fitView({ padding: 0.25, duration: 300 });
      });
    }
  }, [db, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: OverviewHubNode) => {
    const tipo = (node.data as OverviewHubData).tipo;
    if (tipo) onSelectRef.current(tipo);
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={overviewNodeTypes}
      onNodeClick={onNodeClick}
      minZoom={0.2}
      maxZoom={2}
      deleteKeyCode={null}
      nodesConnectable={false}
      nodesDraggable={false}
      elementsSelectable={false}
    >
      <Background gap={20} size={1} color="#e5e7eb" />
      <Controls showInteractive={false} />
      <MiniMap
        zoomable
        pannable
        style={{ borderRadius: 10, border: "1px solid var(--border)" }}
      />
    </ReactFlow>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function MapaGeralCanvas({
  db,
  onSelect,
}: {
  db: Funil[];
  onSelect: (tipo: string) => void;
}) {
  return (
    <div className="funis-flow-wrap">
      <ReactFlowProvider>
        <MapaGeralFlowInner db={db} onSelect={onSelect} />
      </ReactFlowProvider>
    </div>
  );
}
