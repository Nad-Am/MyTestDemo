// store.js
import { defineStore } from "pinia";
import { reactive } from "vue";

// --- ⚙️ 核心常量 ---
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 60;
export const SPACING = 60;
export const VIEWPORT_WIDTH = 1200;
export const VIEWPORT_HEIGHT = 800;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;
export const ZOOM_STEP = 0.1;

// --- 初始数据 ---
function createSampleData(count = 10000) {
  const nodes = new Map();
  const edges = new Map();

  for (let i = 0; i < count; i++) {
    const id = `node_${i}`;
    nodes.set(id, {
      id,
      label: `任务 ${i}`,
      type: i === 0 ? "start" : i === count - 1 ? "end" : "task",
      position: { x: 100, y: i * (NODE_HEIGHT + SPACING) },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });

    if (i > 0) {
      const edgeId = `e_${i - 1}_${i}`;
      edges.set(edgeId, {
        id: edgeId,
        source: `node_${i - 1}`,
        target: id,
        label: "连线",
      });
    }
  }

  return { nodes, edges };
}

const sampleData = createSampleData(1000); // 可修改节点数量

export const useWorkflowStore = defineStore("workflow", {
  state: () => ({
    nodes: sampleData.nodes,
    edges: sampleData.edges,
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: 1,
    isDragging: false,
    draggingNodeId: null,
    dragStart: { x: 0, y: 0 },
  }),

  getters: {
    visibleEdgesArray(state) {
      const Z = state.zoomLevel;
      return Array.from(state.edges.values()).filter((edge) => {
        const source = state.nodes.get(edge.source);
        const target = state.nodes.get(edge.target);
        if (!source || !target) return false;

        const sx =
          source.position.x * Z +
          (source.width / 2) * Z +
          state.viewportOffset.x;
        const sy =
          source.position.y * Z +
          (source.height / 2) * Z +
          state.viewportOffset.y;
        const tx =
          target.position.x * Z +
          (target.width / 2) * Z +
          state.viewportOffset.x;
        const ty =
          target.position.y * Z +
          (target.height / 2) * Z +
          state.viewportOffset.y;

        // 简单快速裁剪
        if ((sx < 0 && tx < 0) || (sx > VIEWPORT_WIDTH && tx > VIEWPORT_WIDTH))
          return false;
        if (
          (sy < 0 && ty < 0) ||
          (sy > VIEWPORT_HEIGHT && ty > VIEWPORT_HEIGHT)
        )
          return false;
        return true;
      });
    },

    visibleNodesArray(state) {
      const Z = state.zoomLevel;
      const visibleNodeIds = new Set();

      Array.from(state.nodes.values()).forEach((node) => {
        const x = node.position.x * Z + state.viewportOffset.x;
        const y = node.position.y * Z + state.viewportOffset.y;
        const w = node.width * Z;
        const h = node.height * Z;
        if (
          x + w >= 0 &&
          x <= VIEWPORT_WIDTH &&
          y + h >= 0 &&
          y <= VIEWPORT_HEIGHT
        ) {
          visibleNodeIds.add(node.id);
        }
      });

      // 连接到可见边的节点也可见
      this.visibleEdgesArray.forEach((edge) => {
        visibleNodeIds.add(edge.source);
        visibleNodeIds.add(edge.target);
      });

      return Array.from(visibleNodeIds).map((id) => state.nodes.get(id));
    },

    getEdgePath: (state) => (edgeId) => {
      const edge = state.edges.get(edgeId);
      if (!edge) return "";
      const source = state.nodes.get(edge.source);
      const target = state.nodes.get(edge.target);
      if (!source || !target) return "";

      const Z = state.zoomLevel;
      const sx =
        source.position.x * Z + (source.width / 2) * Z + state.viewportOffset.x;
      const sy =
        source.position.y * Z +
        (source.height / 2) * Z +
        state.viewportOffset.y;
      const tx =
        target.position.x * Z + (target.width / 2) * Z + state.viewportOffset.x;
      const ty =
        target.position.y * Z +
        (target.height / 2) * Z +
        state.viewportOffset.y;

      return `M ${sx} ${sy} L ${tx} ${ty}`;
    },
  },

  actions: {
    startDrag(nodeId, startX, startY) {
      this.isDragging = true;
      this.draggingNodeId = nodeId;
      this.dragStart = { x: startX, y: startY };
    },
    dragNode(newX, newY) {
      if (!this.isDragging || !this.draggingNodeId) return;
      const node = this.nodes.get(this.draggingNodeId);
      if (!node) return;

      const Z = this.zoomLevel;
      node.position.x += (newX - this.dragStart.x) / Z;
      node.position.y += (newY - this.dragStart.y) / Z;
      this.dragStart.x = newX;
      this.dragStart.y = newY;
    },
    endDrag() {
      this.isDragging = false;
      this.draggingNodeId = null;
    },
    zoomViewport(delta) {
      const newZoom = this.zoomLevel + delta * ZOOM_STEP;
      this.zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    },
    setViewportOffset(offset) {
      this.viewportOffset = offset;
    },
  },
});
