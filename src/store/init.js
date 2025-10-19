// --- ⚙️ 核心常量定义 (保持与 store.js 一致) ---
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const SPACING = 60; 

// --- 💻 数据生成逻辑 ---

const nodesData = new Map();
const edgesData = new Map();

// 1. 定义起点和终点
const startNode = { 
    id: 'start', 
    type: 'start', 
    label: '流程开始', 
    position: { x: 450, y: 50 }, 
    width: NODE_WIDTH, 
    height: NODE_HEIGHT 
};
nodesData.set('start', startNode);

// 2. 循环生成 98 个任务节点 (task_1 到 task_98)
const TOTAL_TASKS = 298;
let previousNodeId = 'start';
let currentY = startNode.position.y;

for (let i = 1; i <= TOTAL_TASKS; i++) {
    const currentNodeId = `task_${i}`;
    
    // 计算新节点的 Y 坐标：前一个节点的 Y + 节点高度 + 间距
    currentY += NODE_HEIGHT + SPACING; 
    
    const newNode = {
        id: currentNodeId,
        type: 'task',
        label: `任务 ${i}`,
        position: { x: 450, y: currentY },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
    };
    
    // 写入节点
    nodesData.set(currentNodeId, newNode);
    
    // 写入连线：连接前一个节点到当前节点
    const newEdge = {
        id: `e${i}`,
        source: previousNodeId,
        target: currentNodeId,
        label: `步骤 ${i} 完成`,
    };
    edgesData.set(newEdge.id, newEdge);
    
    // 更新前一个节点
    previousNodeId = currentNodeId;
}

// 3. 定义终点
const endNode = { 
    id: 'end', 
    type: 'end', 
    label: '流程结束', 
    position: { x: 450, y: currentY + NODE_HEIGHT + SPACING }, // 放置在最后一个任务节点之后
    width: NODE_WIDTH, 
    height: NODE_HEIGHT 
};
nodesData.set('end', endNode);

// 4. 连接最后一个任务节点到终点
const finalEdge = {
    id: `e${TOTAL_TASKS + 1}`,
    source: previousNodeId,
    target: 'end',
    label: '流程结束',
};
edgesData.set(finalEdge.id, finalEdge);


// --- 📦 最终导出的数据结构 ---
export const initialNodes = nodesData;
export const initialEdges = edgesData;

console.log(`生成完成: 节点总数 ${nodesData.size} (100 个), 连线总数 ${edgesData.size} (99 条)`);