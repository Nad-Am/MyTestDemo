<template>
  <div class="container">
    <textarea 
      id="markdown-input" 
      placeholder="在这里输入 Markdown + 公式"
      v-model="markdownInput"
    ></textarea>
    
    <div id="markdown-preview" class="preview" v-html="sanitizedHtml"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 📚 只导入三个核心依赖
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import katex from 'katex'; 

// 🎯 关键修正：导入 KaTeX 样式表 (这是公式渲染的关键)
import 'katex/dist/katex.min.css'; 

// 声明响应式状态
const markdownInput = ref('');
const md = ref(null); 

const defaultMarkdown = `
# 实时 Markdown 渲染 Demo

## 1. 数学公式 (KaTeX)
行内公式：爱因斯坦的质能方程是 $E = mc^2$。

块级公式：
$$
\\frac{\\partial u}{\\partial t} = D \\nabla^2 u + R(u)
$$

## 2. 代码块 (无高亮)
\`\`\`javascript
function greet() {
    // 这是一个没有高亮的代码块
    const message = "Hello, world!";
    console.log(message);
}
\`\`\`
`;

/**
 * 手动 KaTeX 渲染函数 (替换 markdown-it-katex 插件)
 * @param {string} html - 待处理的 HTML 字符串 (由 markdown-it 转换得到)
 * @returns {string} - 处理后的 HTML 字符串
 */
const renderKaTeX = (html) => {
    // 1. 匹配块级公式：$$...$$
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        try {
            return '<p>' + katex.renderToString(formula.trim(), {
                displayMode: true,
                throwOnError: false
            }) + '</p>';
        } catch (e) {
            return `<p style="color:red;">KaTeX Block Error: ${e.message}</p>`;
        }
    });

    // 2. 匹配行内公式：$...$
    html = html.replace(/\$([^$\s]+?)\$/g, (match, formula) => {
         try {
            return katex.renderToString(formula.trim(), {
                displayMode: false,
                throwOnError: false
            });
        } catch (e) {
            return `<span style="color:red;">KaTeX Inline Error: ${e.message}</span>`;
        }
    });

    return html;
};


// 核心渲染逻辑：Markdown -> HTML -> KaTeX -> Purify
const renderedHtml = computed(() => {
    if (!md.value) return ''; 
    
    // 1. Markdown 转换为 HTML
    let dirtyHtml = md.value.render(markdownInput.value); 

    // 2. 手动进行 KaTeX 渲染
    dirtyHtml = renderKaTeX(dirtyHtml);
    
    return dirtyHtml;
});

// 安全清理 HTML
const sanitizedHtml = computed(() => {
    // 3. DOMPurify 清理 HTML
    return DOMPurify.sanitize(renderedHtml.value);
});


// 生命周期钩子：组件挂载时进行初始化
onMounted(() => {
    // 1. 初始化 markdown-it，不带任何依赖选项
    md.value = new MarkdownIt({
        html: true, 
        linkify: true,
    });
    
    // 2. 设置默认内容
    markdownInput.value = defaultMarkdown.trim();
});
</script>

<style scoped>
/* 样式与原 HTML 保持一致 */
/* ... (样式代码与上一个 Vue 组件保持一致，此处省略) ... */
.container {
    display: flex;
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
    height: calc(100vh - 40px);
}

textarea,
.preview {
    flex: 1;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow-y: auto;
}

textarea {
    font-family: monospace;
    font-size: 14px;
    resize: none;
}

.preview {
    background-color: #fff;
    line-height: 1.6;
    word-wrap: break-word;
}

/* 代码块样式 */
.preview pre {
    padding: 1rem;
    border-radius: 6px;
    background-color: #f6f8fa;
    overflow-x: auto;
}
</style>