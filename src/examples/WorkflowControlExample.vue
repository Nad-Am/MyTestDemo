<template>
  <div class="workflow-control-example">
    <h3>工作流运行状态控制示例</h3>
    
    <!-- 状态显示 -->
    <div class="status-panel">
      <div class="status-item">
        <strong>工作流状态:</strong> 
        <span :class="['status-badge', workflowStatus]">{{ workflowStatusText }}</span>
      </div>
      <div class="status-item">
        <strong>执行进度:</strong> 
        <span>{{ executionProgress.toFixed(1) }}%</span>
      </div>
      <div class="status-item">
        <strong>执行时间:</strong> 
        <span>{{ formatTime(executionTime) }}</span>
      </div>
      <div class="status-item" v-if="currentNodeId">
        <strong>当前节点:</strong> 
        <span>{{ currentNodeId }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="control-buttons">
      <button 
        @click="startWorkflow" 
        :disabled="!canStartWorkflow"
        class="btn btn-start"
      >
        开始执行
      </button>
      
      <button 
        @click="pauseWorkflow" 
        :disabled="!canPauseWorkflow"
        class="btn btn-pause"
      >
        暂停
      </button>
      
      <button 
        @click="resumeWorkflow" 
        :disabled="!canResumeWorkflow"
        class="btn btn-resume"
      >
        恢复
      </button>
      
      <button 
        @click="stopWorkflow" 
        :disabled="!canStopWorkflow"
        class="btn btn-stop"
      >
        停止
      </button>
      
      <button 
        @click="resetWorkflow" 
        :disabled="!canResetWorkflow"
        class="btn btn-reset"
      >
        重置
      </button>
    </div>

    <!-- 节点状态列表 -->
    <div class="nodes-status">
      <h4>节点状态</h4>
      <div class="node-list">
        <div 
          v-for="node in visibleNodesArray" 
          :key="node.id"
          :class="['node-item', node.status]"
        >
          <span class="node-id">{{ node.id }}</span>
          <span class="node-label">{{ node.label }}</span>
          <span :class="['node-status', node.status]">{{ getStatusText(node.status) }}</span>
        </div>
      </div>
    </div>

    <!-- 执行历史 -->
    <div class="execution-history" v-if="executionHistory.length > 0">
      <h4>执行历史</h4>
      <div class="history-list">
        <div 
          v-for="(record, index) in executionHistory.slice(-10)" 
          :key="index"
          class="history-item"
        >
          <span class="timestamp">{{ formatTimestamp(record.timestamp) }}</span>
          <span class="node-id">{{ record.nodeId }}</span>
          <span class="status-change">
            {{ getStatusText(record.oldStatus) }} → {{ getStatusText(record.newStatus) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useWorkflowStore, WORKFLOW_STATUS, NODE_STATUS } from '../store/selfDes.js'

export default {
  name: 'WorkflowControlExample',
  setup() {
    const workflowStore = useWorkflowStore()

    return {
      // 状态
      workflowStatus: workflowStore.workflowStatus,
      currentNodeId: workflowStore.currentNodeId,
      executionHistory: workflowStore.executionHistory,
      visibleNodesArray: workflowStore.visibleNodesArray,
      
      // 计算属性
      isWorkflowRunning: workflowStore.isWorkflowRunning,
      isWorkflowPaused: workflowStore.isWorkflowPaused,
      isWorkflowCompleted: workflowStore.isWorkflowCompleted,
      isWorkflowFailed: workflowStore.isWorkflowFailed,
      canStartWorkflow: workflowStore.canStartWorkflow,
      canPauseWorkflow: workflowStore.canPauseWorkflow,
      canStopWorkflow: workflowStore.canStopWorkflow,
      canResetWorkflow: workflowStore.canResetWorkflow,
      executionProgress: workflowStore.executionProgress,
      executionTime: workflowStore.executionTime,
      
      // 方法
      startWorkflow: workflowStore.startWorkflow,
      pauseWorkflow: workflowStore.pauseWorkflow,
      resumeWorkflow: workflowStore.resumeWorkflow,
      stopWorkflow: workflowStore.stopWorkflow,
      resetWorkflow: workflowStore.resetWorkflow,
      
      // 常量
      WORKFLOW_STATUS,
      NODE_STATUS
    }
  },
  computed: {
    workflowStatusText() {
      const statusMap = {
        [WORKFLOW_STATUS.IDLE]: '空闲',
        [WORKFLOW_STATUS.RUNNING]: '运行中',
        [WORKFLOW_STATUS.PAUSED]: '已暂停',
        [WORKFLOW_STATUS.COMPLETED]: '已完成',
        [WORKFLOW_STATUS.FAILED]: '执行失败'
      }
      return statusMap[this.workflowStatus] || '未知'
    },
    canResumeWorkflow() {
      return this.workflowStatus === WORKFLOW_STATUS.PAUSED
    }
  },
  methods: {
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
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    }
  }
}
</script>

<style scoped>
.workflow-control-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.status-panel {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.idle { background: #e0e0e0; color: #666; }
.status-badge.running { background: #4caf50; color: white; }
.status-badge.paused { background: #ff9800; color: white; }
.status-badge.completed { background: #2196f3; color: white; }
.status-badge.failed { background: #f44336; color: white; }

.control-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start { background: #4caf50; color: white; }
.btn-pause { background: #ff9800; color: white; }
.btn-resume { background: #2196f3; color: white; }
.btn-stop { background: #f44336; color: white; }
.btn-reset { background: #9e9e9e; color: white; }

.btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.nodes-status, .execution-history {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.node-list, .history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-item, .history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 4px;
  background: #f9f9f9;
}

.node-item.pending { border-left: 4px solid #ffc107; }
.node-item.running { border-left: 4px solid #4caf50; }
.node-item.completed { border-left: 4px solid #2196f3; }
.node-item.failed { border-left: 4px solid #f44336; }

.node-id {
  font-family: monospace;
  font-weight: bold;
  min-width: 80px;
}

.node-label {
  flex: 1;
}

.node-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.node-status.pending { background: #fff3cd; color: #856404; }
.node-status.running { background: #d4edda; color: #155724; }
.node-status.completed { background: #d1ecf1; color: #0c5460; }
.node-status.failed { background: #f8d7da; color: #721c24; }

.timestamp {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  min-width: 80px;
}

.status-change {
  font-size: 12px;
  color: #666;
}
</style>
