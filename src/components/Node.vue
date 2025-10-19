<template>
  <div 
    :id="node.id"
    :class="['workflow-node', node.type]" 
    :style="nodeStyle"
    @mousedown.stop="handleMouseDown"
  >
    <div class="node-label">{{ node.label }}</div>

    <div class="node-controls">
      <button @click.stop="handleInsert('above')" class="control-btn top-btn">↑</button>
      <button @click.stop="handleInsert('below')" class="control-btn bottom-btn">+</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkflowStore } from '@/store';

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const workflowStore = useWorkflowStore();
const Z = computed(() => workflowStore.zoomLevel);

const nodeStyle = computed(() => {
    // 节点的原始位置乘以缩放因子 Z
    const scaledX = props.node.position.x * Z.value;
    const scaledY = props.node.position.y * Z.value;

    return {
        // 使用 transform: translate() 应用缩放后的位置 + 平移偏移量
        transform: `translate(
          ${scaledX + workflowStore.viewportOffset.x}px,
          ${scaledY + workflowStore.viewportOffset.y}px
        )`,
        
        // 节点的宽度和高度乘以缩放因子 Z
        width: `${props.node.width * Z.value}px`,
        height: `${props.node.height * Z.value}px`,
        
        fontSize: `${14 * Z.value}px`, 
        zIndex: workflowStore.draggingNodeId === props.node.id ? 10 : 1,
    };
});

function handleMouseDown(event) {
    if (event.button !== 0) return; 
    // 启动节点拖拽，传入鼠标在屏幕上的原始坐标
    workflowStore.startDrag(props.node.id, event.clientX, event.clientY);
}

function handleInsert(direction) {
    workflowStore.insertNode(props.node.id, direction);
}
</script>

<style scoped>
/* 保持 Node.vue 的样式不变 */
.workflow-node {
  position: absolute;
  border-radius: 4px;
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: box-shadow 0.1s;
  will-change: transform;
}

.workflow-node:active {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  cursor: grabbing;
}

.node-label {
    padding: 0 10px;
    user-select: none;
    white-space: nowrap;
}

.start, .end { background-color: #e6ffed; border-color: #69c0ff; }
.task { background-color: #f0f5ff; border-color: #40a9ff; }

.node-controls {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.control-btn {
    position: absolute;
    width: 20px;
    height: 20px;
    line-height: 16px;
    text-align: center;
    border-radius: 50%;
    background-color: #007bff;
    color: white;
    border: 2px solid white;
    cursor: pointer;
    pointer-events: all; 
    font-size: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.top-btn { top: -10px; left: 50%; transform: translateX(-50%); }
.bottom-btn { bottom: -10px; left: 50%; transform: translateX(-50%); }
</style>