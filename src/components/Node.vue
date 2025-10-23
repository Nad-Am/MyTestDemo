<template>
  <div 
    :id="node.id"
    :class="['workflow-node', node.type, node.status]" 
    :style="nodeStyle"
    @mousedown.stop="handleMouseDown"
  >
    <div class="node-icon">{{ getNodeIcon(node.type) }}</div>
    <div class="node-label">{{ node.label }}</div>
    <div class="node-status" v-if="node.status">{{ getStatusText(node.status) }}</div>

    <div class="node-controls">
      <button @click.stop="handleInsert('above')" class="control-btn top-btn">↑</button>
      <button @click.stop="handleInsert('below')" class="control-btn bottom-btn">+</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkflowStore, NODE_STATUS } from '@/store/selfDes';

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const workflowStore = useWorkflowStore();
const Z = computed(() => workflowStore.zoomLevel);

// 获取节点图标
function getNodeIcon(nodeType) {
  const icons = {
    start: '▶',
    end: '⏹',
    task: '⚙',
    branch: '🔀',
    loop: '🔄',
    parallel: '⧉',
    merge: '🔗',
    timer: '⏰',
    condition: '❓',
    subprocess: '📦'
  };
  return icons[nodeType] || '⚙';
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    [NODE_STATUS.PENDING]: '等待',
    [NODE_STATUS.RUNNING]: '执行中',
    [NODE_STATUS.COMPLETED]: '完成',
    [NODE_STATUS.FAILED]: '失败',
    [NODE_STATUS.SKIPPED]: '跳过'
  };
  return statusMap[status] || '未知';
}

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
        zIndex: workflowStore.draggingNodeId === props.node.id ? 20 : 5,
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
/* 节点基础样式 */
.workflow-node {
  position: absolute;
  border-radius: 8px;
  background-color: #fff;
  border: 2px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: all 0.2s ease;
  will-change: transform;
  min-height: 60px;
  padding: 8px;
}

.workflow-node:active {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: grabbing;
}

.node-icon {
  font-size: 20px;
  margin-bottom: 4px;
  line-height: 1;
}

.node-label {
  padding: 0 8px;
  user-select: none;
  white-space: nowrap;
  font-weight: bold;
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
}

.node-status {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  margin-top: 4px;
  text-align: center;
}

/* 节点类型样式 */
.start { 
  background: linear-gradient(135deg, #e6ffed, #f0fff4); 
  border-color: #52c41a; 
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
}

.end { 
  background: linear-gradient(135deg, #fff2e8, #fff7e6); 
  border-color: #fa8c16; 
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
}

.task { 
  background: linear-gradient(135deg, #f0f5ff, #e6f7ff); 
  border-color: #1890ff; 
}

.branch { 
  background: linear-gradient(135deg, #f6ffed, #f0f9ff); 
  border-color: #52c41a; 
  border-radius: 20px;
}

.loop { 
  background: linear-gradient(135deg, #fff7e6, #fffbe6); 
  border-color: #faad14; 
  border-radius: 20px;
}

.parallel { 
  background: linear-gradient(135deg, #f9f0ff, #f0f0ff); 
  border-color: #722ed1; 
  border-radius: 20px;
}

.merge { 
  background: linear-gradient(135deg, #e6fffb, #f0fffe); 
  border-color: #13c2c2; 
  border-radius: 20px;
}

.timer { 
  background: linear-gradient(135deg, #fff1f0, #fff2f0); 
  border-color: #f5222d; 
  border-radius: 20px;
}

.condition { 
  background: linear-gradient(135deg, #f0f9ff, #e6f7ff); 
  border-color: #1890ff; 
  border-radius: 20px;
}

.subprocess { 
  background: linear-gradient(135deg, #f6ffed, #f0f9ff); 
  border-color: #52c41a; 
  border-radius: 20px;
}

/* 状态样式 */
.node-status.pending { background: #fff3cd; color: #856404; }
.node-status.running { background: #d4edda; color: #155724; }
.node-status.completed { background: #d1ecf1; color: #0c5460; }
.node-status.failed { background: #f8d7da; color: #721c24; }
.node-status.skipped { background: #e2e3e5; color: #6c757d; }

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