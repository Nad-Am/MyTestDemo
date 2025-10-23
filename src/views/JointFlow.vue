<template>
    <div ref="paperContainer" class="paper-container"></div>
  </template>
  
  <script setup>
  import { onMounted, ref } from 'vue';
  import { dia, shapes } from 'jointjs';
  
  const paperContainer = ref(null);
  
  onMounted(() => {
    // 1️⃣ 创建图模型
    const graph = new dia.Graph();
  
    // 2️⃣ 创建画布
    const paper = new dia.Paper({
      el: paperContainer.value,
      model: graph,
      width: 800,
      height: 600,
      gridSize: 10,
      drawGrid: true,
      interactive: true,
    });
  
    // 3️⃣ 初始化节点
    const nodeA = new shapes.standard.Rectangle();
    nodeA.position(100, 100);
    nodeA.resize(100, 40);
    nodeA.attr('label/text', 'A');
  
    const nodeB = new shapes.standard.Rectangle();
    nodeB.position(300, 100);
    nodeB.resize(100, 40);
    nodeB.attr('label/text', 'B');
  
    graph.addCells([nodeA, nodeB]);
  
    // 4️⃣ 初始化边（有环）
    const linkAB = new dia.Link({
      source: { id: nodeA.id },
      target: { id: nodeB.id },
      attrs: { line: { stroke: '#5c9bd1', strokeWidth: 2, targetMarker: { type: 'classic' } } },
    });
  
    const linkBA = new dia.Link({
      source: { id: nodeB.id },
      target: { id: nodeA.id }, // 回环
      attrs: { line: { stroke: '#f5222d', strokeWidth: 2, targetMarker: { type: 'classic' } } },
    });
  
    graph.addCells([linkAB, linkBA]);
  
    // 5️⃣ Force 布局函数
    function doForceLayout() {
      const nodes = graph.getElements();
      const edges = graph.getLinks();
  
      // 简单力导向算法（模拟）
      const repulsion = 200; // 斥力
      const springLength = 150; // 边长度
  
      nodes.forEach((n1) => {
        let dx = 0, dy = 0;
        nodes.forEach((n2) => {
          if (n1 === n2) return;
          const pos1 = n1.position();
          const pos2 = n2.position();
          const distX = pos1.x - pos2.x;
          const distY = pos1.y - pos2.y;
          const dist = Math.sqrt(distX ** 2 + distY ** 2) + 0.01;
          const force = repulsion / (dist * dist);
          dx += (distX / dist) * force;
          dy += (distY / dist) * force;
        });
        const pos = n1.position();
        n1.position(pos.x + dx, pos.y + dy);
      });
  
      // 让边拉节点靠近
      edges.forEach((edge) => {
        const source = edge.getSourceElement();
        const target = edge.getTargetElement();
        if (!source || !target) return;
        const posS = source.position();
        const posT = target.position();
        const dx = posT.x - posS.x;
        const dy = posT.y - posS.y;
        source.position(posS.x + dx * 0.01, posS.y + dy * 0.01);
        target.position(posT.x - dx * 0.01, posT.y - dy * 0.01);
      });
    }
  
    doForceLayout();
  
    // 6️⃣ 点击边插入节点
    paper.on('link:pointerclick', (linkView) => {
      const linkModel = linkView.model;
  
      const sourceId = linkModel.get('source').id;
      const targetId = linkModel.get('target').id;
  
      // 删除原边
      linkModel.remove();
  
      // 创建新节点
      const newNode = new shapes.standard.Rectangle();
      newNode.position(200, 200);
      newNode.resize(100, 40);
      newNode.attr('label/text', '新节点');
  
      graph.addCell(newNode);
  
      // 添加两条边
      const link1 = new dia.Link({
        source: { id: sourceId },
        target: { id: newNode.id },
        attrs: { line: { stroke: '#5c9bd1', strokeWidth: 2, targetMarker: { type: 'classic' } } },
      });
      const link2 = new dia.Link({
        source: { id: newNode.id },
        target: { id: targetId },
        attrs: { line: { stroke: '#5c9bd1', strokeWidth: 2, targetMarker: { type: 'classic' } } },
      });
  
      graph.addCells([link1, link2]);
  
      // 重新布局
      doForceLayout();
    });
  });
  </script>
  
  <style scoped>
  .paper-container {
    width: 800px;
    height: 600px;
    border: 1px solid #ccc;
  }
  </style>
  