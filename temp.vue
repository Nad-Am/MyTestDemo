<template>
    <StreamingMarkdown :content="markdownText" />
    <button @click="getMarkdown">click</button>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import StreamingMarkdown from '@/components/StreamingMarkdown.vue'
import fetchAI from '../apis/ai-markdown'

const markdownText = ref('')
const getMarkdown = () => {
    fetchAI((chunk) => {
        markdownText.value  += chunk
        console.log(markdownText.value)
        console.log('chunk  ',chunk)
    })
}

// onMounted(() => {
// // 模拟 AI 流式输出
// const chunks = [
//     '# 流式 Markdown\n\n',
//     '这是第一段文字。\n\n',
//     '```js\nconsole.log("代码块开始");\n```',
//     '\n表格：\n| 名称 | 值 |\n|------|----|\n| A | 1 |\n| B | 2 |'
// ]
// let i = 0
// const timer = setInterval(() => {
//     markdownText.value += chunks[i]
//     i++
//     if (i >= chunks.length) clearInterval(timer)
// }, 800)
// })
  </script>
  