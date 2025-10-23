# 工作流运行状态管理

## 概述

为工作流系统添加了完整的运行状态转换功能，包括工作流级别的状态管理和节点级别的状态跟踪。

## 功能特性

### 1. 工作流状态 (WORKFLOW_STATUS)

- **IDLE**: 空闲状态 - 工作流未开始执行
- **RUNNING**: 运行中 - 工作流正在执行节点
- **PAUSED**: 暂停 - 工作流被暂停，可以恢复
- **COMPLETED**: 完成 - 所有节点执行完成
- **FAILED**: 失败 - 工作流执行过程中出现错误

### 2. 节点状态 (NODE_STATUS)

- **PENDING**: 等待执行 - 节点等待被调度执行
- **RUNNING**: 执行中 - 节点正在执行
- **COMPLETED**: 执行完成 - 节点成功执行完成
- **FAILED**: 执行失败 - 节点执行过程中出现错误
- **SKIPPED**: 跳过执行 - 节点被跳过（预留状态）

## 主要方法

### 工作流控制

```javascript
// 开始执行工作流
await workflowStore.startWorkflow()

// 暂停工作流
workflowStore.pauseWorkflow()

// 恢复工作流
workflowStore.resumeWorkflow()

// 停止工作流
workflowStore.stopWorkflow()

// 重置工作流
workflowStore.resetWorkflow()
```

### 节点状态管理

```javascript
// 设置节点状态
workflowStore.setNodeStatus(nodeId, NODE_STATUS.RUNNING)

// 重置所有节点状态
workflowStore.resetAllNodeStatus()
```

## 计算属性

### 工作流状态检查

```javascript
// 检查工作流是否正在运行
workflowStore.isWorkflowRunning

// 检查工作流是否已暂停
workflowStore.isWorkflowPaused

// 检查工作流是否已完成
workflowStore.isWorkflowCompleted

// 检查工作流是否失败
workflowStore.isWorkflowFailed
```

### 控制权限检查

```javascript
// 是否可以开始工作流
workflowStore.canStartWorkflow

// 是否可以暂停工作流
workflowStore.canPauseWorkflow

// 是否可以停止工作流
workflowStore.canStopWorkflow

// 是否可以重置工作流
workflowStore.canResetWorkflow
```

### 执行信息

```javascript
// 获取执行进度 (0-100)
workflowStore.executionProgress

// 获取执行时间 (秒)
workflowStore.executionTime

// 获取下一个可执行的节点
workflowStore.nextExecutableNode
```

## 状态转换规则

### 工作流状态转换

```
IDLE → RUNNING (startWorkflow)
RUNNING → PAUSED (pauseWorkflow)
PAUSED → RUNNING (resumeWorkflow)
RUNNING → IDLE (stopWorkflow)
PAUSED → IDLE (stopWorkflow)
RUNNING → COMPLETED (所有节点完成)
RUNNING → FAILED (节点执行失败)
任何状态 → IDLE (resetWorkflow)
```

### 节点状态转换

```
PENDING → RUNNING (开始执行节点)
RUNNING → COMPLETED (节点执行成功)
RUNNING → FAILED (节点执行失败)
任何状态 → PENDING (resetWorkflow)
```

## 使用示例

```vue
<template>
  <div>
    <!-- 状态显示 -->
    <div>工作流状态: {{ workflowStatusText }}</div>
    <div>执行进度: {{ executionProgress }}%</div>
    <div>执行时间: {{ formatTime(executionTime) }}</div>
    
    <!-- 控制按钮 -->
    <button @click="startWorkflow" :disabled="!canStartWorkflow">
      开始执行
    </button>
    <button @click="pauseWorkflow" :disabled="!canPauseWorkflow">
      暂停
    </button>
    <button @click="resumeWorkflow" :disabled="!canResumeWorkflow">
      恢复
    </button>
    <button @click="stopWorkflow" :disabled="!canStopWorkflow">
      停止
    </button>
    <button @click="resetWorkflow" :disabled="!canResetWorkflow">
      重置
    </button>
    
    <!-- 节点状态列表 -->
    <div v-for="node in visibleNodesArray" :key="node.id">
      {{ node.label }}: {{ node.status }}
    </div>
  </div>
</template>

<script>
import { useWorkflowStore, WORKFLOW_STATUS, NODE_STATUS } from './store/selfDes.js'

export default {
  setup() {
    const workflowStore = useWorkflowStore()
    
    return {
      // 状态
      workflowStatus: workflowStore.workflowStatus,
      visibleNodesArray: workflowStore.visibleNodesArray,
      
      // 计算属性
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
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
  }
}
</script>
```

## 执行历史

系统会自动记录所有节点状态变更的历史，包括：

- 节点ID
- 旧状态
- 新状态
- 时间戳

可以通过 `workflowStore.executionHistory` 访问执行历史记录。

## 注意事项

1. 工作流执行是异步的，使用 `setTimeout` 模拟节点执行时间
2. 节点执行有90%的成功率，10%的失败率（用于测试）
3. 执行时间随机分布在1-3秒之间
4. 新插入的节点默认为 `PENDING` 状态
5. 所有状态变更都会记录到执行历史中

## 扩展性

- 可以轻松替换 `simulateNodeExecution` 方法为实际的业务逻辑
- 支持添加更多节点状态类型
- 支持添加工作流级别的配置和参数
- 支持添加节点执行的前置和后置钩子
