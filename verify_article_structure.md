## 前言

为保障微信公众平台编辑器功能的一致性与稳定性，提升用户在内容创作的流畅体验，特制定本开发规范。所有公众平台编辑器的第三方开发者，均应尽量遵循本规范中关于**CSS属性**、**HTML文章结构**与**字体**使用的相关规定。

注：文中代码均可在编辑器中运行查看实际效果。

## 1、API 检测接口

### 接口用途
按照下文规则，验证文章内容结构，帮助第三方开发者快速识别模版缺陷。

### 接口 URL
http://mp.weixin.qq.com/article-bin/verify_article_structure

### 请求方式
POST

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| content | string | 是 | 需要验证的 HTML 字符串内容 |

### 请求示例
```json
{
  "content": "<html><body><div style='height: 0;'>Invisible Element</div></body></html>"
}
```

### 响应参数

| 参数名 | 类型 | 说明 |
|-------|------|------|
| isValid | Boolean | 表示验证结果。如果为 true，表示内容通过了验证；如果为 false，则表示存在问题 |
| inValidInfo | Object | 当 isValid 为 false 时，返回该字段，包含所有验证失败的详细信息 |

### inValidInfo(Object Payload)

| 属性名 | 类型 | 说明 |
|-------|------|------|
| height | Object | 包含与高度相关的违规信息 |
| width | Object | 包含与宽度相关的违规信息 |
| 其他 | Object | 其他验证规则 |

### 以width为例

#### witdh (Object Payload)

| 参数名 | 类型 | 说明 |
|-------|------|------|
| violateRules | String | 描述具体的违规规则，例如"页面height设置错误，导致有元素不可见" |
| items | Array | 列出所有与高度相关的违规元素。每个项都是一个对象 |

### items (Array of Object Payload)

| 参数名 | 类型 | 说明 |
|-------|------|------|
| outerHTML | String | 违规元素的完整 HTML 标记字符串 |

### 响应示例
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

### cURL 请求示例
以下为使用 cURL 命令发送请求的示例：
```js
curl -X POST http://mp.weixin.qq.com/article-bin/verify_article_structure \
     -H "Content-Type: application/json" \
     -d '{
          "content": "<div>test></div>"
        }'
```

### 注意事项
●请确保发送的 HTML 内容是有效的 HTML 格式。

●根据不同的属性（如 height、width）可能会返回多个验证规则，具体视 HTML 内容而定。



## 2、CSS 属性使用规范

以下CSS属性的不当使用，会直接影响编辑器的功能或文章的最终呈现，请在开发中严格规避。

### 2.1 opacity

**错误场景**：

将 `img` 标签的 `opacity` 设置为 0 ，并将带背景图的`SVG`叠在同一位置

**示例**：
```html
<section>
  <section style="line-height: 0;font-size: 0;height: 0;text-align: left;">
    <section style="display: inline-block;width:100%;transform-origin: top;">
      <span leaf="">
        <img src="https://mmbiz.qpic.cn/sz_mmbiz_png/WOsCxdtAXDtQWXtgKojxKdmZ4ic5UkzRMYqt9K5o6WmgwXQvAmkbnpfsicTglzzAhdjib7icSwVYS7WZiagJfUwDQVA/640?wx_fmt=png&amp;tp=webp&amp;wxfrom=10005&amp;wx_lazy=1#imgIndex=0" data-src="https://mmbiz.qpic.cn/sz_mmbiz_png/WOsCxdtAXDtQWXtgKojxKdmZ4ic5UkzRMYqt9K5o6WmgwXQvAmkbnpfsicTglzzAhdjib7icSwVYS7WZiagJfUwDQVA/640?wx_fmt=png#imgIndex=0" alt="图片" data-ratio="0.7388888888888889" data-type="png" data-w="1080" style="width: 676.996px !important; pointer-events: painted; vertical-align: top; opacity: 0; height: auto !important; visibility: visible !important;" data-imgqrcoded="1" contenteditable="false"><img class="ProseMirror-separator" alt="">
        <br class="ProseMirror-trailingBreak">
      </span>
    </section>
  </section>
  <section>
    <svg icopr="" opacity="1" style="transform: scale(1); display: inline-block; vertical-align: top; width: 100%; background-image: url(&quot;https://mmbiz.qpic.cn/sz_mmbiz_png/WOsCxdtAXDtQWXtgKojxKdmZ4ic5UkzRMYqt9K5o6WmgwXQvAmkbnpfsicTglzzAhdjib7icSwVYS7WZiagJfUwDQVA/640?wx_fmt=png&amp;tp=webp&amp;wxfrom=10015&amp;wx_lazy=1&quot;); background-size: 100% 100%; background-repeat: no-repeat; background-attachment: scroll; -webkit-tap-highlight-color: transparent; user-select: none;" viewBox="0 0 1080 798" data-lazy-bgimg="https://mmbiz.qpic.cn/sz_mmbiz_png/WOsCxdtAXDtQWXtgKojxKdmZ4ic5UkzRMYqt9K5o6WmgwXQvAmkbnpfsicTglzzAhdjib7icSwVYS7WZiagJfUwDQVA/640?wx_fmt=png" class="" role="img" aria-label="插图" data-fail="0"></svg>
  </section>
</section>

```

<table>
  <tr>
    <td width="50%" align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHk1eXcKZx9Waab30DnythidOM97Ejz0uqf0EXmt4jNTUkQBjBHfuuY0NV49Ea_4LGlA" width="300" height="200" style="object-fit: contain;" /></td>
    <td width="50%" align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHkzQlg46O2UErgiweqanLsKwFoLgBJ9LIZuMNSYXqCKAc6yasAD3J8SC7oc_1ZzyZmA" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

**影响说明**

导致发布后无法在公众号后台修改图片。因为实际显示的是`SVG`背景图，而公众号编辑器不支持修改`SVG`背景图。


### 2.2 caret-color

**错误场景**

将输入光标的颜色设置为完全透明

**示例**：
```css
caret-color: rgba(0, 0, 0, 0);
```

**影响说明**

光标在编辑器中不可见，导致作者无法确定当前的输入位置，影响编辑体验。

### 2.3 line-height

**错误场景**

容器设置了小于字体大小的 `line-height`，当存在多行文字时导致行与行之间重叠。

**示例**：

```html
<div class="problem-box" style="line-height: 0;border: 1px solid #ffa39e;padding: 10px;background-color: #fff;">
  这是第一行文字<br>
  这是第二行文字<br>
  这是第三行文字
</div>
```
**影响说明**

行高小于字体大小时，多行文字会重叠在一起，严重影响内容的可读性。

<table>
  <tr>
    <td width="50%" align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHk4TeBvDg1D8a4VQdzBb-yzxZ1-__ZMj2cT2boEIVxdVWt2BcyfT0jdF_0s3y_6E3wQ" width="300" height="200" style="object-fit: contain;" /></td>
    <td width="50%" align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHk6F9wPUQJzwz_MHY2OGdPH-J72w9eG6Qo2OsLO0ivL0ESfTdfSyXtF72DQNUBVWu-A" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

实际案例中 DOM 结构可能更为复杂，但根本原因均为行高过小导致文字重叠。

**排除场景**

1. 当行高过小用于图片无缝拼接时（即元素内部不含文字，仅包含图片等非文字元素），不视为违规。这是常见的排版技巧，用于消除图片之间的间隙。
2. **单行文字场景**：元素内部虽有文字，但实际渲染后仅为单行文本时，不会导致行与行之间的重叠，因此不视为违规。

```html
<!-- 以下不会触发违规：行高过小 + 内部无文字 -->
<section style="line-height: 0;">
  <img src="example.png" style="width: 100%; vertical-align: top;" />
</section>

<!-- 以下不会触发违规：行高过小 + 仅单行文字（不会产生重叠） -->
<section style="line-height: 0;">
  <span leaf="">单行文字</span>
</section>
```

### 2.4 width

**错误场景**

| 问题类型 | 表现 | 原因 |
|---|---|---|
| **居中布局不一致** | 同一段内容在不同屏幕下居中对齐状态不一致（如部分屏幕居中、部分屏幕居左） | 内容设置了固定宽度，当屏幕宽度大于该固定值时，内容不再居中 |
| **存在溢出问题** | 内容在部分屏幕下超出可视区域，部分内容被截断不可见 | 内容的左侧偏移或整体向右偏移过大，超出屏幕右侧边界 |
| **不同屏幕下宽度差异** | 同一段内容在不同屏幕下宽度差异大，且占屏幕比例不一致 | 内容设置了固定宽度，未随屏幕宽度自适应调整 |

---

#### 2.4.1 居中布局不一致

**错误场景**

同一段内容，在部分屏幕下呈现为居中对齐，在另一些屏幕下却变为左对齐或右对齐。常见原因是为内容设置了固定宽度，当屏幕宽度大于该固定值时，多余的空间将导致内容偏移至左侧。

**示例**

```html
<section style="border-style: solid;border-width: 1px;border-color: rgb(218, 29, 43);width: 586.438px;">
  <span style="letter-spacing: 0.8px; visibility: visible;">这是一个设置了固定宽度的段落。在宽屏上它会居左显示并留白，在窄屏上视觉呈现居中铺满。</span>
</section>
```

**影响说明**

固定宽度会破坏响应式布局，在不同尺寸屏幕下显示不一致。小屏幕可能刚好撑满，大屏幕则会留白并左对齐。

<table>
  <tr>
    <th width="50%" align="center">编辑器居中显示</th>
    <th width="50%" align="center">PC端居左显示</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHk_VpeIoedAUczUP8p2bySueZ5iMeXVtn7UxyxlU2dPnZwDNfmccjmQ6quqlLJ8JJpg" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHkwsqo9LGBnANyUXOCY0wOixOKXKqidGuwEQs9LHoGzd7eeiA2yBmchr-LMoN-kG_eA" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

---

#### 2.4.2 存在溢出问题

**错误场景**

内容在水平方向上超出屏幕边界，在手机上部分文字/图片将被屏幕边缘截断不可见。不仅限于宽度设置过大，内容的左侧缩进过大、整体向右偏移过多等情况，同样会导致内容超出屏幕右侧边界。

**示例**

```html
<!-- margin-left 导致段落整体右偏溢出 -->
<section style="margin-left: 294pt;">
  <span leaf="">这段文字会因为 margin-left 过大而超出屏幕右侧边界。</span>
</section>
```

```html
<!-- table 表头固定列宽超出容器 -->
<table>
  <thead>
    <th style="width: 200px;" data-colwidth="200">列1</th>
    <th style="width: 400px;" data-colwidth="400">列2</th>
  </thead>
  <!-- ... -->
</table>
```

**影响说明**

水平溢出将导致用户在移动端无法完整阅读——超出边界的内容将被截断。

**案例一：内容向左偏移导致超出屏幕左侧边界**

<table>
  <tr>
    <th width="50%" align="center">编辑器显示</th>
    <th width="50%" align="center">移动端显示</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/WpXz4JKn-PmRB4c4QpCe9IHxXYJ-DC7HhJUdIJqRyQy3LXv0uZJ9PkscAdqVwYnUziiqgzPdd9G1lX-VYmbGZw" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/WpXz4JKn-PmRB4c4QpCe9N41l7monb5EU3krHZ2nGfQhtxPuJr0J0pEq7Ms6hX_UTVPozhD0xuWgisZDB1tULw" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

**案例二：表格列宽固定宽屏正常、窄屏溢出**

<table>
  <tr>
    <th width="50%" align="center">大屏显示</th>
    <th width="50%" align="center">移动端显示</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/WpXz4JKn-PmRB4c4QpCe9KQ2_Gf94d_HyAFA8EKE8mkAbMflVPOVRcFA1jJhhgr8RLuvxN7pqxQBKiJDU3r4Ug" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/WpXz4JKn-PmRB4c4QpCe9EEABii7Gu0XNQdDRtwhPwkIQv3RqDhtIprckjL-LG8KSpl_g4o2fXaNq3w3wlOlmA" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

---

#### 2.4.3 不同屏幕下宽度差异

**错误场景**

同一段内容的宽度在不同屏幕下存在显著差异，且所占屏幕比例也不一致。原因通常为内容设置了固定宽度，未随屏幕宽度自适应调整。

**示例**

```html
<!-- 固定 width 在不同屏幕下都是 500px，导致占父容器的比例随屏幕变化而变化 -->
<section style="width: 500px;">
  <span leaf="">在 375px 屏幕上撑满甚至溢出，在 677px 屏幕上只占 74%。</span>
</section>
```

**影响说明**

不同屏幕下宽度比例不一致将导致排版在移动端、PC 端、小程序内呈现差异，影响作者预期的视觉效果。

<table>
  <tr>
    <th width="50%" align="center">编辑器显示</th>
    <th width="50%" align="center">移动端显示</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/wCMDedoKJ_uTB2EMqKKkhvQqasbkkZVqk7TdnEtFxpCg5KX_G8pCKaddTyokuOcUQ6wICkEj1Nri7tFjeXOllw" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/wCMDedoKJ_uTB2EMqKKkhvs-4cafps0S-hkbCdypIlypu-AWRyFSavVEXflkqqst6BIkGCe-nLdCMtkvgt85lQ" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

### 2.5 height

高度设置不当将导致文字内容在移动端不可见，分为以下两种场景。

#### 2.5.1 height:0

**错误场景**

容器设置 `height: 0`，导致其中的文字内容在移动端完全不可见。

**示例**：

``` html
<section>
  <section style="height: 0px;visibility: visible;"><section style="visibility: visible;">
    <section style="visibility: visible;">
      <p>
        <span leaf="">这是一段文字内容，由于外层容器设置了 height:0，在移动端将完全不可见。</span>
      </p>
    </section>
    </section>
  </section>
</section>

```
**影响说明**

当容器高度设置为0px时，在编辑器环境中由于设置了外层容器的最小高度，内容仍可显示。但在移动端设备上无此设置，将导致内容完全不可见，造成页面空白问题。

<table>
  <tr>
    <th width="50%" align="center">编辑器</th>
    <th width="50%" align="center">移动端</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/E9qS-cRr1mdHr60yRyQHkxQaSTapfoE7Ag9daooHlHRWESv2W4V1ogqtC5vs-lMKvOfBJH5_fGdtMzbKiJH4ww" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/g11aOZPetd9ZqnkrGAVep0PAYy0rwKut5oc4UQytpZGA5vbVNbGYXpgN2wNsPpMPCFOkGW0W8JB7QAjvCS_XzQ" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

**排除场景**

1. SVG 内部元素：`<svg>` 标签内部的子元素不检查 height
2. SVG 交互效果容器：`height: 0` 出现在 SVG 交互容器内时，不视为违规。这类场景中 `height: 0` 用于实现点击展开等交互效果
3. 无文字内容：如果 `height: 0` 元素内部不含文字（仅有图片等），不判定为违规

```html
<!-- 以下不会触发违规：SVG 交互容器内的 height:0 -->
<section data-role="absolute-layout" data-mode="svg" data-width="375" data-height="545" style="...">
  <section data-role="block" style="height: 0; ...">
    <!-- SVG 交互效果内容 -->
  </section>
</section>
```

#### 2.5.2 内容溢出容器

**错误场景**

父容器设置了固定高度（如 `height: 1px`、`height: 100px` 等），但其内部子元素的实际内容高度超过了容器高度，导致超出部分被裁剪不可见。

**示例**：

```html
<section style="height: 1px; overflow: hidden;">
  <section>
    <p>
      <span leaf="">这是一段很长的文字内容，由于父容器设置了很小的高度，超出部分将被截断不可见。</span>
    </p>
  </section>
</section>
```

**影响说明**

与「容器高度为0」直接将内容整体隐藏不同，本场景检测的是内容高度超出容器范围——超出部分被裁剪，其余部分仍可见。

**排除场景**

设置了滚动属性的容器（内容可滚动查看）不会触发此检测。

### 2.6 text-align

**错误场景**

设置`text-align` 为`start，end`

**错误示例**
``` html
<section style="text-align: center;">
   <span style="text-align: start;">看完了绚烂的灯光秀</span>
</section>
```
**影响说明**

不同终端对 `start` 值兼容性存在差异，造成部分设备文字居中、部分设备文字居左的不一致体验。


<table>
  <tr>
    <th width="50%" align="center">编辑器</th>
    <th width="50%" align="center">IOS 18+</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/g11aOZPetd9ZqnkrGAVepxNnYgjRpJmClnrMxCqkwGg75sPsECo2eC_hpbrMhp67Qcr4hLy0Rw7tq95WlQk6Ng" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/g11aOZPetd9ZqnkrGAVep71kn_3uxRuGGQIGeONOVPw9gbW3eBmNFuv9Euki98ajqRdqe50PUypvHBqfAwI8oA" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

### 2.7 begin

**错误场景**

设置`SVG`动画`animate`的`begin`属性时仅设置了`touchstart`

**错误示例**

``` html
<svg id="svg-example" viewBox="0 0 200 200">
  <circle id="animated-circle" cx="100" cy="100" r="40">
    <animate attributeName="fill" values="#3498db; #e74c3c; #3498db" dur="1s" begin="touchstart">
    </animate>
  </circle>
</svg>
```

**影响说明**

仅设置 `touchstart` 事件会导致`SVG`动画在PC端无法触发，因为PC端使用鼠标点击（`click`）事件而非触摸事件。需同时设置 `touchstart` 和 `click` 事件，确保跨平台兼容性，即`begin="touchstart; click"`

### 2.8 pre

**错误场景：** 使用 `<pre>` 标签包裹普通段落文本内容。

**错误示例：**

```html
<pre style="line-height: 1.75em; margin-bottom: 24px;">
  <span leaf="">
    <span textstyle="">这是一段普通的正文内容，不应该使用 pre 标签包裹。</span>
  </span>
</pre>
```

**影响说明：** `<pre>` 标签默认携带 `white-space: pre` 样式，文字不自动换行，在移动端窄屏下内容将被水平截断。

<table>
  <tr>
    <th width="50%" align="center">编辑器，正常显示</th>
    <th width="50%" align="center">移动端，文字溢出</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/TjbAnF0MPLQ9upy4yVA9_XSkaDeFn3i0sb6RGOG9UoyJ7xvQOekfZRGgUb2cu_SrZIFKwmpLRe1JfQPssj_GJA" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/vYBNXhIBmjTBJ8bdK-XCpRlxl4Te1X8Jtlj2qthOKFGYmCglalSzaYDlCqHi9gToS78sys-c5Md39Qzh3JYJdQ" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

**推荐做法：** 普通段落文本应使用 `<section>` 或 `<p>` 标签替代。


## 3、文章结构类
为保证文章DOM树的清晰与编辑器的解析性能，文章结构需遵循以下基本规则。不符合规则的结构会被编辑器自动删除。

### 3.1 嵌套层级限制

**规范要求**

排版中，同一标签名、同一内联样式、仅包含单个子节点的连续嵌套链路不应超过 10 层。超出此限制时，编辑器会自动精简冗余的嵌套层级。图片、视频、SVG 等媒体标签不受此限制。

**错误示例**
```html
<section>
  <section>
    <section>
      <section>
        <section>
          <section>
            <section>
              <section>
                <section>
                  <section><!-- 第10层，触发检测 -->
                    <section><!-- 同tagName，无新样式 → 会被删除 -->
                      <span>内容</span>
                    </section>
                  </section>
                </section>
              </section>
            </section>
          </section>
        </section>
      </section>
    </section>
  </section>
</section>
```

### 3.2 span[leaf] 节点规范

**规范要求**

`<span leaf>` 节点为行内容器，其内部只能包含行内元素（如 `span, strong, img` 等）或文本节点，严禁包裹任何块级元素（如 `section, div, p` 等）。
  
**错误示例**

```html
<span leaf>
  <section> 这是一个块级元素，禁止放入！ </section>
</span>
```
### 3.3 section[nodeleaf] 节点规范

**规范要求**

`<section nodeleaf>` 节点为特定功能容器，其内部只能包裹官方指定的特定组件或 `img` 图片元素。

**错误示例**

```html
<section nodeleaf>
  <section> 这个块级元素不允许放在这里 </section>
</section>
```

## 4、字体使用规范

**核心原则**：不建议设置任何字体族（`font-family`）。

公众号已设定一套经过充分优化的默认字体栈，旨在统一字体在创作端（编辑器） 与阅读端（iOS、安卓）一致的视觉体验。任何自定义字体设置都可能破坏此一致性。

**默认字体栈**
```
font-family: "mp-quote", PingFang SC, system-ui, -apple-system, BlinkMacSystemFont, Helvetica Neue, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif;
```

**错误示例**：
```html
<!-- 段落1：使用了一套字体栈 -->
<section style="font-family: 'mp-quote', 'system-ui', 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Helvetica, Arial, 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans CN', sans-serif;">
  第一段落：这段文字在编辑器里看起来正常。
</section>

<!-- 段落2：使用了另一套（官方默认）字体栈 -->
<section style="font-family: 'mp-quote', PingFang SC, system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Hiragino Sans GB, 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif">
  第二段落：这段文字在编辑器里看起来和第一段一样。
</section>
```

**效果与影响：**
| 环境        | 表现 |       
| :--------- | :--: |
| 公众号编辑器     |  两段文字视觉一致，无法察觉问题。  | 
| iOS 17+ 部分版本   |  两段文字因分别映射到 system-ui 和 PingFang SC 的同一字体不同版本，使得实际渲染后的文字大小和字间距上较为明显  | 


<table>
  <tr>
    <th width="50%" align="center">编辑器</th>
    <th width="50%" align="center">iOS 17+ 部分版本</th>
  </tr>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/g11aOZPetd9ZqnkrGAVep3XxMeO6Vuzb-PEJnQbJmy32j6np8B8ZYG6hDfQex8BKYEXD0hOidiu0VnViMfHHLQ" width="300" height="200" style="object-fit: contain;" /></td>
    <td align="center"><img src="https://res.wx.qq.com/op_res/g11aOZPetd9ZqnkrGAVepwkk8jdZjT4-7EhWaNJOzHttq-DLjkLSJGtuwtzlbM4ve0AEpDWOtDSV019WU7rWiA" width="300" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>


## 5、Dark Mode

微信公众平台 Dark Mode 转换算法秉承**尽可能保留原文信息**的原则（颜色亦为信息的一种，算法不会将红色转为橙色），仅当信息在 Dark Mode 下**难以辨识**（对比度不足）或**视觉不适**（亮度过高）时才进行调整。

因此，若创作内容排版调校得当，将在 Dark Mode 下获得更优的阅读体验——这也正是本规范的愿景。

以下将从「颜色」、「结构」、「图片」、「SVG」和「排版技巧与注意事项」五个维度逐一说明。

### 5.1 颜色

#### 5.1.1 使用对比度适中的颜色

尽管平台对颜色方面不作限制，但为确保文本在 Dark Mode 下保持清晰可读与视觉舒适，算法会检测文本与背景的对比度。若对比度过低或过高，将进行相应的平衡调整。

```HTML
<!-- 错误示例 -->
<div style="background-color: rgb(194, 43, 76); color: rgb(73, 68, 41);">文本与背景对比度较低，难以辨识</div>

<!-- 推荐示例 -->
<div style="background-color: rgb(194, 43, 76); color: rgb(73, 68, 41);">平台自动提高文本亮度，使其在 Dark Mode 下仍可清晰辨识</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/OrcPOrqCHUZIUCn-gvS_MAhnuABnAYRzNUjs-5eI0PSV6vp-oXOwqTfpfolK06xG08ONQ7_WURnuUYMHONO05g" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.1.2 如非必要，文字背景尽量不要使用渐变

渐变背景（如 `background-image: linear-gradient(rgb(248, 245, 247), rgb(194, 43, 76))`，表示从白色到红色的渐变）。若仅对渐变的起止两个颜色进行算法转换，无法保证渐变中间过程的颜色在 Dark Mode 下保持良好的阅读体验（例如渐变带有透明度且背后存在其他渐变色背景，或渐变上方有带渐变的文本，均可能导致文本失去可读性）。因此，算法会先对渐变进行 mix 混合计算，将渐变转换为纯色后再执行转换，以降低不确定性。

```HTML
<!-- 在 Dark Mode 下渐变背景会被转成纯色背景 -->
<div style="background-image: linear-gradient(rgb(248, 245, 247), rgb(194, 43, 76)); color: yellow;">文字背景为白到红的渐变色</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/OrcPOrqCHUZIUCn-gvS_MK0ZC1hZzoM_-SWicIWNAwYYnYEiW8BWftUEFwv6F_8HNMdv5sUHfTN-K0fR_jWpHA" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

以下问题案例同样由渐变引起：由于使用了渐变来实现格子背景，在 Dark Mode 下格子背景将无法呈现。

```HTML
<!-- 在 Dark Mode 下渐变格子背景会消失 -->
<div style="background-color: rgb(248, 251, 248); background-image: linear-gradient(rgba(180, 190, 185, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(180, 190, 185, 0.3) 1px, transparent 1px); background-size: 20px 20px; color: rgb(51, 51, 51);">有格子背景</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/OrcPOrqCHUZIUCn-gvS_MGb_4kfsuEBvlN8F5VahEcUibX1zQgepk9WuocfqYPaSSmdCystjKLBBrmIcMGI9Kw" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.1.3 纯背景可以使用渐变

渐变背景上方若无文字，算法将不对该渐变进行处理。

```HTML
<!-- 在 Dark Mode 下纯渐变背景会被保留 -->
<div style="background-image: linear-gradient(rgb(248, 245, 247), rgb(194, 43, 76));"><br></div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/OrcPOrqCHUZIUCn-gvS_MJA5WB30lpi3k2Gd3hpJQhdABcHm_Ur1crT-kph1ARpvD8bLZYrmznyO_07T77Db7Q" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

### 5.2 结构

#### 5.2.1 建议使用背景容器 + 多文本节点的结构

如果需要给多个文本添加同一个背景（背景颜色或渐变），建议将这些文本节点包裹在一个容器里，背景样式写到这个容器上，而非给每个文本节点添加相同的背景样式。这样既可以提高算法性能，减少重复计算，也可避免以下问题。

```HTML
<!-- 错误示例 -->
<div style="color: #191919;">
  <div style="background-image: -webkit-linear-gradient(left, rgb(238, 236, 225), rgb(146, 208, 80));">渐变样式写在文本节点上</div>
  <div style="background-image: -webkit-linear-gradient(left, rgb(238, 236, 225), rgb(146, 208, 80));"><br></div>
  <div style="background-image: -webkit-linear-gradient(left, rgb(238, 236, 225), rgb(146, 208, 80));">两个文本中间有一个没有文本的空结点</div>
</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-pl1ol1lX_YbO8-fMBfRXEGxOo29d5TNJT6AQl3-9jP5Tm6vAsi32qcIC8hIB4qUOw" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

推荐做法：将背景样式写在公共容器上。

```HTML
<!-- 推荐示例 -->
<div style="color: #191919; background-image: -webkit-linear-gradient(left, rgb(238, 236, 225), rgb(146, 208, 80));">
  <div>渐变样式写在容器上</div>
  <div><br></div>
  <div>两个文本中间有一个没有文本的空结点</div>
</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-lbWDwvPjSBNF2QDa9ZA-BFYT6x78qX25I5uhcBsQv4z7Xbfus4C9Q18HkMima9x_A" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.2.2 保持正确的嵌套关系

由于算法采用深度优先遍历（与视觉顺序一致——自上而下、从左至右），因此严禁使用绝对定位或变形等手段破坏视觉与结构顺序的一致性（如将结构上靠前的节点通过绝对定位移至后方，或将文本定位到没有从属关系的背景色区域）。

```HTML
<!-- 错误示例 -->
<div style="position: relative;">
  <div style="position: absolute; width: 100%; top: 0; left: 0; color: rgb(209, 167, 174);">绝对定位文本，和背景色节点没有嵌套关系</div>
  <div style="background-color: rgb(246, 212, 218);"><br></div>
  <div style="background-color: rgb(246, 212, 218);">
    <div style="color: rgb(209, 167, 174);">正确嵌套的文本</div>
  </div>
</div>

<!-- 推荐示例 -->
<div style="position: relative;">
  <div style="position: absolute; width: 100%; top: 0; left: 0; color: rgb(209, 167, 174);">绝对定位文本，无法看清 ❌</div>
  <div style="background-color: rgb(246, 212, 218);"><br></div>
  <div style="background-color: rgb(246, 212, 218);">
    <div style="color: rgb(209, 167, 174);">正确嵌套的文本，可清晰看见 ✅</div>
  </div>
</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-pMkv2EY5NEwb8VSdCTqvzvvP7Xma0A-vaue-tm-Xe4KhTZ6meYPNGLvTVPjW0Of7A" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

### 5.3 图片

#### 5.3.1 如非必要，不要使用图片来承载纯文本

出于对性能方面的考虑，算法目前没有对图片进行内容识别，因此无法提取图片中的文本做转换，并且也不建议使用图片来承载纯文本。

```HTML
<!-- 错误示例 -->
<img src="https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0uEgp0_O1rf6XIlaKJDcwz5uLkVMMhY0NIY1QDrpdTn4KBmzbno_Rr0fGyjkINKIcA">
<div>上面是一张白底图片，有一个浅蓝色文字"答"</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-naG0kTCUYaKcuxIofO6jM0l49u7rwkofPyUhm59dRFMd0wdqsXInc362SQDc74q1A" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.3.2 谨慎使用透明底色图片

创作过程中可能使用到透明底色图片，需注意：若图片中含有黑色系颜色，应确保在 Dark Mode 下与正文底色 `#191919` 保持足够的对比度，否则内容将难以辨识。

```HTML
<!-- 错误示例 -->
<img src="https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0r846GT72PhOS1V6xroBB18NDux7e2OnLqJY4NZOQBGcNK3PjiS4GykfmtNKIytvRA">
<div>上面是一张有"黑灰"两个字的透明底色图片</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-gX9wrx3UnmFPDQQZPTFkbFn0wEJgrrLGH0zI2EXJ6OXukmdVsKhlKqoEPncAFpoLA" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.3.3 背景图片的补色机制

此处特指**背景图片**（`background-image`，非 `<img>` 标签）。此外，背景图片上方的文字颜色在 Dark Mode 下将保留 Light Mode 原色。

部分创作者会在文字底部添加背景图片作为装饰（如条纹、网格）。当这些背景图片为透明底色时，可能导致文字无法阅读。为此，算法对背景图片引入了「补色」机制。

```HTML
<!-- 图片补色 -->
<div style="height: 60px; border: 1px solid #ccc; color: #191919; background-image: url('https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0s2g6U3GFpYzgQyhYK-Orj3-kANd6Mw1pFFZqgSOO8I6i4Shu7CIce27j8sR9n_9OA'); background-repeat: repeat; background-size: 46.5212%; background-position: 0% 0%;">文字下方有透明底色灰色条纹背景图片</div>
<div>关闭补色机制时的表现：</div>
<div style="height: 60px; border: 1px solid #ccc; color: #191919; background-image: url('https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0s2g6U3GFpYzgQyhYK-Orj3-kANd6Mw1pFFZqgSOO8I6i4Shu7CIce27j8sR9n_9OA'); background-repeat: repeat; background-size: 46.5212%; background-position: 0% 0%;">文字下方有透明底色灰色条纹背景图片</div>
<div>开启补色机制后的表现：</div>
<div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
  <div style="width: 80px; height: 20px; transform: rotateY(180deg); background-image: url('https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0spd1qMZfVjFkyvRaLOoR-0lnL7HWXkdCu4FLfVW8-DoJtPd4gGoXmpbS_5Kcv_tIw'); background-repeat: no-repeat; background-size: contain; background-position: 50% 50%;"></div>
  <div style="color: rgb(203, 160, 121);">两侧是透明底色背景图片</div>
  <div style="width: 80px; height: 20px; background-image: url('https://res.wx.qq.com/op_res/-RQUEx4qQYTKZjQJ6rwd0spd1qMZfVjFkyvRaLOoR-0lnL7HWXkdCu4FLfVW8-DoJtPd4gGoXmpbS_5Kcv_tIw'); background-repeat: no-repeat; background-size: contain; background-position: 50% 50%;"></div>
</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-tsobj6JpfQiZQbgr5wC_VLoeJFVqHoYAjK9VZfPRW6pU-X6P1zcZpoaA8vAn5EiIw" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

补色机制的具体实现细节（文字检测方式、补色策略等）此处不再展开。

### 5.4 SVG

#### 5.4.1 如非必要，不要使用图片来承载纯文本

算法目前不会对 SVG 进行处理，绝大部分 SVG 在 Dark Mode 下都和 Light Mode 表现一致。

但也因此，可能出现以下不兼容情况。

```HTML
<!-- SVG 不兼容示例 -->
<div>部分场景下，创作者通过 SVG 显示公式：</div>
<div>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -738.9 3084.7 1084.9" aria-hidden="true" style="vertical-align: -0.783ex;width: 6.979ex;height: 2.455ex;" role="img" aria-label="插图"><g stroke="black" fill="black" stroke-width="0" transform="matrix(1 0 0 -1 0 0)"><g data-mml-node="math"><g data-mml-node="mi"><path data-c="63" d="M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z"></path></g><g data-mml-node="mo" transform="translate(710.8, 0)"><path data-c="2208" d="M84 250Q84 372 166 450T360 539Q361 539 377 539T419 540T469 540H568Q583 532 583 520Q583 511 570 501L466 500Q355 499 329 494Q280 482 242 458T183 409T147 354T129 306T124 272V270H568Q583 262 583 250T568 230H124V228Q124 207 134 177T167 112T231 48T328 7Q355 1 466 0H570Q583 -10 583 -20Q583 -32 568 -40H471Q464 -40 446 -40T417 -41Q262 -41 172 45Q84 127 84 250Z"></path></g><g data-mml-node="msubsup" transform="translate(1655.6, 0)"><g data-mml-node="TeXAtom" data-mjx-texclass="ORD"><g data-mml-node="mi"><path data-c="5A" d="M39 -1Q29 9 29 12Q29 23 60 77T219 337L410 648H364Q261 648 210 628Q168 612 142 588T109 545T97 509T88 490Q85 489 80 489Q72 489 61 503L70 588Q72 607 75 628T79 662T81 675Q84 677 88 681Q90 683 341 683H592Q604 673 604 666Q604 662 412 348L221 37Q221 35 301 35Q406 35 446 48Q504 68 543 111T597 212Q602 239 617 239Q624 239 629 234T635 223Q635 215 621 113T604 8L597 1Q595 -1 317 -1H39ZM148 637L166 648H112V632Q111 629 110 622T108 612Q108 608 110 608T116 612T129 623T148 637ZM552 646Q552 648 504 648Q452 648 450 643Q448 639 266 343T77 37Q77 35 128 35H179L366 339L552 646ZM572 35Q581 89 581 97L561 77Q542 59 526 48L508 37L539 35H572Z"></path></g></g><g data-mml-node="TeXAtom" transform="translate(667, 410.1) scale(0.707)" data-mjx-texclass="ORD"><g data-mml-node="mo"><path data-c="2217" d="M229 286Q216 420 216 436Q216 454 240 464Q241 464 245 464T251 465Q263 464 273 456T283 436Q283 419 277 356T270 286L328 328Q384 369 389 372T399 375Q412 375 423 365T435 338Q435 325 425 315Q420 312 357 282T289 250L355 219L425 184Q434 175 434 161Q434 146 425 136T401 125Q393 125 383 131T328 171L270 213Q283 79 283 63Q283 53 276 44T250 35Q231 35 224 44T216 63Q216 80 222 143T229 213L171 171Q115 130 110 127Q106 124 100 124Q87 124 76 134T64 161Q64 166 64 169T67 175T72 181T81 188T94 195T113 204T138 215T170 230T210 250L74 315Q65 324 65 338Q65 353 74 363T98 374Q106 374 116 368T171 328L229 286Z"></path></g></g><g data-mml-node="TeXAtom" transform="translate(667, -338.3) scale(0.707)" data-mjx-texclass="ORD"><g data-mml-node="msup"><g data-mml-node="mi"><path data-c="6E" d="M21 287Q22 293 24 303T36 341T56 388T89 425T135 442Q171 442 195 424T225 390T231 369Q231 367 232 367L243 378Q304 442 382 442Q436 442 469 415T503 336T465 179T427 52Q427 26 444 26Q450 26 453 27Q482 32 505 65T540 145Q542 153 560 153Q580 153 580 145Q580 144 576 130Q568 101 554 73T508 17T439 -10Q392 -10 371 17T350 73Q350 92 386 193T423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 180T152 343Q153 348 153 366Q153 405 129 405Q91 405 66 305Q60 285 60 284Q58 278 41 278H27Q21 284 21 287Z"></path></g><g data-mml-node="TeXAtom" transform="translate(600, 363) scale(0.714)" data-mjx-texclass="ORD"><g data-mml-node="mn"><path data-c="32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"></path></g></g></g></g></g></g></g></svg>
</div>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-qtCt0vaXfhgC06_1qxYCt60klUbj5ZsQyCDoIbQ-MLkZYR-FmikK_Un3Tjxn2E_wQ" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

为规避上述问题，可指定 `stroke="currentColor" fill="currentColor"`，或添加底色。

### 5.5 排版技巧 & 注意事项

#### 5.5.1 指定节点跳过算法转换

可以使用 `data-no-dark` 属性来指定当前节点跳过算法转换，但仅针对当前节点生效，其后代节点如果有内联样式，依然会进行算法转换。

```HTML
<ul style="color: #000;" data-no-dark>
  <li>这是黑色字体</li>
  <li style="color: #000;">这也是黑色字体，但是有style="color: #000;"</li>
</ul>
```

<table>
  <tr>
    <td align="center"><img src="https://res.wx.qq.com/op_res/coOfx8lhv5jNDzvOHXSt-sRyP9sdreDpNCJhXpHoloep8fJhSWBUYQSdtG7aXoSgNeBrj0JrNhgbBKotEINY3g" width="600" height="200" style="object-fit: contain;" /></td>
  </tr>
</table>

#### 5.5.2 不要使用 `!important`

无论何种场景，平台均不建议创作者在排版时使用 `!important`，这会使平台添加的公共样式失效，同时 Dark Mode 算法也需搭配 `!important` 来实现样式覆盖。

本规范将持续更新，请开发者密切关注最新版本，确保插件功能与平台标准保持一致。

