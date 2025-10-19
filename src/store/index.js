// store.js

import { defineStore } from 'pinia';
import { initialEdges, initialNodes } from './init';

// --- ⚙️ 核心常量定义 ---
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const SPACING = 60; // 节点之间的垂直间距
const VIEWPORT_WIDTH = 1000; // 视口宽度 (用于裁剪)
const VIEWPORT_HEIGHT = 600; // 视口高度 (用于裁剪)
const MIN_ZOOM = 0.5; // 最小缩放比例 50%
const MAX_ZOOM = 2.0; // 最大缩放比例 200%
const ZOOM_STEP = 0.1; // 每次缩放的步长

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

export const useWorkflowStore = defineStore('workflow', {
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
    }),

    getters: {
        // --- 拓扑结构计算：用于布局 ---
        nodeLevels(state) {
            const levels = new Map();
            const queue = ['start'];
            levels.set('start', 0);
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
            return Array.from(state.edges.values()).filter(edge => {
                const sourceNode = state.nodes.get(edge.source);
                const targetNode = state.nodes.get(edge.target);
                if (!sourceNode || !targetNode) return false;

                const getCenter = (node) => {
                    const w = node.width ?? NODE_WIDTH;
                    const h = node.height ?? NODE_HEIGHT;
                    return { 
                        x: (node.position.x + w / 2) * Z + state.viewportOffset.x,
                        y: (node.position.y + h / 2) * Z + state.viewportOffset.y
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
            console.log('v trigger')
            // 1. 添加所有自身位于视口内的节点
            const selfVisibleNodes = Array.from(state.nodes.values()).filter(node => {
                const nodeW = (node.width ?? NODE_WIDTH) * Z;
                const nodeH = (node.height ?? NODE_HEIGHT) * Z;
                
                // 节点渲染坐标 = 缩放后的原始位置 + 全局偏移
                const renderedX = node.position.x * Z + state.viewportOffset.x;
                const renderedY = node.position.y * Z + state.viewportOffset.y;
                
                // 检查是否在视口内
                const isVisibleX = (renderedX + nodeW > 0) && (renderedX < VIEWPORT_WIDTH);
                const isVisibleY = (renderedY + nodeH > 0) && (renderedY < VIEWPORT_HEIGHT);
                
                return isVisibleX && isVisibleY;
            });

            selfVisibleNodes.forEach(node => renderableNodeIds.add(node.id));

            // 2. 添加所有连接到可见边的节点
            this.visibleEdgesArray.forEach(edge => {
                renderableNodeIds.add(edge.source);
                renderableNodeIds.add(edge.target);
            });

            return Array.from(renderableNodeIds).map(id => state.nodes.get(id)).filter(node => node);
        },

        // --- 连线路径计算 ---
        getEdgePath: (state) => (edgeId) => {
            const edge = state.edges.get(edgeId);
            if (!edge) return '';

            const sourceNode = state.nodes.get(edge.source);
            const targetNode = state.nodes.get(edge.target);
            if (!sourceNode || !targetNode) return '';
            
            const Z = state.zoomLevel;

            const getCenter = (node) => {
                const w = node.width ?? NODE_WIDTH;
                const h = node.height ?? NODE_HEIGHT;
                const x = (node.position.x + w / 2) * Z + state.viewportOffset.x;
                const y = (node.position.y + h / 2) * Z + state.viewportOffset.y;
                return { x, y };
            };

            const source = getCenter(sourceNode);
            const target = getCenter(targetNode);

            return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
        },

        getEdgeLabelPosition: (state) => (edgeId) => {
            const edge = state.edges.get(edgeId);
            if (!edge) return { x: 0, y: 0 };
            
            const sourceNode = state.nodes.get(edge.source);
            const targetNode = state.nodes.get(edge.target);
            if (!sourceNode || !targetNode) return { x: 0, y: 0 };
            
            const Z = state.zoomLevel;

            const getCenter = (node) => {
                const w = node.width ?? NODE_WIDTH;
                const h = node.height ?? NODE_HEIGHT;
                const x = (node.position.x + w / 2) * Z + state.viewportOffset.x;
                const y = (node.position.y + h / 2) * Z + state.viewportOffset.y;
                return { x, y };
            };
            
            const source = getCenter(sourceNode);
            const target = getCenter(targetNode);

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return { x: midX, y: midY };
        }
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
        
        // --- 数据操作 (增删改) ---
        deleteEdge(edgeId) {
            this.edges.delete(edgeId);
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
            
            const startLevel = direction === 'below' ? targetLevel + 1 : targetLevel;
            this.shiftNodes(startLevel, shiftDistance);
            
            const newNodeId = `task_${Date.now()}`;
            let newX = nodeA.position.x;
            let newY = nodeA.position.y;

            if (direction === 'below') {
                newY = nodeA.position.y + (nodeA.height ?? NODE_HEIGHT) + SPACING;
            } else { // 'above'
                newY = nodeA.position.y - (NODE_HEIGHT + SPACING); 
            }
            
            const nodeC = {
                id: newNodeId, type: 'task', label: `新任务`,
                position: { x: newX, y: newY }, width: NODE_WIDTH, height: NODE_HEIGHT,
            };
            this.nodes.set(newNodeId, nodeC); 

            const edgesToDelete = [];
            if (direction === 'below') {
                for (const edge of this.edges.values()) {
                    if (edge.source === targetNodeId) {
                        edgesToDelete.push(edge.id); 
                        const edgeCtoBId = `e_c_${edge.target}_${Date.now()}`;
                        this.edges.set(edgeCtoBId, { id: edgeCtoBId, source: newNodeId, target: edge.target, label: edge.label });
                    }
                }
                this.edges.set(`e_a_${newNodeId}_${Date.now()}`, { id: `e_a_${newNodeId}_${Date.now()}`, source: targetNodeId, target: newNodeId });
            } else { // 'above'
                for (const edge of this.edges.values()) {
                    if (edge.target === targetNodeId) {
                        edgesToDelete.push(edge.id);
                        const edgeYtoCId = `e_${edge.source}_c_${Date.now()}`;
                        this.edges.set(edgeYtoCId, { id: edgeYtoCId, source: edge.source, target: newNodeId, label: edge.label });
                    }
                }
                this.edges.set(`e_c_${targetNodeId}_${Date.now()}`, { id: `e_c_${targetNodeId}_${Date.now()}`, source: newNodeId, target: targetNodeId });
            }

            edgesToDelete.forEach(id => this.deleteEdge(id));
        },
        
        async saveWorkflow(url = '/api/workflow/save') {
            const workflowData = {
                nodes: Array.from(this.nodes.values()), 
                edges: Array.from(this.edges.values()),
                viewportOffset: this.viewportOffset,
                zoomLevel: this.zoomLevel,
            };

            console.log("准备上报的数据:", workflowData);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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