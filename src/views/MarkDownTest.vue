<template>
  <div ref="markdown" class="markdown">
    
  </div>
</template>

<script lang="ts" setup>
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 或者其它主题，例如 'atom-one-dark.css'

import { onMounted, ref } from 'vue';

const markdown = ref<HTMLElement | null>(null);

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight (code, lang) {
    if(hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  }
});


const str = "## 5. ES6 箭头函数版本\n\n```javascript\nconst curry = (fn) => {\n  const curried = (...args) => {\n\n    return args.length >= fn.length\n      ? fn(...args)\n      : (...nextArgs) => curried(...args, ...nextArgs);\n  };\n  return curried;\n};\n```\n\n## 主要特点：\n\n1. **参数收集**：可以一次传入多个参数，也可以分多次传入\n2. **自动判断**：当参数数量足够时自动执行原函数\n3. **灵活性**：支持各种调用方式";
const str1 = "## 使用示例\n\n```javascript\n// 原始函数\nfunction add(a, b, c) {\n    return a + b + c;\n}\n\n// 柯里化版本\nconst curriedAdd = curry(add);\n\n// 使用方式\nconsole.log(curriedAdd(1)(2)(3)); // 6\nconsole.log(curriedAdd(1, 2)(3)); // 6\nconsole.log(curriedAdd(1)(2, 3)); // 6\nconsole.log(curriedAdd(1, 2, 3)); // 6\n```";




onMounted(() => {
  if (markdown.value) {
    markdown.value.innerHTML = md.render(str + str1);
  }
});

</script>

<style>

</style>