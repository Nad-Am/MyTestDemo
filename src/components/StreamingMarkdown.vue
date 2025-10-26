<template>
  <div ref="container" class="markdown-body">
    <div ref="fixedSection"></div>
    <div ref="livePreview" class="live-preview"></div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common' // 包含常见语言
import 'highlight.js/styles/github.css'
// import markdownItKatex from 'markdown-it-katex'
import katex from 'katex';
import 'katex/dist/katex.min.css'


const container = ref(null)
const fixedSection = ref(null)
const livePreview = ref(null)

let buffer = ''
let renderTimeout = null

const md = new MarkdownIt({
  html: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
    }
    const auto = hljs.highlightAuto(code)
    return `<pre class="hljs"><code>${auto.value}</code></pre>`
  }
})

/**
 * 从 buffer 中提取“完整可渲染片段（段落或完整 code-fence）”并返回剩余未完成部分
 *
 * 算法：
 *  - 在 buffer 中按顺序查找 fence（```）
 *  - 对 fence 之外的部分按 \n{2,} 分段（段落）
 *  - 对找到的完整 fence 对，作为一个整体加入 segments
 *  - 如果遇到未闭合 fence，后半部分全部作为 remaining（不进行 paragraph split）
 */
function extractSegmentsFromBuffer(input) {
  const segments = []
  let i = 0
  const len = input.length

  while (i < len) {
    const nextFence = input.indexOf('```', i)
    if (nextFence === -1) {
      // buffer 中没有更多 fence：把剩下的 outside 部分按段落分割
      const outside = input.slice(i)
      if (!outside) {
        return { segments, remaining: '' }
      }
      const parts = outside.split(/\n{2,}/)
      for (let p = 0; p < parts.length - 1; p++) {
        let part = parts[p]
        
        if (part.trim()) segments.push(part + '\n\n')
      }
      return { segments, remaining: parts[parts.length - 1] || '' }
    }

    // 有 fence，先处理 fence 之前的 outside 部分
    const outsideBefore = input.slice(i, nextFence)
    if (outsideBefore) {
      const parts = outsideBefore.split(/\n{2,}/)
      for (let p = 0; p < parts.length - 1; p++) {
        const part = parts[p]
        if (part.trim()) segments.push(part + '\n\n')
      }
      // 最后一部分（可能是未结束段落）保存在 segments 之前的位置：
      const trailing = parts[parts.length - 1] || ''
      if (trailing) {
        // we don't immediately push trailing, because it might be followed by a code fence; keep it as part of the next flow
        segments.push(trailing) // we'll normalize below: if a code fence follows, we'll join; else we'll already be safe
      }
    }

    // 从 fence 开始，寻找闭合 fence
    const openIndex = nextFence
    const closeIndex = input.indexOf('```', openIndex + 3)
    if (closeIndex === -1) {
      // 未找到闭合 fence：把从 openIndex 到结尾作为 remaining
      // 但如果我们之前向 segments push 了一个 trailing （非空字符串），把它去掉（它应该与这个未闭合 fence 一起保留）
      // 构建 remaining 从 trailing start:
      const remaining = input.slice(openIndex)
      // 如果之前 segments 最后一个是 trailing（没有 \n\n 末尾），把它和 remaining 合并
      // 为简单稳健，我们直接把 segments 中可能的最后项合并到 remaining（若它看起来像 trailing）
      if (segments.length > 0) {
        const last = segments[segments.length - 1]
        if (typeof last === 'string' && !last.endsWith('\n\n') && !last.startsWith('```')) {
          // merge and pop
          segments.pop()
          return { segments, remaining: last + remaining }
        }
      }
      return { segments, remaining }
    } else {
      // 找到闭合 fence：把从 openIndex 到 closeIndex + 3 当作完整 code block
      // 但注意此前可能 push 了 trailing（不以 \n\n 结尾） —— 把它与 code block 合并
      let codeBlockStart = openIndex
      // 如果 segments 最后一个是 trailing（非段落），合并它作为 codeBlock 的前缀
      if (segments.length > 0) {
        const last = segments[segments.length - 1]
        if (typeof last === 'string' && !last.endsWith('\n\n') && !last.startsWith('```')) {
          // trailing exists
          codeBlockStart -= last.length
          // pop trailing and later we will slice from codeBlockStart
          segments.pop()
        }
      }
      const fullBlock = input.slice(codeBlockStart, closeIndex + 3)
      segments.push(fullBlock)
      i = closeIndex + 3
      // 继续循环
    }
  }

  return { segments, remaining: '' }
}

// --- 3. 定义手动 KaTeX 渲染函数 ---
function renderKaTeX(htmlString) {
    // 块级公式：$$...$$
    htmlString = htmlString.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        try {
            // 使用 KaTeX 渲染，并包裹在 <p> 中，以保持块级元素的布局
            return '<p>' + katex.renderToString(formula.trim(), {
                displayMode: true,
                throwOnError: false
            }) + '</p>';
        } catch (e) {
            return `<p style="color:red;">KaTeX Block Error: ${e.message}</p>`;
        }
    });

    // 行内公式：$...$
    // 注意：这里的正则需要避免匹配到 Markdown-it 转义后的 $ 符号
    htmlString = htmlString.replace(/\$([^$\s]+?)\$/g, (match, formula) => {
        // 简单检查以避免误伤 HTML 标签
        if (formula.includes('<') || formula.includes('>')) return match; 
        
        try {
            return katex.renderToString(formula.trim(), {
                displayMode: false,
                throwOnError: false
            });
        } catch (e) {
            return `<span style="color:red;">KaTeX Inline Error: ${e.message}</span>`;
        }
    });

    return htmlString;
}

/**
 * 渲染 buffer 中已完成的 segments，并把剩余放回 buffer
 */
function renderBuffered() {
  const { segments, remaining } = extractSegmentsFromBuffer(buffer)

  // 渲染片段到 fixedSection
 // 渲染片段到 fixedSection
  for (let part of segments) {
      if (!part || !part.trim()) continue
      
      // 1. **预处理**：将 [\ ... \] 转换为 $$ ... $$ (保持不变)
      part = part.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_, expr) => `$$\n${expr}\n$$`)
      console.log('Preprocessed part:', part);
      // 2. **Markdown 解析**：转换为原始 HTML (包含未渲染的 $...$)
      let html = md.render(part)
      
      // 3. **KaTeX 渲染**：手动调用 renderKaTeX 将 $...$ 替换为 KaTeX HTML
      html = renderKaTeX(html) 

      // 4. **安全清理**：清理并允许 KaTeX/MathML 标签
      const safeHtml = DOMPurify.sanitize(html, {
          ADD_TAGS: ['span', 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mord', 'mfrac', 'msub', 'msup', 'msubsup', 'mi', 'mo', 'mn', 'mspace', 'mstyle', 'mtext'], // 扩展 KaTeX/MathML 所需标签
          ADD_ATTR: ['class', 'style', 'data-mathml'] // KaTeX 使用 class 和 style
      })

      fixedSection.value.insertAdjacentHTML('beforeend', safeHtml)
  }

  // 移除 fixedSection 中重复标记（如果你希望 reset 标记，也可选择移除 dataset.highlighted）
  nextTick(() => {
    // 只对还未高亮过的 pre.hljs 元素进行高亮
    const preBlocks = fixedSection.value.querySelectorAll('pre.hljs')
    Array.from(preBlocks).forEach(pre => {
      // highlight.js 会在元素上设置 dataset.highlighted（或 data-highlighted）
      if (!pre.dataset.highlighted) {
        try {
          hljs.highlightElement(pre)
        } catch (e) {
          // 安全捕获：如果语言没被注册，hljs 会报错，忽略以免中断渲染
          // 你也可以在这里根据 e 做语言注册或 fallback
          console.warn('highlight failed', e)
        }
      }
    })
  })

  // livePreview 显示 remaining（未闭合或未完成部分）
  nextTick(() => {
    if (!livePreview.value) return
    // livePreview.value.innerHTML = DOMPurify.sanitize(md.render(remaining))
    livePreview.value.innerHTML = DOMPurify.sanitize(md.render(remaining), {
      ADD_TAGS: ['span', 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn'],
      ADD_ATTR: ['class', 'style']
    })
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  })

  buffer = remaining
}

/**
 * 外部追加流式 chunk
 */
function appendChunk(chunk) {
  buffer += chunk
  clearTimeout(renderTimeout)
  // 小延迟以合并多次小 chunk（可调）
  renderTimeout = setTimeout(() => renderBuffered(), 25)
}

/**
 * 清空内容（并移除任何标记）
 */
function clearContent() {
  buffer = ''
  if (fixedSection.value) {
    // 移除 data-highlighted 标记，避免残留
    const pres = fixedSection.value.querySelectorAll('pre.hljs')
    Array.from(pres).forEach(p => p.removeAttribute('data-highlighted'))
    fixedSection.value.innerHTML = ''
  }
  if (livePreview.value) {
    livePreview.value.innerHTML = ''
  }
}

defineExpose({ appendChunk, clearContent })
</script>

<style scoped>
.markdown-body {
  overflow-y: auto;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  height: 100vh;
  font-size: 15px;
  line-height: 1.6;
}
.live-preview {
  opacity: 0.7;
  border-left: 2px solid #ddd;
  padding-left: 8px;
  margin-top: 8px;
}
pre.hljs {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
</style>
