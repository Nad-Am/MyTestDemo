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
      >
        <span class="index">Index: {{ item.id }}</span>
        <div class="content">{{ item.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'

// ---------------------------
// 数据列表
// ---------------------------
const totalItems = 1000
const items = Array.from({ length: totalItems }, (_, i) => ({
  id: i,
  text: `这是第 ${i} 条数据。渲染内容长度各不相同，用于测试变高虚拟列表的渲染性能和正确性。内容示例：${'测试内容 '.repeat(Math.floor(Math.random() * 50) + 1)}`,
}))

// ---------------------------
// 状态
// ---------------------------
const container = ref(null)
const estimatedItemHeight = 120
const itemHeights = reactive(new Array(totalItems).fill(estimatedItemHeight))
const start = ref(0)
const end = ref(0)
const buffer = 5
const containerHeightFixed = 400

// ---------------------------
// 前缀和 + 二分查找
// ---------------------------
const prefixHeights = computed(() => {
  const arr = new Array(totalItems + 1)
  arr[0] = 0
  for (let i = 0; i < totalItems; i++) {
    arr[i + 1] = arr[i] + itemHeights[i]
  }
  return arr
})

const totalHeight = computed(() => prefixHeights.value[totalItems])
const offsetY = computed(() => prefixHeights.value[start.value])
const visibleItems = computed(() => items.slice(start.value, end.value))

const findStartIndex = (scrollTop) => {
  const prefix = prefixHeights.value
  let lo = 0, hi = totalItems - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (prefix[mid + 1] <= scrollTop) lo = mid + 1
    else hi = mid
  }
  return lo
}

// ---------------------------
// 核心：计算可见范围
// ---------------------------
const updateVisibleRange = () => {
  if (!container.value) return
  const scrollTop = container.value.scrollTop
  const startIndex = findStartIndex(scrollTop)

  const prefix = prefixHeights.value
  const bottomEdge = scrollTop + containerHeightFixed
  let endIndex = startIndex
  while (endIndex < totalItems && prefix[endIndex] < bottomEdge) {
    endIndex++
  }

  start.value = Math.max(0, startIndex - buffer)
  end.value = Math.min(totalItems, endIndex + buffer)
}

// ---------------------------
// 滚动处理
// ---------------------------
const onScroll = () => {
  updateVisibleRange()
}

// ---------------------------
// ResizeObserver
// ---------------------------
let resizeObserver = null
const observedElements = new Map() // index -> element

const setupResizeObserver = () => {
  resizeObserver = new ResizeObserver(entries => {
    if (!container.value) return

    const scrollTop = container.value.scrollTop
    const firstVisibleIndex = findStartIndex(scrollTop)

    let scrollDelta = 0
    let hasChanges = false

    for (const entry of entries) {
      const el = entry.target
      const index = Number(el.dataset.index)
      if (isNaN(index) || index < 0 || index >= totalItems) continue

      const newHeight = el.offsetHeight

      // 关键：忽略高度为 0 的观测（元素正在被移除 DOM）
      if (newHeight <= 0) continue

      const oldHeight = itemHeights[index]
      if (Math.abs(newHeight - oldHeight) < 0.5) continue

      // 仅当修改的元素在视口第一个可见元素之上时，调整 scrollTop
      if (index < firstVisibleIndex) {
        scrollDelta += (newHeight - oldHeight)
      }

      itemHeights[index] = newHeight
      hasChanges = true
    }

    if (!hasChanges) return

    // 校正上方元素高度变化引起的偏移
    if (Math.abs(scrollDelta) > 0.5 && container.value) {
      container.value.scrollTop += scrollDelta
    }

    updateVisibleRange()
  })
}

// 注册/取消注册 item 的 ResizeObserver 观测
const registerItem = (el, index) => {
  if (!resizeObserver) return

  if (el) {
    // 新元素挂载
    const oldEl = observedElements.get(index)
    if (oldEl === el) return // 同一节点无需重复操作
    if (oldEl) {
      resizeObserver.unobserve(oldEl)
    }
    el.dataset.index = index
    resizeObserver.observe(el)
    observedElements.set(index, el)
  } else {
    // 元素被卸载 → 立即取消观测，防止 ResizeObserver 报告 height=0
    const oldEl = observedElements.get(index)
    if (oldEl) {
      resizeObserver.unobserve(oldEl)
      observedElements.delete(index)
    }
  }
}

// ---------------------------
// 生命周期
// ---------------------------
onMounted(() => {
  setupResizeObserver()
  nextTick(() => updateVisibleRange())
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  observedElements.clear()
})
</script>

<style scoped>
.virtual-container {
  overflow-y: auto;
  position: relative;
  height: 400px;
  width: 100%;
  max-width: 600px;
  border: 1px solid #ccc;
  background: #fff;
  margin: 20px auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.spacer {
  width: 100%;
}

.list {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

.item {
  box-sizing: border-box;
  padding: 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item:hover {
  background-color: #fafafa;
}

.index {
  font-size: 12px;
  color: #999;
  font-weight: bold;
}

.content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}
</style>
