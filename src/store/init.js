// init.js
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;

// 节点状态常量
export const NODE_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
};

// ---- 生成测试节点 ----
const initialNodes = new Map();
const initialEdges = new Map();

const TOTAL_NODES = 1000;
const COLS = 10; // 每行 10 个节点
const H_GAP = 180; // 节点横向间距
const V_GAP = 120; // 节点纵向间距

// 添加开始节点
initialNodes.set("start", {
  id: "start",
  type: "start",
  label: "开始",
  position: { x: 450, y: 50 },
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  status: NODE_STATUS.PENDING,
});

// 自动生成中间节点
for (let i = 1; i <= TOTAL_NODES; i++) {
  const x = (i % COLS) * H_GAP + 100;
  const y = Math.floor(i / COLS) * V_GAP + 150;

  // 根据索引类型随机分配类型
  let type = "task";
  if (i % 10 === 0) type = "branch";
  else if (i % 15 === 0) type = "loop";
  else if (i % 20 === 0) type = "timer";
  else if (i % 25 === 0) type = "merge";

  initialNodes.set(`node${i}`, {
    id: `node${i}`,
    type,
    label: `${type.toUpperCase()}-${i}`,
    position: { x, y },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    status: NODE_STATUS.PENDING,
    ...(type === "loop"
      ? { loopCount: 3, currentIteration: 0 }
      : type === "timer"
      ? { delay: 1000 + (i % 5) * 500 }
      : {}),
  });

  // 添加边
  if (i === 1) {
    initialEdges.set(`e${i}`, {
      id: `e${i}`,
      source: "start",
      target: `node${i}`,
      label: "启动",
    });
  } else {
    // 每个节点连接前一个节点
    initialEdges.set(`e${i}`, {
      id: `e${i}`,
      source: `node${i - 1}`,
      target: `node${i}`,
      label: "流程",
    });

    // 每隔 50 个节点添加一个分支边
    if (i % 50 === 0 && i < TOTAL_NODES - 1) {
      initialEdges.set(`b${i}`, {
        id: `b${i}`,
        source: `node${i}`,
        target: `node${i + 2}`,
        label: "条件分支",
      });
    }
  }

  // 循环节点添加自环
  if (type === "loop") {
    initialEdges.set(`loop${i}`, {
      id: `loop${i}`,
      source: `node${i}`,
      target: `node${i}`,
      label: "循环",
    });
  }
}

// 添加结束节点
initialNodes.set("end", {
  id: "end",
  type: "end",
  label: "结束",
  position: { x: 450, y: Math.floor(TOTAL_NODES / COLS + 1) * V_GAP + 150 },
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  status: NODE_STATUS.PENDING,
});

// 将最后一个节点连接到结束节点
initialEdges.set(`e_end`, {
  id: "e_end",
  source: `node${TOTAL_NODES}`,
  target: "end",
  label: "结束",
});

export { initialNodes, initialEdges };
