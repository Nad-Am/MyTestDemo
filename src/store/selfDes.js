// store.js

import { defineStore } from "pinia";
import { initialEdges, initialNodes } from "../script/init";

// --- ⚙️ 核心常量定义 ---
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const SPACING = 60; // 节点之间的垂直间距
const VIEWPORT_WIDTH = 1000; // 视口宽度 (用于裁剪)
const VIEWPORT_HEIGHT = 600; // 视口高度 (用于裁剪)
const MIN_ZOOM = 0.5; // 最小缩放比例 50%
const MAX_ZOOM = 2.0; // 最大缩放比例 200%
const ZOOM_STEP = 0.1; // 每次缩放的步长

// --- 🚀 运行状态定义 ---
const WORKFLOW_STATUS = {
  IDLE: "idle", // 空闲状态
  RUNNING: "running", // 运行中
  PAUSED: "paused", // 暂停
  COMPLETED: "completed", // 完成
  FAILED: "failed", // 失败
};

const NODE_STATUS = {
  PENDING: "pending", // 等待执行
  RUNNING: "running", // 执行中
  COMPLETED: "completed", // 执行完成
  FAILED: "failed", // 执行失败
  SKIPPED: "skipped", // 跳过执行
};

// --- 🔀 节点类型定义 ---
const NODE_TYPES = {
  START: "start", // 开始节点
  END: "end", // 结束节点
  TASK: "task", // 任务节点
  BRANCH: "branch", // 分支节点（条件判断）
  LOOP: "loop", // 循环节点
  PARALLEL: "parallel", // 并行节点
  MERGE: "merge", // 合并节点
  TIMER: "timer", // 定时器节点
  CONDITION: "condition", // 条件节点
  SUBPROCESS: "subprocess", // 子流程节点
};

// 初始数据
// const initialNodes = new Map([
//     ['start', { id: 'start', type: 'start', label: '开始', position: { x: 450, y: 50 }, width: NODE_WIDTH, height: NODE_HEIGHT }],
//     ['task1', { id: 'task1', type: 'task', label: '数据准备', position: { x: 450, y: 170 }, width: NODE_WIDTH, height: NODE_HEIGHT }],
//     ['task2', { id: 'task2', type: 'task', label: '模型训练', position: { x: 450, y: 290 }, width: NODE_WIDTH, height: NODE_HEIGHT }],
//     ['end', { id: 'end', type: 'end', label: '结束', position: { x: 450, y: 410 }, width: NODE_WIDTH, height: NODE_HEIGHT }],
// ]);

// const initialEdges = new Map([
//     ['e1', { id: 'e1', source: 'start', target: 'task1', label: '启动' }],
//     ['e2', { id: 'e2', source: 'task1', target: 'task2', label: '完成' }],
//     ['e3', { id: 'e3', source: 'task2', target: 'end', label: '完成' }],
// ]);

export const useWorkflowStore = defineStore("workflow", {
  state: () => ({
    nodes: initialNodes,
    edges: initialEdges,

    // 视图状态
    viewportOffset: { x: 0, y: 0 }, // 全局平移偏移量
    zoomLevel: 1.0, // 全局缩放级别

    // 交互状态
    isDragging: false,
    draggingNodeId: null,
    dragStart: { x: 0, y: 0 },

    // 运行状态
    workflowStatus: WORKFLOW_STATUS.IDLE, // 工作流整体状态
    currentNodeId: null, // 当前正在执行的节点ID
    executionHistory: [], // 执行历史记录
    startTime: null, // 开始执行时间
    endTime: null, // 结束执行时间
  }),

  getters: {
    // --- 拓扑结构计算：用于布局 ---
    nodeLevels(state) {
      const levels = new Map();
      const queue = ["start"];
      levels.set("start", 0);
      let head = 0;

      while (head < queue.length) {
        const nodeId = queue[head++];
        const currentLevel = levels.get(nodeId);

        for (const edge of state.edges.values()) {
          if (edge.source === nodeId) {
            const targetId = edge.target;
            const targetLevel = currentLevel + 1;

            if (!levels.has(targetId) || targetLevel < levels.get(targetId)) {
              levels.set(targetId, targetLevel);
              if (!queue.includes(targetId)) {
                queue.push(targetId);
              }
            }
          }
        }
      }
      return levels;
    },

    // --- 视口裁剪 (Culling) ---
    visibleEdgesArray(state) {
      const Z = state.zoomLevel;
      return Array.from(state.edges.values()).filter((edge) => {
        const sourceNode = state.nodes.get(edge.source);
        const targetNode = state.nodes.get(edge.target);
        if (!sourceNode || !targetNode) return false;

        const getCenter = (node) => {
          const w = node.width ?? NODE_WIDTH;
          const h = node.height ?? NODE_HEIGHT;
          return {
            x: (node.position.x + w / 2) * Z + state.viewportOffset.x,
            y: (node.position.y + h / 2) * Z + state.viewportOffset.y,
          };
        };

        const source = getCenter(sourceNode);
        const target = getCenter(targetNode);
        const W = VIEWPORT_WIDTH;
        const H = VIEWPORT_HEIGHT;

        // 简单的快速拒绝：如果两个点都在视口外侧的同一边，则不可见。
        const checkQuickReject = (x1, y1, x2, y2, W, H) => {
          if ((x1 < 0 && x2 < 0) || (x1 > W && x2 > W)) return true;
          if ((y1 < 0 && y2 < 0) || (y1 > H && y2 > H)) return true;
          return false;
        };

        return !checkQuickReject(source.x, source.y, target.x, target.y, W, H);
      });
    },

    visibleNodesArray(state) {
      const renderableNodeIds = new Set();
      const Z = state.zoomLevel;
      console.log("v trigger");
      // 1. 添加所有自身位于视口内的节点
      const selfVisibleNodes = Array.from(state.nodes.values()).filter(
        (node) => {
          const nodeW = (node.width ?? NODE_WIDTH) * Z;
          const nodeH = (node.height ?? NODE_HEIGHT) * Z;

          // 节点渲染坐标 = 缩放后的原始位置 + 全局偏移
          const renderedX = node.position.x * Z + state.viewportOffset.x;
          const renderedY = node.position.y * Z + state.viewportOffset.y;

          // 检查是否在视口内
          const isVisibleX =
            renderedX + nodeW > 0 && renderedX < VIEWPORT_WIDTH;
          const isVisibleY =
            renderedY + nodeH > 0 && renderedY < VIEWPORT_HEIGHT;

          return isVisibleX && isVisibleY;
        }
      );

      selfVisibleNodes.forEach((node) => renderableNodeIds.add(node.id));

      // 2. 添加所有连接到可见边的节点
      this.visibleEdgesArray.forEach((edge) => {
        renderableNodeIds.add(edge.source);
        renderableNodeIds.add(edge.target);
      });

      return Array.from(renderableNodeIds)
        .map((id) => state.nodes.get(id))
        .filter((node) => node);
    },

    // --- 连线路径计算 ---
    getEdgePath: (state) => (edgeId) => {
      const edge = state.edges.get(edgeId);
      if (!edge) return "";

      const sourceNode = state.nodes.get(edge.source);
      const targetNode = state.nodes.get(edge.target);
      if (!sourceNode || !targetNode) return "";

      const Z = state.zoomLevel;

      const getNodeBounds = (node) => {
        const w = (node.width ?? NODE_WIDTH) * Z;
        const h = (node.height ?? NODE_HEIGHT) * Z;
        const x = node.position.x * Z + state.viewportOffset.x;
        const y = node.position.y * Z + state.viewportOffset.y;
        return { x, y, w, h };
      };

      const sourceBounds = getNodeBounds(sourceNode);
      const targetBounds = getNodeBounds(targetNode);

      // 计算源节点和目标节点的中心点
      const sourceCenter = {
        x: sourceBounds.x + sourceBounds.w / 2,
        y: sourceBounds.y + sourceBounds.h / 2,
      };
      const targetCenter = {
        x: targetBounds.x + targetBounds.w / 2,
        y: targetBounds.y + targetBounds.h / 2,
      };

      // 计算从源节点中心到目标节点中心的方向向量
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return ""; // 避免除零错误

      const unitX = dx / distance;
      const unitY = dy / distance;

      // 计算源节点边缘的交点（箭头起始点）
      const sourceEdgeX = sourceCenter.x + unitX * (sourceBounds.w / 2);
      const sourceEdgeY = sourceCenter.y + unitY * (sourceBounds.h / 2);

      // 计算目标节点边缘的交点（箭头结束点）
      const targetEdgeX = targetCenter.x - unitX * (targetBounds.w / 2);
      const targetEdgeY = targetCenter.y - unitY * (targetBounds.h / 2);

      return `M ${sourceEdgeX} ${sourceEdgeY} L ${targetEdgeX} ${targetEdgeY}`;
    },

    getEdgeLabelPosition: (state) => (edgeId) => {
      const edge = state.edges.get(edgeId);
      if (!edge) return { x: 0, y: 0 };

      const sourceNode = state.nodes.get(edge.source);
      const targetNode = state.nodes.get(edge.target);
      if (!sourceNode || !targetNode) return { x: 0, y: 0 };

      const Z = state.zoomLevel;

      const getNodeBounds = (node) => {
        const w = (node.width ?? NODE_WIDTH) * Z;
        const h = (node.height ?? NODE_HEIGHT) * Z;
        const x = node.position.x * Z + state.viewportOffset.x;
        const y = node.position.y * Z + state.viewportOffset.y;
        return { x, y, w, h };
      };

      const sourceBounds = getNodeBounds(sourceNode);
      const targetBounds = getNodeBounds(targetNode);

      // 计算源节点和目标节点的中心点
      const sourceCenter = {
        x: sourceBounds.x + sourceBounds.w / 2,
        y: sourceBounds.y + sourceBounds.h / 2,
      };
      const targetCenter = {
        x: targetBounds.x + targetBounds.w / 2,
        y: targetBounds.y + targetBounds.h / 2,
      };

      // 计算从源节点中心到目标节点中心的方向向量
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return { x: 0, y: 0 }; // 避免除零错误

      const unitX = dx / distance;
      const unitY = dy / distance;

      // 计算源节点边缘的交点（箭头起始点）
      const sourceEdgeX = sourceCenter.x + unitX * (sourceBounds.w / 2);
      const sourceEdgeY = sourceCenter.y + unitY * (sourceBounds.h / 2);

      // 计算目标节点边缘的交点（箭头结束点）
      const targetEdgeX = targetCenter.x - unitX * (targetBounds.w / 2);
      const targetEdgeY = targetCenter.y - unitY * (targetBounds.h / 2);

      // 标签位置在箭头路径的中点
      const midX = (sourceEdgeX + targetEdgeX) / 2;
      const midY = (sourceEdgeY + targetEdgeY) / 2;

      return { x: midX, y: midY };
    },

    // --- 运行状态相关计算属性 ---
    isWorkflowRunning(state) {
      return state.workflowStatus === WORKFLOW_STATUS.RUNNING;
    },

    isWorkflowPaused(state) {
      return state.workflowStatus === WORKFLOW_STATUS.PAUSED;
    },

    isWorkflowCompleted(state) {
      return state.workflowStatus === WORKFLOW_STATUS.COMPLETED;
    },

    isWorkflowFailed(state) {
      return state.workflowStatus === WORKFLOW_STATUS.FAILED;
    },

    canStartWorkflow(state) {
      return (
        state.workflowStatus === WORKFLOW_STATUS.IDLE ||
        state.workflowStatus === WORKFLOW_STATUS.PAUSED
      );
    },

    canPauseWorkflow(state) {
      return state.workflowStatus === WORKFLOW_STATUS.RUNNING;
    },

    canStopWorkflow(state) {
      return (
        state.workflowStatus === WORKFLOW_STATUS.RUNNING ||
        state.workflowStatus === WORKFLOW_STATUS.PAUSED
      );
    },

    canResetWorkflow(state) {
      return state.workflowStatus !== WORKFLOW_STATUS.IDLE;
    },

    // 获取当前执行进度
    executionProgress(state) {
      const totalNodes = Array.from(state.nodes.values()).filter(
        (node) => node.type === "task" || node.type === "end"
      ).length;

      const completedNodes = Array.from(state.nodes.values()).filter(
        (node) => node.status === NODE_STATUS.COMPLETED
      ).length;

      return totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
    },

    // 获取执行时间
    executionTime(state) {
      if (!state.startTime) return 0;
      const endTime = state.endTime || Date.now();
      return Math.floor((endTime - state.startTime) / 1000);
    },

    // 获取下一个可执行的节点
    nextExecutableNode(state) {
      if (state.workflowStatus !== WORKFLOW_STATUS.RUNNING) return null;

      // 找到所有待执行的节点
      const pendingNodes = Array.from(state.nodes.values()).filter(
        (node) => node.status === NODE_STATUS.PENDING
      );

      if (pendingNodes.length === 0) return null;

      // 按层级排序，优先执行层级较小的节点
      const levels = this.nodeLevels;
      return pendingNodes.sort((a, b) => {
        const levelA = levels.get(a.id) || 0;
        const levelB = levels.get(b.id) || 0;
        return levelA - levelB;
      })[0];
    },
  },

  actions: {
    // --- 视图操作 ---
    setViewportOffset(newOffset) {
      this.viewportOffset.x = newOffset.x;
      this.viewportOffset.y = newOffset.y;
    },

    zoomViewport(delta) {
      const newZoom = this.zoomLevel + delta * ZOOM_STEP;
      this.zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    },

    // --- 节点拖拽操作 ---
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

      // 1. 计算鼠标在屏幕上的实际位移
      const screenDeltaX = newX - this.dragStart.x;
      const screenDeltaY = newY - this.dragStart.y;

      // 2. ❗ 核心修正：将屏幕位移转换为画布逻辑位移 (除以 Z)
      const canvasDeltaX = screenDeltaX / Z;
      const canvasDeltaY = screenDeltaY / Z;

      // 3. 更新节点在画布上的逻辑位置
      node.position.x += canvasDeltaX;
      node.position.y += canvasDeltaY;

      // 4. 更新起始点
      this.dragStart.x = newX;
      this.dragStart.y = newY;
    },

    endDrag() {
      this.isDragging = false;
      this.draggingNodeId = null;
    },

    // --- 运行状态控制 ---
    async startWorkflow() {
      if (!this.canStartWorkflow) {
        console.warn("工作流无法启动，当前状态:", this.workflowStatus);
        return false;
      }

      try {
        // 重置所有节点状态
        this.resetAllNodeStatus();

        // 设置开始节点为待执行状态
        const startNode = Array.from(this.nodes.values()).find(
          (node) => node.type === "start"
        );
        if (startNode) {
          startNode.status = NODE_STATUS.PENDING;
        }

        // 更新工作流状态
        this.workflowStatus = WORKFLOW_STATUS.RUNNING;
        this.startTime = Date.now();
        this.endTime = null;
        this.currentNodeId = null;
        this.executionHistory = [];

        console.log("工作流开始执行");

        // 开始执行第一个节点
        await this.executeNextNode();

        return true;
      } catch (error) {
        console.error("启动工作流失败:", error);
        this.workflowStatus = WORKFLOW_STATUS.FAILED;
        return false;
      }
    },

    pauseWorkflow() {
      if (!this.canPauseWorkflow) {
        console.warn("工作流无法暂停，当前状态:", this.workflowStatus);
        return false;
      }

      this.workflowStatus = WORKFLOW_STATUS.PAUSED;
      console.log("工作流已暂停");
      return true;
    },

    resumeWorkflow() {
      if (this.workflowStatus !== WORKFLOW_STATUS.PAUSED) {
        console.warn("工作流无法恢复，当前状态:", this.workflowStatus);
        return false;
      }

      this.workflowStatus = WORKFLOW_STATUS.RUNNING;
      console.log("工作流已恢复");

      // 继续执行下一个节点
      this.executeNextNode();
      return true;
    },

    stopWorkflow() {
      if (!this.canStopWorkflow) {
        console.warn("工作流无法停止，当前状态:", this.workflowStatus);
        return false;
      }

      this.workflowStatus = WORKFLOW_STATUS.IDLE;
      this.currentNodeId = null;
      this.endTime = Date.now();

      // 将当前运行的节点标记为失败
      if (this.currentNodeId) {
        const currentNode = this.nodes.get(this.currentNodeId);
        if (currentNode) {
          currentNode.status = NODE_STATUS.FAILED;
        }
      }

      console.log("工作流已停止");
      return true;
    },

    resetWorkflow() {
      if (!this.canResetWorkflow) {
        console.warn("工作流无法重置，当前状态:", this.workflowStatus);
        return false;
      }

      // 重置所有状态
      this.workflowStatus = WORKFLOW_STATUS.IDLE;
      this.currentNodeId = null;
      this.startTime = null;
      this.endTime = null;
      this.executionHistory = [];

      // 重置所有节点状态
      this.resetAllNodeStatus();

      console.log("工作流已重置");
      return true;
    },

    // --- 节点状态管理 ---
    resetAllNodeStatus() {
      for (const node of this.nodes.values()) {
        if (node.type === "start") {
          node.status = NODE_STATUS.PENDING;
        } else if (node.type === "end") {
          node.status = NODE_STATUS.PENDING;
        } else {
          node.status = NODE_STATUS.PENDING;
        }
      }
    },

    setNodeStatus(nodeId, status) {
      const node = this.nodes.get(nodeId);
      if (!node) {
        console.warn("节点不存在:", nodeId);
        return false;
      }

      const oldStatus = node.status;
      node.status = status;

      // 记录状态变更历史
      this.executionHistory.push({
        nodeId,
        oldStatus,
        newStatus: status,
        timestamp: Date.now(),
      });

      console.log(`节点 ${nodeId} 状态变更: ${oldStatus} -> ${status}`);
      return true;
    },

    // --- 执行逻辑 ---
    async executeNextNode() {
      if (this.workflowStatus !== WORKFLOW_STATUS.RUNNING) {
        return;
      }

      const nextNode = this.nextExecutableNode;
      if (!nextNode) {
        // 没有更多可执行的节点，检查是否完成
        this.checkWorkflowCompletion();
        return;
      }

      try {
        // 设置当前节点为运行中
        this.currentNodeId = nextNode.id;
        this.setNodeStatus(nextNode.id, NODE_STATUS.RUNNING);

        console.log(`开始执行节点: ${nextNode.id} (${nextNode.label})`);

        // 根据节点类型执行不同的逻辑
        await this.executeNodeByType(nextNode);

        // 节点执行完成
        this.setNodeStatus(nextNode.id, NODE_STATUS.COMPLETED);
        this.currentNodeId = null;

        // 继续执行下一个节点
        setTimeout(() => {
          this.executeNextNode();
        }, 500); // 添加小延迟以便观察状态变化
      } catch (error) {
        console.error(`节点执行失败: ${nextNode.id}`, error);
        this.setNodeStatus(nextNode.id, NODE_STATUS.FAILED);
        this.workflowStatus = WORKFLOW_STATUS.FAILED;
        this.currentNodeId = null;
      }
    },

    // 根据节点类型执行不同的逻辑
    async executeNodeByType(node) {
      switch (node.type) {
        case NODE_TYPES.START:
          await this.executeStartNode(node);
          break;
        case NODE_TYPES.END:
          await this.executeEndNode(node);
          break;
        case NODE_TYPES.TASK:
          await this.executeTaskNode(node);
          break;
        case NODE_TYPES.BRANCH:
          await this.executeBranchNode(node);
          break;
        case NODE_TYPES.LOOP:
          await this.executeLoopNode(node);
          break;
        case NODE_TYPES.TIMER:
          await this.executeTimerNode(node);
          break;
        case NODE_TYPES.MERGE:
          await this.executeMergeNode(node);
          break;
        case NODE_TYPES.PARALLEL:
          await this.executeParallelNode(node);
          break;
        case NODE_TYPES.CONDITION:
          await this.executeConditionNode(node);
          break;
        case NODE_TYPES.SUBPROCESS:
          await this.executeSubprocessNode(node);
          break;
        default:
          await this.simulateNodeExecution(node);
      }
    },

    // 开始节点执行
    async executeStartNode(node) {
      console.log(`执行开始节点: ${node.label}`);
      await this.simulateNodeExecution(node);
    },

    // 结束节点执行
    async executeEndNode(node) {
      console.log(`执行结束节点: ${node.label}`);
      await this.simulateNodeExecution(node);
      this.workflowStatus = WORKFLOW_STATUS.COMPLETED;
      this.endTime = Date.now();
    },

    // 任务节点执行
    async executeTaskNode(node) {
      console.log(`执行任务节点: ${node.label}`);
      await this.simulateNodeExecution(node);
    },

    // 分支节点执行
    async executeBranchNode(node) {
      console.log(`执行分支节点: ${node.label}`);

      // 模拟条件判断
      const condition = node.condition || "Math.random() > 0.5";
      const result = this.evaluateCondition(condition);

      console.log(`分支条件 "${condition}" 结果为: ${result}`);

      // 根据条件结果决定下一步
      if (result) {
        console.log(`条件为真，执行"是"分支`);
      } else {
        console.log(`条件为假，执行"否"分支`);
      }

      await this.simulateNodeExecution(node);
    },

    // 循环节点执行
    async executeLoopNode(node) {
      console.log(`执行循环节点: ${node.label}`);

      const loopCount = node.loopCount || 5;
      const currentIteration = node.currentIteration || 0;

      console.log(`循环 ${currentIteration + 1}/${loopCount}`);

      // 更新当前迭代次数
      node.currentIteration = currentIteration + 1;

      if (node.currentIteration < loopCount) {
        console.log(`继续循环，当前迭代: ${node.currentIteration}`);
        // 继续循环，不标记为完成
        await this.simulateNodeExecution(node);
        // 重置状态为待执行，以便继续循环
        this.setNodeStatus(node.id, NODE_STATUS.PENDING);
      } else {
        console.log(`循环完成，共执行 ${loopCount} 次`);
        await this.simulateNodeExecution(node);
      }
    },

    // 定时器节点执行
    async executeTimerNode(node) {
      console.log(`执行定时器节点: ${node.label}`);

      const delay = node.delay || 3000;
      console.log(`等待 ${delay}ms`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    },

    // 合并节点执行
    async executeMergeNode(node) {
      console.log(`执行合并节点: ${node.label}`);

      // 等待所有输入节点完成
      const inputEdges = Array.from(this.edges.values()).filter(
        (edge) => edge.target === node.id
      );
      console.log(`等待 ${inputEdges.length} 个输入节点完成`);

      await this.simulateNodeExecution(node);
    },

    // 并行节点执行
    async executeParallelNode(node) {
      console.log(`执行并行节点: ${node.label}`);

      // 启动所有并行分支
      const outputEdges = Array.from(this.edges.values()).filter(
        (edge) => edge.source === node.id
      );
      console.log(`启动 ${outputEdges.length} 个并行分支`);

      await this.simulateNodeExecution(node);
    },

    // 条件节点执行
    async executeConditionNode(node) {
      console.log(`执行条件节点: ${node.label}`);

      const condition = node.condition || "Math.random() > 0.3";
      const result = this.evaluateCondition(condition);

      console.log(`条件 "${condition}" 结果为: ${result}`);

      await this.simulateNodeExecution(node);
    },

    // 子流程节点执行
    async executeSubprocessNode(node) {
      console.log(`执行子流程节点: ${node.label}`);

      // 这里可以调用其他工作流
      console.log(`调用子流程: ${node.subprocessId || "default"}`);

      await this.simulateNodeExecution(node);
    },

    // 条件评估
    evaluateCondition(condition) {
      try {
        // 简单的条件评估，实际项目中可能需要更复杂的表达式解析器
        if (condition.includes("Math.random()")) {
          return eval(condition);
        }
        // 其他条件类型...
        return true;
      } catch (error) {
        console.error(`条件评估失败: ${condition}`, error);
        return false;
      }
    },

    async simulateNodeExecution(node) {
      // 模拟异步执行过程
      return new Promise((resolve, reject) => {
        const executionTime = Math.random() * 2000 + 1000; // 1-3秒随机执行时间

        setTimeout(() => {
          // 模拟执行结果（90%成功率）
          if (Math.random() > 0.1) {
            node.status = NODE_STATUS.COMPLETED;
            console.log(`节点 ${node.id} (${node.label}) 执行完成`, node);
            resolve();
          } else {
            reject(new Error("模拟执行失败"));
          }
        }, executionTime);
      });
    },

    checkWorkflowCompletion() {
      const allNodes = Array.from(this.nodes.values());
      const taskNodes = allNodes.filter((node) => node.type === "task");
      const endNodes = allNodes.filter((node) => node.type === "end");

      // 检查所有任务节点是否都已完成
      const allTasksCompleted = taskNodes.every(
        (node) => node.status === NODE_STATUS.COMPLETED
      );

      if (allTasksCompleted) {
        // 标记结束节点为完成
        endNodes.forEach((node) => {
          this.setNodeStatus(node.id, NODE_STATUS.COMPLETED);
        });

        this.workflowStatus = WORKFLOW_STATUS.COMPLETED;
        this.endTime = Date.now();
        console.log("工作流执行完成");
      }
    },

    // --- 数据操作 (增删改) ---
    deleteEdge(edgeId) {
      this.edges.delete(edgeId);
    },

    // 创建新节点
    createNode(type, label, position) {
      const nodeId = `${type}_${Date.now()}`;
      const node = {
        id: nodeId,
        type: type,
        label: label,
        position: position,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: NODE_STATUS.PENDING,
      };

      // 根据节点类型添加特殊属性
      switch (type) {
        case NODE_TYPES.BRANCH:
          node.condition = "Math.random() > 0.5";
          break;
        case NODE_TYPES.LOOP:
          node.loopCount = 5;
          node.currentIteration = 0;
          break;
        case NODE_TYPES.TIMER:
          node.delay = 3000;
          break;
        case NODE_TYPES.SUBPROCESS:
          node.subprocessId = "default";
          break;
      }

      this.nodes.set(nodeId, node);
      return nodeId;
    },

    // 删除节点
    deleteNode(nodeId) {
      // 删除相关的边
      const edgesToDelete = [];
      for (const edge of this.edges.values()) {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToDelete.push(edge.id);
        }
      }
      edgesToDelete.forEach((edgeId) => this.edges.delete(edgeId));

      // 删除节点
      this.nodes.delete(nodeId);
    },

    shiftNodes(startLevel, distance) {
      const levels = this.nodeLevels;
      for (const [id, node] of this.nodes.entries()) {
        const level = levels.get(id);
        if (level !== undefined && level >= startLevel) {
          node.position.y += distance;
        }
      }
    },

    insertNode(targetNodeId, direction) {
      const nodeA = this.nodes.get(targetNodeId);
      const targetLevel = this.nodeLevels.get(targetNodeId);
      if (!nodeA || targetLevel === undefined) return;

      const shiftDistance = NODE_HEIGHT + SPACING;

      // 1️⃣ 重新构建层级索引 (每次调用时都基于最新拓扑重建，避免缓存过期)
      const levelNodeMap = new Map();
      for (const [id, level] of this.nodeLevels) {
        if (!levelNodeMap.has(level)) levelNodeMap.set(level, []);
        levelNodeMap.get(level).push(id);
      }

      const startLevel = direction === "below" ? targetLevel + 1 : targetLevel;

      // 2️⃣ 只移动受影响层级的节点
      const affectedLevels = [];
      for (const [level] of levelNodeMap) {
        if (level >= startLevel) affectedLevels.push(level);
      }
      for (const level of affectedLevels) {
        for (const nodeId of levelNodeMap.get(level)) {
          const node = this.nodes.get(nodeId);
          if (!node) continue;
          node.position.y += shiftDistance;
        }
      }

      // 3️⃣ 创建新节点
      const newNodeId = `task_${Date.now()}`;
      const newY =
        direction === "below"
          ? nodeA.position.y + (nodeA.height ?? NODE_HEIGHT) + SPACING
          : nodeA.position.y - (NODE_HEIGHT + SPACING);

      const nodeC = {
        id: newNodeId,
        type: NODE_TYPES.TASK,
        label: `新任务`,
        position: { x: nodeA.position.x, y: newY },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: NODE_STATUS.PENDING,
      };

      // 4️⃣ 批量更新节点
      const newNodes = new Map(this.nodes);
      newNodes.set(newNodeId, nodeC);

      // 5️⃣ 基于当前边重建索引（每次都重建，确保二次插入也正确连边）
      const edgeSourceIndex = new Map();
      const edgeTargetIndex = new Map();
      for (const [id, edge] of this.edges) {
        if (!edgeSourceIndex.has(edge.source))
          edgeSourceIndex.set(edge.source, []);
        if (!edgeTargetIndex.has(edge.target))
          edgeTargetIndex.set(edge.target, []);
        edgeSourceIndex.get(edge.source).push(id);
        edgeTargetIndex.get(edge.target).push(id);
      }

      const newEdges = new Map(this.edges);
      const edgesToDelete = [];

      if (direction === "below") {
        const outgoing = edgeSourceIndex.get(targetNodeId) || [];
        outgoing.forEach((edgeId) => {
          const edge = this.edges.get(edgeId);
          if (!edge) return;
          edgesToDelete.push(edgeId);

          const newEdgeId = `e_${newNodeId}_${edge.target}_${Date.now()}`;
          newEdges.set(newEdgeId, {
            id: newEdgeId,
            source: newNodeId,
            target: edge.target,
            label: edge.label,
          });
        });

        const connectingEdgeId = `e_${targetNodeId}_${newNodeId}_${Date.now()}`;
        newEdges.set(connectingEdgeId, {
          id: connectingEdgeId,
          source: targetNodeId,
          target: newNodeId,
        });
      } else {
        // 'above'
        const incoming = edgeTargetIndex.get(targetNodeId) || [];
        incoming.forEach((edgeId) => {
          const edge = this.edges.get(edgeId);
          if (!edge) return;
          edgesToDelete.push(edgeId);

          const newEdgeId = `e_${edge.source}_${newNodeId}_${Date.now()}`;
          newEdges.set(newEdgeId, {
            id: newEdgeId,
            source: edge.source,
            target: newNodeId,
            label: edge.label,
          });
        });

        const connectingEdgeId = `e_${newNodeId}_${targetNodeId}_${Date.now()}`;
        newEdges.set(connectingEdgeId, {
          id: connectingEdgeId,
          source: newNodeId,
          target: targetNodeId,
        });
      }

      // 删除旧边
      edgesToDelete.forEach((id) => newEdges.delete(id));

      // 6️⃣ 批量替换响应式数据
      this.nodes = newNodes;
      this.edges = newEdges;
    },

    // 在当前节点下方插入一个“分支”节点，并自动创建两个分支子任务
    insertBranchNode(targetNodeId) {
      const nodeA = this.nodes.get(targetNodeId);
      const targetLevel = this.nodeLevels.get(targetNodeId);
      if (!nodeA || targetLevel === undefined) return;

      const shiftDistance = NODE_HEIGHT + SPACING;

      // 1️⃣ 重建层级索引并下移受影响层级
      const levelNodeMap = new Map();
      for (const [id, level] of this.nodeLevels) {
        if (!levelNodeMap.has(level)) levelNodeMap.set(level, []);
        levelNodeMap.get(level).push(id);
      }
      const startLevel = targetLevel + 1;
      for (const [level, ids] of levelNodeMap) {
        if (level >= startLevel) {
          ids.forEach((nid) => {
            const n = this.nodes.get(nid);
            if (n) n.position.y += shiftDistance;
          });
        }
      }

      // 2️⃣ 创建分支节点和两个子任务
      const branchId = `branch_${Date.now()}`;
      const branchY =
        nodeA.position.y + (nodeA.height ?? NODE_HEIGHT) + SPACING;
      const branchNode = {
        id: branchId,
        type: NODE_TYPES.BRANCH,
        label: "分支",
        position: { x: nodeA.position.x, y: branchY },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: NODE_STATUS.PENDING,
        condition: "Math.random() > 0.5",
      };

      const leftId = `task_${Date.now()}_yes`;
      const rightId = `task_${Date.now()}_no`;
      const childY = branchY + NODE_HEIGHT + SPACING;
      const childOffsetX = 150;
      const leftNode = {
        id: leftId,
        type: NODE_TYPES.TASK,
        label: "是分支",
        position: { x: nodeA.position.x - childOffsetX, y: childY },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: NODE_STATUS.PENDING,
      };
      const rightNode = {
        id: rightId,
        type: NODE_TYPES.TASK,
        label: "否分支",
        position: { x: nodeA.position.x + childOffsetX, y: childY },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: NODE_STATUS.PENDING,
      };

      // 3️⃣ 复制节点集合并加入新节点
      const newNodes = new Map(this.nodes);
      newNodes.set(branchId, branchNode);
      newNodes.set(leftId, leftNode);
      newNodes.set(rightId, rightNode);

      // 4️⃣ 处理边：断开 target 的原有出边，改为从分支的“是”分支续接
      const edgeSourceIndex = new Map();
      for (const [id, edge] of this.edges) {
        if (!edgeSourceIndex.has(edge.source))
          edgeSourceIndex.set(edge.source, []);
        edgeSourceIndex.get(edge.source).push(id);
      }
      const newEdges = new Map(this.edges);
      const edgesToDelete = [];

      const outgoing = edgeSourceIndex.get(targetNodeId) || [];
      outgoing.forEach((edgeId) => {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        edgesToDelete.push(edgeId);

        // 将原有出边迁移到“是分支”子节点
        const migratedId = `e_${leftId}_${edge.target}_${Date.now()}`;
        newEdges.set(migratedId, {
          id: migratedId,
          source: leftId,
          target: edge.target,
          label: edge.label,
        });
      });

      // 连接 target -> branch
      const e1 = `e_${targetNodeId}_${branchId}_${Date.now()}`;
      newEdges.set(e1, { id: e1, source: targetNodeId, target: branchId });
      // branch -> left/right 子分支
      const eYes = `e_${branchId}_${leftId}_${Date.now()}`;
      const eNo = `e_${branchId}_${rightId}_${Date.now()}`;
      newEdges.set(eYes, {
        id: eYes,
        source: branchId,
        target: leftId,
        label: "是",
      });
      newEdges.set(eNo, {
        id: eNo,
        source: branchId,
        target: rightId,
        label: "否",
      });

      // 删除旧边
      edgesToDelete.forEach((id) => newEdges.delete(id));

      // 5️⃣ 提交替换
      this.nodes = newNodes;
      this.edges = newEdges;
    },

    async saveWorkflow(url = "/api/workflow/save") {
      const workflowData = {
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
        viewportOffset: this.viewportOffset,
        zoomLevel: this.zoomLevel,
      };

      console.log("准备上报的数据:", workflowData);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workflowData),
        });

        if (!response.ok) {
          throw new Error(`保存失败: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("工作流保存成功:", result);
        return result;
      } catch (error) {
        console.error("保存工作流时发生错误:", error);
        throw error;
      }
    },
  },
});

// 导出状态常量供组件使用
export { WORKFLOW_STATUS, NODE_STATUS, NODE_TYPES };
