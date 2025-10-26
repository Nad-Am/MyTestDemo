const YOUR_API_KEY = import.meta.env.VITE_YOUR_API_KEY;

const fetchAI = async (callback) => {
  const payload = {
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hi, 输出数学中很难的公式" },
    ],
    model: "deepseek-chat",
    stream: true,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${YOUR_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const getchunk = () => {
    reader.read().then(({ done, value }) => {
      if (done) return;

      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 保留最后可能残缺的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") {
          console.log("✅ 流结束");
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed?.choices?.[0]?.delta?.content;
          // console.log(delta);
          if (delta) callback(delta);
        } catch (err) {
          // 解析失败很可能是半条 JSON，安全忽略
        }
      }
      getchunk();
    });
  };
  getchunk();
  // while (true) {
  //   const { done, value } = await reader.read();
  //   if (done) break;

  //   buffer += decoder.decode(value, { stream: true });

  //   // 按行分割
  //   const lines = buffer.split("\n");
  //   buffer = lines.pop(); // 保留最后可能残缺的行

  //   for (const line of lines) {
  //     const trimmed = line.trim();
  //     if (!trimmed || !trimmed.startsWith("data:")) continue;

  //     const jsonStr = trimmed.slice(5).trim();
  //     if (jsonStr === "[DONE]") {
  //       console.log("✅ 流结束");
  //       return;
  //     }

  //     try {
  //       const parsed = JSON.parse(jsonStr);
  //       const delta = parsed?.choices?.[0]?.delta?.content;
  //       if (delta) callback(delta);
  //     } catch (err) {
  //       // 解析失败很可能是半条 JSON，安全忽略
  //     }
  //   }
  // }

  // 尝试解析残留的最后一行
  //   if (buffer.trim().startsWith("data:")) {
  //     const jsonStr = buffer.trim().slice(5).trim();
  //     try {
  //       const parsed = JSON.parse(jsonStr);
  //       const delta = parsed?.choices?.[0]?.delta?.content;
  //       if (delta) callback(delta);
  //     } catch {}
  //   }
};

export default fetchAI;
