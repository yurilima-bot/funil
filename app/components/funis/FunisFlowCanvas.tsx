"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BaseEdge,
  type Connection,
  Controls,
  EdgeLabelRenderer,
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
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
  getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Funil } from "@/types/funil";
import { updateFunil } from "@/lib/db";

const NODE_W = 240;
const NODE_H = 108;
const GROUP_GAP = 96;

const TIPO_ORDER: Record<string, number> = { Lead: 0, Oferta: 1, Upsell: 2 };

const STATUS_STROKE: Record<string, string> = {
  Ativo: "#059669",
  "Em teste": "#d97706",
  Pausado: "#64748b",
  Descartado: "#dc2626",
};

const TIPO_ICON: Record<string, string> = {
  Lead: "📈",
  Oferta: "🛒",
  Upsell: "⬆️",
};

function groupKey(f: Funil): string {
  const o = (f.oferta || "").trim();
  if (o) return o;
  return f.codigo || f.id;
}

function groupFunis(funis: Funil[]): Funil[][] {
  const map = new Map<string, Funil[]>();
  for (const f of funis) {
    const k = groupKey(f);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(f);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const ta = TIPO_ORDER[a.tipo] ?? 9;
      const tb = TIPO_ORDER[b.tipo] ?? 9;
      if (ta !== tb) return ta - tb;
      return (a.nome || "").localeCompare(b.nome || "");
    });
  }
  return [...map.values()].filter((g) => g.length > 0);
}

/** Grupo (ordenado) que contém o funil com esse id, ou null. */
function findGroupContaining(funis: Funil[], nodeId: string): Funil[] | null {
  for (const g of groupFunis(funis)) {
    if (g.some((f) => f.id === nodeId)) return g;
  }
  return null;
}

/** Fluxo “automático”: nenhum passo do grupo tem nextIds persistido (após overrides). */
function isGroupAutoMode(group: Funil[]): boolean {
  return !group.some((f) => (f.nextIds?.length || 0) > 0);
}

function normCodigo(s: string | undefined): string {
  return (s || "").trim().toUpperCase();
}

/** Step com `oferta` = codigo de outro funil → aresta automática no mapa (sem vínculo, sem aresta por este meio). */
function resolveVinculoTarget(all: Funil[], f: Funil): Funil | null {
  const link = normCodigo(f.oferta);
  if (!link) return null;
  if (link === normCodigo(f.codigo)) return null;
  return all.find((t) => t.id !== f.id && normCodigo(t.codigo) === link) ?? null;
}

/** Aresta corresponde ao vínculo por campo oferta → codigo do target. */
function isVinculoEdge(funis: Funil[], e: Edge): boolean {
  if (e.source === e.target) return false;
  const src = funis.find((f) => f.id === e.source);
  const tgt = funis.find((f) => f.id === e.target);
  if (!src || !tgt) return false;
  const link = normCodigo(src.oferta);
  return link.length > 0 && link === normCodigo(tgt.codigo);
}

/** Cadeia padrão por ordem de tipo (só usada ao materializar remoção legada). */
function sequentialNextIdsMap(group: Funil[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (let i = 0; i < group.length; i++) {
    const id = group[i].id;
    m.set(id, i < group.length - 1 ? [group[i + 1].id] : []);
  }
  return m;
}

/** Ordem estável (Lead → Oferta → Upsell, depois codigo) para desempate. */
function compareFunilFlowOrder(a: Funil, b: Funil): number {
  const ta = TIPO_ORDER[a.tipo] ?? 9;
  const tb = TIPO_ORDER[b.tipo] ?? 9;
  if (ta !== tb) return ta - tb;
  return (a.codigo || "").localeCompare(b.codigo || "");
}

/**
 * Ordem 1 → 2 → 3 sempre da esquerda para a direita (topo sort nas arestas internas;
 * nós isolados vêm depois na ordem de funil).
 */
function orderNodesLeftToRight(nodeIds: string[], edges: Edge[], funById: Map<string, Funil>): string[] {
  const idSet = new Set(nodeIds);
  const outAdj = new Map<string, string[]>();
  const inCount = new Map<string, number>();
  for (const id of nodeIds) {
    outAdj.set(id, []);
    inCount.set(id, 0);
  }
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) continue;
    outAdj.get(e.source)!.push(e.target);
    inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
  }

  const sortIds = (arr: string[]) =>
    [...arr].sort((a, b) => {
      const fa = funById.get(a);
      const fb = funById.get(b);
      if (!fa || !fb) return a.localeCompare(b);
      return compareFunilFlowOrder(fa, fb);
    });

  const q = sortIds(nodeIds.filter((id) => (inCount.get(id) || 0) === 0));
  const order: string[] = [];

  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of outAdj.get(u) || []) {
      inCount.set(v, (inCount.get(v) || 0) - 1);
      if (inCount.get(v) === 0) {
        q.push(v);
        sortIds(q);
      }
    }
  }

  const leftover = sortIds(nodeIds.filter((id) => !order.includes(id)));
  return [...order, ...leftover];
}

/** Pausado / em teste à esquerda → Ativo à direita (estilo decisão → atual). */
function statusLayoutOrder(status: string | undefined): number {
  const s = status || "";
  if (s === "Pausado") return 0;
  if (s === "Em teste") return 1;
  if (s === "Ativo") return 2;
  return 3;
}

function orderNodesForFunnelStrip(
  nodeIds: string[],
  edges: Edge[],
  funById: Map<string, Funil>
): string[] {
  const topo = orderNodesLeftToRight(nodeIds, edges, funById);
  return [...nodeIds].sort((a, b) => {
    const fa = funById.get(a)!;
    const fb = funById.get(b)!;
    const sr = statusLayoutOrder(fa.status) - statusLayoutOrder(fb.status);
    if (sr !== 0) return sr;
    const ia = topo.indexOf(a);
    const ib = topo.indexOf(b);
    if (ia !== ib) return ia - ib;
    return compareFunilFlowOrder(fa, fb);
  });
}

function layoutFlowStripLR(nodes: FunnelFlowNode[], edges: Edge[]): FunnelFlowNode[] {
  const ids = nodes.map((n) => n.id);
  const funById = new Map(nodes.map((n) => [n.id, n.data.funil]));
  const order = orderNodesForFunnelStrip(ids, edges, funById);
  const GAP_X = 44;
  const posById = new Map(order.map((id, i) => [id, i * (NODE_W + GAP_X)]));
  return nodes.map((n) => ({
    ...n,
    position: {
      x: posById.get(n.id) ?? 0,
      y: 0,
    },
  }));
}

export type FunnelNodeData = {
  funil: Funil;
  groupLabel: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

type FunnelFlowNode = Node<FunnelNodeData, "funnel">;

function FunnelNode({ data }: NodeProps<FunnelFlowNode>) {
  const f = data.funil;
  const stroke = STATUS_STROKE[f.status] || "#94a3b8";
  return (
    <div
      className="funis-flow-node"
      style={{
        width: NODE_W - 6,
        minHeight: NODE_H - 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: "#fff",
        border: `2px solid ${stroke}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text4)", marginBottom: 4 }}>
        {data.groupLabel}
      </div>
      <div style={{ fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>{f.codigo}</div>
      <div
        style={{
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.25,
          marginBottom: 8,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {f.nome}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <span aria-hidden>{TIPO_ICON[f.tipo] || "📄"}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{f.tipo || "?"}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: stroke }}>{f.status}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => data.onEdit(f.id)}>
          Editar
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => data.onDelete(f.id)}>
          Excluir
        </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes: NodeTypes = { funnel: FunnelNode };

function buildFlowElements(
  funis: Funil[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void
): { nodes: FunnelFlowNode[]; edges: Edge[] } {
  const groups = groupFunis(funis);
  const nodes: FunnelFlowNode[] = [];
  const edges: Edge[] = [];
  let yCursor = 0;

  for (const group of groups) {
    const label = groupKey(group[0]);
    const anyNextIds = group.some((f) => (f.nextIds?.length || 0) > 0);
    const hasAnySavedPos = group.some(
      (f) => typeof f.posX === "number" && typeof f.posY === "number"
    );
    const groupNodes: FunnelFlowNode[] = group.map((f) => ({
      id: f.id,
      type: "funnel",
      data: {
        funil: f,
        groupLabel: label,
        onEdit,
        onDelete,
      },
      position: hasAnySavedPos
        ? { x: f.posX ?? 0, y: f.posY ?? 0 }
        : { x: 0, y: 0 },
    }));

    const groupEdges: Edge[] = [];
    const edgePairSeen = new Set<string>();

    function pushDeduped(edge: Edge) {
      if (edge.source === edge.target) return;
      const k = `${edge.source}->${edge.target}`;
      if (edgePairSeen.has(k)) return;
      edgePairSeen.add(k);
      groupEdges.push(edge);
    }

    // Conexões manuais salvas (canvas / next_ids)
    if (anyNextIds) {
      for (const f of group) {
        for (const targetId of f.nextIds || []) {
          if (targetId === f.id) continue;
          pushDeduped({
            id: `e-${f.id}-${targetId}`,
            type: "deletable",
            source: f.id,
            target: targetId,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
          });
        }
      }
    }

    // Vínculo por formulário: oferta = codigo do outro step → uma aresta automática (sem oferta, sem esta linha)
    for (const f of group) {
      const vTarget = resolveVinculoTarget(funis, f);
      if (!vTarget) continue;
      pushDeduped({
        id: `e-vinc-${f.id}-${vTarget.id}`,
        type: "deletable",
        source: f.id,
        target: vTarget.id,
        animated: true,
        style: { stroke: "#7c3aed", strokeWidth: 2 },
      });
    }

    const laid = (hasAnySavedPos ? groupNodes : layoutFlowStripLR(groupNodes, groupEdges)) as FunnelFlowNode[];
    const ys = laid.map((n) => n.position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...laid.map((n) => n.position.y + NODE_H));

    const dy = yCursor - minY;
    laid.forEach((n) => {
      n.position = { x: n.position.x, y: n.position.y + dy };
    });

    nodes.push(...laid);
    edges.push(...groupEdges);

    yCursor = maxY + dy + GROUP_GAP;
  }

  return { nodes, edges };
}

function FlowInner({
  funis,
  onEdit,
  onDelete,
}: {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { fitView } = useReactFlow();

  // Overrides locais para UX instantânea (não depende do refresh do db no pai)
  const [overrides, setOverrides] = useState<Record<string, Partial<Funil>>>({});

  const funisView = useMemo(() => {
    if (!funis.length) return funis;
    return funis.map((f) => {
      const ov = overrides[f.id];
      return ov ? ({ ...f, ...ov } as Funil) : f;
    });
  }, [funis, overrides]);

  const isCustomFlow = useMemo(() => {
    return funisView.some((f) => (f.nextIds?.length || 0) > 0);
  }, [funisView]);

  const persistEdgeDeletes = useCallback(
    async (edgesToDelete: Edge[]) => {
      try {
        const overridePatch: Record<string, Partial<Funil>> = {};
        const updates: Promise<unknown>[] = [];

        const nonVinculo: Edge[] = [];

        for (const e of edgesToDelete) {
          if (isVinculoEdge(funisView, e)) {
            const src = funisView.find((f) => f.id === e.source);
            const curNext = src?.nextIds || [];
            const nextIds = curNext.filter((t) => t !== e.target);
            overridePatch[e.source] = {
              ...(overridePatch[e.source] || {}),
              oferta: "",
              nextIds,
            };
            updates.push(updateFunil(e.source, { oferta: "", nextIds }));
          } else {
            nonVinculo.push(e);
          }
        }

        const autoPairRemovals = new Map<
          string,
          { group: Funil[]; pairs: Array<{ source: string; target: string }> }
        >();
        const customBySource = new Map<string, Set<string>>();

        for (const e of nonVinculo) {
          const G = findGroupContaining(funisView, e.source);
          if (!G) continue;

          const sameGroup = G.some((f) => f.id === e.target);

          if (!sameGroup) {
            if (!customBySource.has(e.source)) customBySource.set(e.source, new Set());
            customBySource.get(e.source)!.add(e.target);
            continue;
          }

          if (isGroupAutoMode(G)) {
            const k = groupKey(G[0]);
            if (!autoPairRemovals.has(k)) {
              autoPairRemovals.set(k, { group: G, pairs: [] });
            }
            autoPairRemovals.get(k)!.pairs.push({ source: e.source, target: e.target });
          } else {
            if (!customBySource.has(e.source)) customBySource.set(e.source, new Set());
            customBySource.get(e.source)!.add(e.target);
          }
        }

        for (const { group: G, pairs } of autoPairRemovals.values()) {
          const m = sequentialNextIdsMap(G);
          for (const { source, target } of pairs) {
            const cur = m.get(source) || [];
            m.set(source, cur.filter((t) => t !== target));
          }
          for (const f of G) {
            const nextIds = m.get(f.id) ?? [];
            overridePatch[f.id] = { ...(overridePatch[f.id] || {}), nextIds };
            updates.push(updateFunil(f.id, { nextIds }));
          }
        }

        for (const [sourceId, targets] of customBySource.entries()) {
          const src = funisView.find((f) => f.id === sourceId);
          const current = src?.nextIds || [];
          const nextIds = current.filter((t) => !targets.has(t));
          overridePatch[sourceId] = { ...(overridePatch[sourceId] || {}), nextIds };
          updates.push(updateFunil(sourceId, { nextIds }));
        }

        setOverrides((ov) => {
          const nextOv = { ...ov };
          for (const [id, partial] of Object.entries(overridePatch)) {
            nextOv[id] = { ...(nextOv[id] || {}), ...partial };
          }
          return nextOv;
        });

        await Promise.all(updates);
      } catch (e) {
        console.error("Falha ao remover conexão:", e);
      }
    },
    [funisView]
  );

  const persistEdgeDeletesRef = useRef(persistEdgeDeletes);
  persistEdgeDeletesRef.current = persistEdgeDeletes;

  const edgeTypes = useMemo<EdgeTypes>(
    () => ({
      deletable: function DeletableFlowEdge(props: EdgeProps) {
        const {
          id,
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          style,
          markerEnd,
          markerStart,
        } = props;
        const { getEdge } = useReactFlow();
        const [path, labelX, labelY] = getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });

        return (
          <>
            <BaseEdge
              id={id}
              path={path}
              style={style}
              markerEnd={markerEnd}
              markerStart={markerStart}
              interactionWidth={18}
            />
            <EdgeLabelRenderer>
              <div
                className="funis-flow-edge-delete-wrap nodrag nopan"
                style={{
                  position: "absolute",
                  transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                  pointerEvents: "all",
                }}
              >
                <button
                  type="button"
                  className="funis-flow-edge-delete"
                  aria-label="Remover conexão"
                  title="Desconectar"
                  onClick={(event) => {
                    event.stopPropagation();
                    const edge = getEdge(id);
                    if (edge) void persistEdgeDeletesRef.current([edge]);
                  }}
                >
                  ×
                </button>
              </div>
            </EdgeLabelRenderer>
          </>
        );
      },
    }),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FunnelFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const built = buildFlowElements(funisView, onEdit, onDelete);
    // Preserva posição ao filtrar; arestas vêm só do modelo (nextIds / cadeia) — evita reaparecer após remover.
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return built.nodes.map((n) => {
        const old = byId.get(n.id);
        if (!old) return n;
        return { ...n, position: old.position };
      });
    });
    setEdges(built.edges);
  }, [funisView, onEdit, onDelete, setNodes, setEdges]);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 200 });
    });
    return () => cancelAnimationFrame(t);
  }, [funisView, fitView]);

  const onInit = useCallback(() => {
    fitView({ padding: 0.15 });
  }, [fitView]);

  const isValidConnection = useCallback((edge: Connection | Edge) => {
    return Boolean(edge.source && edge.target && edge.source !== edge.target);
  }, []);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}`,
            type: "deletable",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          },
          eds
        )
      );

      // Persistir: adiciona target em nextIds do source
      try {
        const src = funisView.find((f) => f.id === connection.source);
        const current = src?.nextIds || [];
        const next = current.includes(connection.target) ? current : [...current, connection.target];
        setOverrides((ov) => ({ ...ov, [connection.source!]: { ...(ov[connection.source!] || {}), nextIds: next } }));
        await updateFunil(connection.source, { nextIds: next });
      } catch (e) {
        console.error("Falha ao salvar conexão:", e);
      }
    },
    [funisView, setEdges]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      void persistEdgeDeletes(edgesToDelete);
    },
    [persistEdgeDeletes]
  );

  const onNodeDragStop = useCallback(
    async (_: unknown, node: FunnelFlowNode) => {
      try {
        setOverrides((ov) => ({
          ...ov,
          [node.id]: { ...(ov[node.id] || {}), posX: node.position.x, posY: node.position.y },
        }));
        await updateFunil(node.id, { posX: node.position.x, posY: node.position.y });
      } catch (e) {
        console.error("Falha ao salvar posição:", e);
      }
    },
    []
  );

  const onResetFlow = useCallback(async () => {
    if (funisView.length === 0) return;
    if (!confirm("Resetar fluxo para automático?\n\nIsso vai remover conexões customizadas e posições salvas do canvas para os itens filtrados.")) {
      return;
    }
    try {
      // Atualiza UI instantaneamente
      setOverrides((ov) => {
        const next = { ...ov };
        for (const f of funisView) {
          next[f.id] = { ...(next[f.id] || {}), nextIds: [], posX: null, posY: null };
        }
        return next;
      });
      // Persiste no banco
      await Promise.all(
        funisView.map((f) => updateFunil(f.id, { nextIds: [], posX: null, posY: null }))
      );
    } catch (e) {
      console.error("Falha ao resetar fluxo:", e);
    }
  }, [funisView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onEdgesDelete={onEdgesDelete}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onInit={onInit}
      fitView
      minZoom={0.05}
      maxZoom={2}
      deleteKeyCode={["Backspace", "Delete"]}
      multiSelectionKeyCode={["Shift"]}
      onlyRenderVisibleElements
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)" }}>
            Mapa de fluxo · {funisView.length} step{funisView.length !== 1 ? "s" : ""}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onResetFlow}>
            Resetar fluxo
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 6, lineHeight: 1.35 }}>
          {isCustomFlow
            ? "Modo avançado: conexões extras salvas no canvas (azul)."
            : "Faixa sempre da esquerda para a direita (1→2→3). Roxo = vínculo no cadastro. Não dá para ligar um step a ele mesmo."}
          {" "}Use × na aresta ou Delete/Backspace na aresta selecionada para desconectar.
        </div>
      </Panel>
    </ReactFlow>
  );
}

export default function FunisFlowCanvas({
  funis,
  onEdit,
  onDelete,
}: {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="funis-flow-wrap">
      <ReactFlowProvider>
        <FlowInner funis={funis} onEdit={onEdit} onDelete={onDelete} />
      </ReactFlowProvider>
    </div>
  );
}
