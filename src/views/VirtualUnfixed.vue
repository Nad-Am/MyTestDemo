<template>
  <div
    ref="container"
    class="virtual-container"
    @scroll="onScroll"
  >
    <!-- 占位区撑起总高度 -->
    <div class="spacer" :style="{ height: totalHeight + 'px' }"></div>

    <!-- 可视内容区 -->
    <div
      class="list"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="(item, i) in visibleItems"
        :key="item.id"
        class="item"
        :ref="el => registerItem(el, start + i)"
        :style="{ height: item.height + 'px' }"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

// ---------------------------
// 内部数据列表
// ---------------------------
const totalItems = 1000
const items = Array.from({ length: totalItems }, (_, i) => ({
  id: i,
  text: `第 ${i} 条数据，随机高度`,
  height: 50 + Math.floor(Math.random() * 100)
}))

// ---------------------------
// 虚拟列表状态
// ---------------------------
const container = ref(null)
const scrollTop = ref(0)
const itemHeights = ref(items.map(item => item.height))
const start = ref(0)
const end = ref(0)
const offsetY = ref(0)
const totalHeight = ref(0)
const buffer = 3
const containerHeight = 400

// ---------------------------
// ResizeObserver
// ---------------------------
let resizeObserver = null
const setupResizeObserver = () => {
  resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const el = entry.target
      const index = Number(el.dataset.index)
      const height = entry.contentRect.height
      if (itemHeights.value[index] !== height) {
        itemHeights.value[index] = height
        computeTotalHeight()
        updateVisibleRange()
      }
    }
  })
}

// ---------------------------
// IntersectionObserver（可扩展懒加载）
// ---------------------------
let intersectionObserver = null
const setupIntersectionObserver = () => {
  intersectionObserver = new IntersectionObserver(entries => {
    for (let entry of entries) {
      if (entry.isIntersecting) {
        const index = Number(entry.target.dataset.index)
        // 可以在这里懒加载图片或异步内容
      }
    }
  }, {
    root: container.value,
    threshold: 0.1
  })
}

// ---------------------------
// 注册每个 item
// ---------------------------
const registerItem = (el, index) => {
  if (!el) return
  el.dataset.index = index
  resizeObserver.observe(el)
  intersectionObserver.observe(el)
}

// ---------------------------
// 计算总高度
// ---------------------------
const computeTotalHeight = () => {
  totalHeight.value = itemHeights.value.reduce((sum, h) => sum + h, 0)
}

// ---------------------------
// 滚动事件
// ---------------------------
const onScroll = () => {
  scrollTop.value = container.value.scrollTop
  updateVisibleRange()
}

// ---------------------------
// 更新可视区
// ---------------------------
const updateVisibleRange = () => {
  let sum = 0
  let startIndex = 0
  let endIndex = items.length - 1

  // 找到 startIndex
  for (let i = 0; i < items.length; i++) {
    const h = itemHeights.value[i]
    if (sum + h > scrollTop.value) {
      startIndex = i
      break
    }
    sum += h
  }

  // 找到 endIndex
  let viewHeight = 0
  for (let i = startIndex; i < items.length; i++) {
    viewHeight += itemHeights.value[i]
    if (viewHeight >= containerHeight) {
      endIndex = i
      break
    }
  }

  start.value = Math.max(0, startIndex - buffer)
  end.value = Math.min(items.length, endIndex + buffer)

  // 偏移量累加 0..startIndex-1
  offsetY.value = itemHeights.value.slice(0, startIndex).reduce((a, b) => a + b, 0)
}

// ---------------------------
// 可视数据
// ---------------------------
const visibleItems = computed(() => items.slice(start.value, end.value))

// ---------------------------
// 初始化
// ---------------------------
onMounted(() => {
  setupResizeObserver()
  setupIntersectionObserver()
  computeTotalHeight()
  updateVisibleRange()
  const scollHeight = container.value.scrollHeight
  console.log('scollHeight', scollHeight)
})
</script>

<style scoped>
.virtual-container {
  overflow-y: auto;
  position: relative;
  /* height: 400px; */
  width: 500px;
  border: 1px solid #ccc;
}
.spacer {
  width: 100%;
}
.list {
  position: absolute;
  width: 100%;
  will-change: transform;
}
.item {
  box-sizing: border-box;
  margin: 4px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
