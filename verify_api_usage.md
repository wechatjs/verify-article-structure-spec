# 校验接口

## 接口用途

按照规范规则验证文章内容结构，帮助第三方开发者快速识别模版缺陷。

## 接口 URL

http://mp.weixin.qq.com/article-bin/verify_article_structure

## 请求方式

POST

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| content | string | 是 | 需要验证的 HTML 字符串内容 |

## 请求示例

```json
{
  "content": "<html><body><div style='height: 0;'>Invisible Element</div></body></html>"
}
```

## 响应参数

| 参数名 | 类型 | 说明 |
|-------|------|------|
| isValid | Boolean | 表示验证结果。如果为 true，表示内容通过了验证；如果为 false，则表示存在问题 |
| inValidInfo | Object | 当 isValid 为 false 时，返回该字段，包含所有验证失败的详细信息 |

## inValidInfo(Object Payload)

| 属性名 | 类型 | 说明 |
|-------|------|------|
| height | Object | 包含与高度相关的违规信息 |
| width | Object | 包含与宽度相关的违规信息 |
| 其他 | Object | 其他验证规则 |

## 以 width 为例

### width (Object Payload)

| 参数名 | 类型 | 说明 |
|-------|------|------|
| violateRules | String | 描述具体的违规规则，例如"页面height设置错误，导致有元素不可见" |
| items | Array | 列出所有与高度相关的违规元素。每个项都是一个对象 |

## items (Array of Object Payload)

| 参数名 | 类型 | 说明 |
|-------|------|------|
| outerHTML | String | 违规元素的完整 HTML 标记字符串 |

## 响应示例

```json
{
  "isValid": false,
  "inValidInfo": {
    "height": {
      "violateRules": "页面height设置错误，导致有元素不可见",
      "items": [
        {
          "outerHTML": "<div style='height: 0;'>Invisible Element</div>"
        }
      ]
    }
  }
}
```

## cURL 请求示例

以下为使用 cURL 命令发送请求的示例：

```js
curl -X POST http://mp.weixin.qq.com/article-bin/verify_article_structure \
     -H "Content-Type: application/json" \
     -d '{
          "content": "<div>test></div>"
        }'
```

## 注意事项

请确保发送的 HTML 内容是有效的 HTML 格式。

根据不同的属性（如 height、width）可能会返回多个验证规则，具体视 HTML 内容而定。
