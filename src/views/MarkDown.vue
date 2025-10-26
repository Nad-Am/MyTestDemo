<template>
    <StreamingMarkdownPro ref="mdComp" />
    <button @click="startStreaming">开始流式</button>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import StreamingMarkdownPro from '@/components/StreamingMarkdown.vue'
  import fetchAI from '../apis/ai-markdown'
  
  const mdComp = ref(null)

  let allContent = ''
  
  function startStreaming() {
    // ❗ 使用组件实例调用暴露的方法
    if (!mdComp.value) return
  
    mdComp.value.clearContent() // 清空旧内容
    allContent = ''
  
    // const chunks = [
    //   '# 流式 Markdown\n\n',
    //   '这是第一段文字。\n\n',
    //   '```js\nconsole.log("Hello World");\n```',
    //   '\n表格：\n| 名称 | 值 |\n|------|----|\n| A | 1 |\n| B | 2 |',
    //   `
    //   $$ 
    //   \frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} = -\frac{1}{\rho} \nabla p + \nu \nabla^2 \mathbf{u} + \mathbf{f} 
    //   $$
    //   `
    // ]
  
    // let i = 0
    // const timer = setInterval(() => {
    //   mdComp.value.appendChunk(chunks[i]) // 追加 chunk
    //   i++
    //   if (i >= chunks.length) clearInterval(timer)
    // }, 500)
//     const chunk = `$$
// \\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla) \\mathbf{u} = -\\frac{1}{\\rho} \\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}
// $$`

//     mdComp.value.appendChunk(chunk);
    fetchAI((chunk) => {
      mdComp.value.appendChunk(chunk)
      allContent += chunk
    })

  }
  </script>
  