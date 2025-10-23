<template>
  <div class="canvas-container">
    <canvas
      ref="canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel.prevent="onWheel"
      width="1200"
      height="800"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useWorkflowStore } from '@/store';

const store = useWorkflowStore();
const canvas = ref(null);
const ctx = ref(null);

const visibleNodes = computed(() => store.visibleNodesArray);
const visibleEdges = computed(() => store.visibleEdgesArray);

let draggingNode = null;
let dragOffset = { x: 0, y: 0 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

function draw() {
  if (!ctx.value) return;
  const c = ctx.value;
  c.clearRect(0, 0, canvas.value.width, canvas.value.height);
  c.save();
  c.translate(store.viewportOffset.x, store.viewportOffset.y);
  c.scale(store.zoomLevel, store.zoomLevel);

  // 绘制边
  visibleEdges.value.forEach(edge => {
    const source = store.nodes.get(edge.source);
    const target = store.nodes.get(edge.target);
    if (!source || !target) return;

    const sx = source.position.x + source.width / 2;
    const sy = source.position.y + source.height / 2;
    const tx = target.position.x + target.width / 2;
    const ty = target.position.y + target.height / 2;

    c.strokeStyle = '#999';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(tx, ty);
    c.stroke();

    // 箭头
    const angle = Math.atan2(ty - sy, tx - sx);
    const arrowLength = 8;
    const arrowAngle = Math.PI / 6;
    c.beginPath();
    c.moveTo(tx, ty);
    c.lineTo(tx - arrowLength * Math.cos(angle - arrowAngle), ty - arrowLength * Math.sin(angle - arrowAngle));
    c.lineTo(tx - arrowLength * Math.cos(angle + arrowAngle), ty - arrowLength * Math.sin(angle + arrowAngle));
    c.closePath();
    c.fillStyle = '#999';
    c.fill();
  });

  // 绘制节点
  visibleNodes.value.forEach(node => {
    c.fillStyle = node.type === 'start' ? '#e6ffed' : node.type === 'end' ? '#ffe6e6' : '#f0f5ff';
    c.strokeStyle = node.type === 'start' ? '#69c0ff' : node.type === 'end' ? '#ff4d4f' : '#40a9ff';
    c.lineWidth = 2;
    c.fillRect(node.position.x, node.position.y, node.width, node.height);
    c.strokeRect(node.position.x, node.position.y, node.width, node.height);

    c.fillStyle = '#333';
    c.font = '14px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(node.label, node.position.x + node.width / 2, node.position.y + node.height / 2);
  });

  c.restore();
}

function getMousePos(e) {
  const rect = canvas.value.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top),
  };
}

function onMouseDown(e) {
  const pos = getMousePos(e);
  draggingNode = null;
  isPanning = false;

  // 是否点击节点
  visibleNodes.value.forEach(node => {
    if (
      pos.x >= node.position.x * store.zoomLevel + store.viewportOffset.x &&
      pos.x <= (node.position.x + node.width) * store.zoomLevel + store.viewportOffset.x &&
      pos.y >= node.position.y * store.zoomLevel + store.viewportOffset.y &&
      pos.y <= (node.position.y + node.height) * store.zoomLevel + store.viewportOffset.y
    ) {
      draggingNode = node;
      dragOffset.x = pos.x / store.zoomLevel - node.position.x;
      dragOffset.y = pos.y / store.zoomLevel - node.position.y;
    }
  });

  if (!draggingNode) {
    isPanning = true;
    panStart.x = pos.x - store.viewportOffset.x;
    panStart.y = pos.y - store.viewportOffset.y;
  }
}

function onMouseMove(e) {
  const pos = getMousePos(e);
  if (draggingNode) {
    draggingNode.position.x = pos.x / store.zoomLevel - dragOffset.x;
    draggingNode.position.y = pos.y / store.zoomLevel - dragOffset.y;
  } else if (isPanning) {
    store.viewportOffset.x = pos.x - panStart.x;
    store.viewportOffset.y = pos.y - panStart.y;
  }
  draw();
}

function onMouseUp() {
  draggingNode = null;
  isPanning = false;
}

function onWheel(e) {
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  store.zoomLevel *= delta;
  store.zoomLevel = Math.max(0.2, Math.min(3, store.zoomLevel));
  draw();
}

onMounted(() => {
  ctx.value = canvas.value.getContext('2d');
  draw();
});
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f8f8f8;
}
canvas {
  border: 1px solid #ccc;
  display: block;
}
</style>
