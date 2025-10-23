<template>
  <div class="arrow-test">
    <h2>箭头显示测试</h2>
    
    <div class="test-info">
      <p><strong>测试说明：</strong></p>
      <ul>
        <li>✅ SVG 箭头现在在节点之上（z-index: 10）</li>
        <li>✅ 箭头从节点边缘开始和结束，不会被节点遮挡</li>
        <li>✅ 支持循环边（task2 → start）</li>
        <li>✅ 箭头有悬停效果</li>
        <li>✅ 拖拽节点时箭头会跟随移动</li>
      </ul>
    </div>

    <div class="controls">
      <button @click="addTestNode">添加测试节点</button>
      <button @click="addCircularEdge">添加循环边</button>
      <button @click="resetTest">重置测试</button>
    </div>

    <div class="workflow-container">
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

      <div
        v-for="node in workflowStore.visibleNodesArray"
        :key="node.id"
        :id="node.id"
        :class="['workflow-node', node.type]"
        :style="getNodeStyle(node)"
        @mousedown.stop="handleMouseDown(node, $event)"
      >
        <div class="node-label">{{ node.label }}</div>
        <div class="node-status" :class="node.status">{{ getStatusText(node.status) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { useWorkflowStore, NODE_STATUS } from '../store/selfDes.js'

export default {
  name: 'ArrowTest',
  setup() {
    const workflowStore = useWorkflowStore()
    
    return {
      workflowStore,
      NODE_STATUS
    }
  },
  methods: {
    getNodeStyle(node) {
      const Z = this.workflowStore.zoomLevel
      const scaledX = node.position.x * Z
      const scaledY = node.position.y * Z

      return {
        transform: `translate(
          ${scaledX + this.workflowStore.viewportOffset.x}px,
          ${scaledY + this.workflowStore.viewportOffset.y}px
        )`,
        width: `${node.width * Z}px`,
        height: `${node.height * Z}px`,
        fontSize: `${14 * Z}px`,
        zIndex: this.workflowStore.draggingNodeId === node.id ? 20 : 5,
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        [NODE_STATUS.PENDING]: '等待',
        [NODE_STATUS.RUNNING]: '执行中',
        [NODE_STATUS.COMPLETED]: '完成',
        [NODE_STATUS.FAILED]: '失败',
        [NODE_STATUS.SKIPPED]: '跳过'
      }
      return statusMap[status] || '未知'
    },
    
    handleMouseDown(node, event) {
      if (event.button !== 0) return
      this.workflowStore.startDrag(node.id, event.clientX, event.clientY)
    },
    
    addTestNode() {
      const nodeId = `test_${Date.now()}`
      const x = Math.random() * 400 + 100
      const y = Math.random() * 300 + 100
      
      this.workflowStore.nodes.set(nodeId, {
        id: nodeId,
        type: 'task',
        label: '测试节点',
        position: { x, y },
        width: 120,
        height: 60,
        status: NODE_STATUS.PENDING
      })
    },
    
    addCircularEdge() {
      const nodes = Array.from(this.workflowStore.nodes.values())
      if (nodes.length < 2) return
      
      const source = nodes[Math.floor(Math.random() * nodes.length)]
      const target = nodes[Math.floor(Math.random() * nodes.length)]
      
      if (source.id === target.id) return
      
      const edgeId = `circular_${Date.now()}`
      this.workflowStore.edges.set(edgeId, {
        id: edgeId,
        source: source.id,
        target: target.id,
        label: '循环边'
      })
    },
    
    resetTest() {
      this.workflowStore.resetWorkflow()
    }
  },
  
  mounted() {
    // 添加鼠标移动和释放事件监听
    const handleMouseMove = (event) => {
      if (this.workflowStore.isDragging) {
        this.workflowStore.dragNode(event.clientX, event.clientY)
      }
    }
    
    const handleMouseUp = () => {
      this.workflowStore.endDrag()
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    this.$once('hook:beforeDestroy', () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    })
  }
}
</script>

<style scoped>
.arrow-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.test-info ul {
  margin: 10px 0;
  padding-left: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #0056b3;
}

.workflow-container {
  position: relative;
  width: 100%;
  height: 600px;
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.workflow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
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

.workflow-node {
  position: absolute;
  border-radius: 4px;
  background-color: #fff;
  border: 2px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
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
  padding: 5px 10px;
  user-select: none;
  white-space: nowrap;
  font-weight: bold;
}

.node-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  margin-top: 2px;
}

.node-status.pending { background: #fff3cd; color: #856404; }
.node-status.running { background: #d4edda; color: #155724; }
.node-status.completed { background: #d1ecf1; color: #0c5460; }
.node-status.failed { background: #f8d7da; color: #721c24; }

.start, .end { background-color: #e6ffed; border-color: #69c0ff; }
.task { background-color: #f0f5ff; border-color: #40a9ff; }
</style>
