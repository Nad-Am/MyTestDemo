<template>
<div class="chatbox">
    <!-- 消息区 -->
    <div class="messages" ref="messageList">
    <div
        v-for="(msg, i) in messages"
        :key="i"
        class="message"
        v-html="renderMessage(msg)"
    ></div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
    <textarea
        v-model="input"
        @keydown.enter.prevent="sendMessage"
        placeholder="输入消息..."
    ></textarea>

    <button class="emoji-btn" @click="togglePicker">😊</button>
    <button class="send-btn" @click="sendMessage">发送</button>
    </div>

    <!-- Emoji 面板 -->
    <div v-if="showPicker" class="picker">
    <span
        v-for="emoji in emojis"
        :key="emoji.id"
        class="emoji-item"
        @click="addEmoji(emoji.skins[0].native)"
        v-html="emoji.skins[0].native"
    ></span>
    </div>
</div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import twemoji from 'twemoji'
import emojiData from '@emoji-mart/data'

// 消息列表
const messages = ref(['你好 😄', '试试自定义表情'])
const input = ref('')
const showPicker = ref(false)
const messageList = ref(null)

// 从 @emoji-mart/data 中获取 emoji 数组
const emojis = Object.values(emojiData.emojis).slice(0, 150) // 示例取前150个

// 渲染消息（使用 v-html + Twemoji）
function renderMessage(msg) {
return twemoji.parse(msg, { folder: 'svg', ext: '.svg' })
}

// 插入 emoji
function addEmoji(native) {
input.value += native
showPicker.value = false
}

// 发送消息
function sendMessage() {
if (!input.value.trim()) return
messages.value.push(input.value)
input.value = ''
nextTick(() => {
    messageList.value.scrollTop = messageList.value.scrollHeight
})
}

// 切换表情面板
function togglePicker() {
showPicker.value = !showPicker.value
}
</script>

<style>
.emoji {
width: 1rem;      /* 调整到合适大小 */
height: 1rem;
vertical-align: middle; /* 对齐文字 */
}
</style>

<style scoped>
.chatbox {
width: 400px;
max-height: 600px;
display: flex;
flex-direction: column;
background: #1e1e1e;
border-radius: 12px;
padding: 12px;
color: #fff;
font-family: "Segoe UI", sans-serif;
}

.messages {
flex: 1;
overflow-y: auto;
margin-bottom: 8px;
padding-right: 6px;
}

.message {
padding: 6px 8px;
margin-bottom: 4px;
border-radius: 8px;
background: #2a2a2a;
word-break: break-word;
}

.emoji-btn,
.send-btn {
background: #3a3a3a;
border: none;
padding: 6px 10px;
border-radius: 8px;
cursor: pointer;
color: #fff;
}

.emoji-btn:hover,
.send-btn:hover {
background: #4a4a4a;
}

.input-area {
display: flex;
align-items: center;
gap: 6px;
}

textarea {
flex: 1;
resize: none;
height: 40px;
border-radius: 8px;
border: none;
padding: 8px;
outline: none;
background: #2c2c2c;
color: #fff;
}

.picker {
position: absolute;
bottom: 60px;
right: 10px;
width: 250px;
max-height: 300px;
overflow-y: auto;
background: #2a2a2a;
border-radius: 12px;
padding: 8px;
display: flex;
flex-wrap: wrap;
gap: 6px;
z-index: 10;
}

.emoji-item {
cursor: pointer;
width: 30px;
height: 30px;
display: inline-flex;
justify-content: center;
align-items: center;
font-size: 20px;
}
</style>
