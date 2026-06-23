# 从零理解 RAG 检索增强生成

> 一篇用 `deploy_markdown` 一键发布的技术文章示例。

检索增强生成（Retrieval-Augmented Generation, **RAG**）把「检索」与「生成」结合，让大模型在回答前先查资料，从而减少幻觉、引用最新知识。

## 为什么需要 RAG

大模型的知识冻结在训练时刻，且无法记住私有数据。RAG 通过外挂知识库解决这两点：

1. 把文档切块、向量化，存入向量库
2. 用户提问时，先检索最相关的若干块
3. 把检索结果拼进提示词，再交给模型生成

## 核心流程

```python
def rag(question: str) -> str:
    chunks = vector_store.search(embed(question), top_k=5)
    context = "\n\n".join(c.text for c in chunks)
    prompt = f"参考资料：\n{context}\n\n问题：{question}"
    return llm.generate(prompt)
```

## 检索策略对比

| 策略 | 召回率 | 延迟 | 适用场景 |
|------|--------|------|----------|
| 纯向量检索 | 中 | 低 | 语义相似问答 |
| 关键词 + 向量混合 | 高 | 中 | 专业术语密集 |
| 重排序（rerank） | 最高 | 高 | 对准确率要求极高 |

## 常见坑

- [x] 切块太大 → 检索噪声多
- [x] 切块太小 → 上下文割裂
- [ ] 忘记给检索结果标注来源，无法溯源

---

延伸阅读：把这篇文章发布后，可以再用 `deploy_docs` 把整个系列组织成文档站。
