<template>
    <div>
      <div ref="container" class="graph-container"></div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import * as G6 from '@antv/g6';
  
  const container = ref(null);
  
  // 初始节点和边
  const nodes = ref([
    { id: '0', type: 'rect' },
    { id: '1', type: 'rect' },
    { id: '2', type: 'rect' },
    { id: '3', type: 'diamond' },
    { id: '4', type: 'rect' },
  ]);
  
  const edges = ref([
    { source: '0', target: '1' },
    { source: '0', target: '2' },
    { source: '1', target: '3' },
    { source: '2', target: '3' },
    { source: '3', target: '4' },
  ]);
  
  let graph = null;
  
  onMounted(() => {
    graph = new G6.Graph({
      container: container.value,
      width: container.value.clientWidth,
      height: container.value.clientHeight,
      layout: { type: 'dagre', nodesep: 60, ranksep: 50, controlPoints: true },
      defaultNode: {
        type: 'rect',
        style: { width: 60, height: 30, fill: '#C6E5FF', stroke: '#5B8FF9', radius: 6 },
        labelCfg: { style: { fill: '#000' }, position: 'center' },
      },
      nodeTypes: {
        diamond: {
          shapeType: 'path',
          getPath() {
            const w = 30;
            const h = 30;
            return [
              ['M', 0, -h],
              ['L', w, 0],
              ['L', 0, h],
              ['L', -w, 0],
              ['Z'],
            ];
          },
          labelCfg: { style: { fill: '#000', fontSize: 12 } },
        },
      },
      defaultEdge: { type: 'polyline', style: { stroke: '#A3B1BF', endArrow: true } },
      modes: { default: ['drag-node', 'drag-canvas', 'zoom-canvas'] },
    });
  
    // 初始化图数据
    graph.setData({ nodes: nodes.value, edges: edges.value });
    graph.render();
  
    // 点击边自动插入节点
    graph.on('edge:click', (evt) => {
      const edgeItem = evt.item;
      const model = edgeItem.getModel();
      const source = typeof model.source === 'object' ? model.source.id : model.source;
      const target = typeof model.target === 'object' ? model.target.id : model.target;
  
      const newId = 'n' + (nodes.value.length + 1);
  
      // 删除原边
      const idx = edges.value.findIndex(e => e.source === source && e.target === target);
      if (idx !== -1) edges.value.splice(idx, 1);
      graph.removeItem(edgeItem);
  
      // 添加新节点
      const newNode = { id: newId, type: 'rect' };
      nodes.value.push(newNode);
      graph.addItem('node', newNode);
  
      // 添加两条新边
      const edge1 = { source, target: newId };
      const edge2 = { source: newId, target };
      edges.value.push(edge1, edge2);
      graph.addItem('edge', edge1);
      graph.addItem('edge', edge2);
  
      // 重新布局
      graph.layout();
      graph.fitCenter();
    });
  });
  </script>
  
  <style scoped>
  .graph-container {
    width: 1000px;
    height: 500px;
    border: 1px solid #ccc;
  }
  </style>
  