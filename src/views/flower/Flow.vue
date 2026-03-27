<template>
  <div 
    :class="{'workflow-designer': true, 'panning': isCanvasPanning}" 
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @wheel="handleWheel"
  >
    <div class="header-controls">
      <button @click="handleSaveWorkflow">💾 保存工作流</button>
      <div class="zoom-controls">
        <button @click="workflowStore.zoomViewport(1)" :disabled="workflowStore.zoomLevel >= 2.0">+</button>
        <span>缩放: {{ (workflowStore.zoomLevel * 100).toFixed(0) }}%</span>
        <button @click="workflowStore.zoomViewport(-1)" :disabled="workflowStore.zoomLevel <= 0.5">-</button>
      </div>
    </div>

    <svg class="workflow-svg">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#999" />
        </marker>
        <marker id="arrowhead-hover" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#007bff" />
        </marker>
      </defs>

      <path
        v-for="edge in workflowStore.visibleEdgesArray"
        :key="edge.id"
        :d="workflowStore.getEdgePath(edge.id)"
        class="workflow-edge"
        marker-end="url(#arrowhead)"
      />
      
      <text
        v-for="edge in workflowStore.visibleEdgesArray"
        :key="edge.id + '-label'"
        :x="workflowStore.getEdgeLabelPosition(edge.id).x"
        :y="workflowStore.getEdgeLabelPosition(edge.id).y - 10"
        text-anchor="middle"
        fill="#555"
        font-size="12"
      >
        {{ edge.label }}
      </text>
    </svg>

    <Node
      v-for="node in workflowStore.visibleNodesArray"
      :key="node.id"
      :node="node"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWorkflowStore } from '@/store/selfDes';
import Node from '@/components/Node.vue';

const workflowStore = useWorkflowStore();

// --- 平移状态 ---
const isCanvasPanning = ref(false);
const panStart = { x: 0, y: 0 };
let animationFrameId = null;

// 鼠标按下：开始平移或拖拽节点
function handleCanvasMouseDown(event) {
  if (event.button !== 0) return;

  // 如果没有拖拽节点，则开始画布平移
  if (!workflowStore.draggingNodeId) {
    isCanvasPanning.value = true;
    panStart.x = event.clientX;
    panStart.y = event.clientY;
  }
}

// 鼠标移动：执行平移或拖拽
function handleMouseMove(event) {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = requestAnimationFrame(() => {
    if (workflowStore.isDragging) {
      // 拖拽节点：Pinia Action 中已处理缩放修正
      workflowStore.dragNode(event.clientX, event.clientY);
    } else if (isCanvasPanning.value) {
      // 画布平移：直接使用屏幕像素位移
      const dx = event.clientX - panStart.x;
      const dy = event.clientY - panStart.y;
      
      const newOffsetX = workflowStore.viewportOffset.x + dx;
      const newOffsetY = workflowStore.viewportOffset.y + dy;
      
      workflowStore.setViewportOffset({ x: newOffsetX, y: newOffsetY });

      // 更新平移起点
      panStart.x = event.clientX;
      panStart.y = event.clientY;
    }
  });
}

function handleMouseUp() {
  isCanvasPanning.value = false;
  workflowStore.endDrag();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

// 滚轮事件：执行缩放
function handleWheel(event) {
    event.preventDefault();

    const delta = event.deltaY < 0 ? 1 : -1; 
    workflowStore.zoomViewport(delta);
}

async function handleSaveWorkflow() {
    try {
        await workflowStore.saveWorkflow('/api/workflow/save');
        alert("工作流已成功保存！"); 
    } catch (error) {
        alert("保存失败，请查看控制台获取详情。");
    }
}
</script>

<style>
/* 样式重置和全局样式 */
body { margin: 0; font-family: sans-serif; overflow: hidden; }

.workflow-designer {
  position: relative;
  width: 1000px;
  height: 600px;
  background-color: #f8f8f8;
  cursor: default;
  overflow: hidden; 
}

/* 鼠标样式：平移时切换 */
.workflow-designer.panning {
  cursor: grab;
}

/* SVG 连线层 */
.workflow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 确保不影响鼠标在 SVG 下方的事件 */
  z-index: 10; /* 确保 SVG 在节点之上 */
}

.workflow-edge {
  fill: none;
  stroke: #999;
  stroke-width: 2;
  transition: all 0.2s ease;
  cursor: pointer;
}

.workflow-edge:hover {
  stroke: #007bff;
  stroke-width: 3;
  marker-end: url(#arrowhead-hover);
}

/* 头部控制按钮 */
.header-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 100;
    display: flex;
    gap: 10px;
}

.header-controls button {
    padding: 8px 15px;
    cursor: pointer;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
}

.zoom-controls {
    display: flex;
    align-items: center;
    gap: 5px;
    background: white;
    padding: 0 5px;
    border-radius: 4px;
    border: 1px solid #ccc;
}
.zoom-controls button {
    background-color: #f0f0f0;
    color: #333;
    padding: 5px 10px;
    border-radius: 2px;
}
.zoom-controls span {
    color: #333;
    font-size: 14px;
}
</style>