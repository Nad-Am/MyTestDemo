<template>
    <div
      ref="containerRef"
      class="virtual-list-container"
      @scroll="onScroll"
    >
      <!-- 占位层：用于撑起滚动条高度 -->
      <div class="phantom" :style="{ height: totalHeight + 'px' }"></div>
  
      <!-- 可视内容层：使用 transform 进行位移 -->
      <div
        class="content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="item in visibleList"
          :key="item.id"
          class="item"
          :style="{ height: itemHeight + 'px' }"
        >
          {{ item.text }}
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  
  /**
   * 参数配置
   */
  const itemHeight = 50 // 每个item高度(px)
  const containerHeight = 300 // 容器高度(px)
  const totalCount = 10000 // 数据总量
  
  // 生成测试数据
  const list = Array.from({ length: totalCount }, (_, i) => ({
    id: i,
    text: `我是第 ${i} 行`
  }))
  
  // 滚动容器
  const containerRef = ref(null)
  
  // 当前滚动位置
  const scrollTop = ref(0)
  
  // 可视区最大显示个数（多渲染2个缓冲）
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2
  
  // 计算当前起始索引
  const startIndex = computed(() => Math.floor(scrollTop.value / itemHeight))
  
  // 计算结束索引
  const endIndex = computed(() => startIndex.value + visibleCount)
  
  // 当前显示的数据切片
  const visibleList = computed(() =>
    list.slice(startIndex.value, endIndex.value)
  )
  
  // 平移偏移量
  const offsetY = computed(() => startIndex.value * itemHeight)
  
  // 总高度
  const totalHeight = totalCount * itemHeight
  
  // 监听滚动
  function onScroll(e) {
    scrollTop.value = e.target.scrollTop
  }
  
  // 初始化设置容器高度
  onMounted(() => {
    containerRef.value.style.height = containerHeight + 'px'
  })
  </script>
  
  <style scoped>
  .virtual-list-container {
    width: 300px;
    overflow-y: auto;
    border: 1px solid #ccc;
    position: relative;
  }
  
  /* 撑起滚动条的高度层 */
  .phantom {
    width: 100%;
  }
  
  /* 可视渲染区域 */
  .content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background: #e3aaaa;
  }
  
  /* 每个 item */
  .item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #eee;
    background: #fafafa;
    font-size: 14px;
  }
  </style>
  