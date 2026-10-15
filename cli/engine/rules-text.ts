// Product rule descriptions referencing verify_article_structure.md.

export const propertyRules: Record<string, string> = {
  'font-family': '当前内容使用了自定义字体，移动端可能未预装该字体，实际显示效果可能与预览不一致，请核实（参考文档 #3、字体使用规范）',
  'opacity': '该图片 opacity 值为 0（完全透明），移动端可能无法正常显示，且发布后无法通过后台替换，请确认是否符合预期（参考文档 #1.1 opacity）',
  'caret-color': '光标颜色（caret-color）被设置为透明，可能导致编辑时无法定位光标位置，请确认是否符合预期（参考文档 #1.2 caret-color）',
  'line-height': '当前内容行高（line-height）过小，多行文本可能存在重叠，请核实阅读效果是否正常（参考文档 #1.3 line-height）',
  'text-align': '文本对齐属性使用了 start 或 end，不同终端解析可能存在差异，请核实各端显示是否一致（参考文档 #1.6 text-align）',
  'height': '该容器 height 值为 0，可能导致移动端内容显示异常或不可见，请核实是否符合预期（参考文档 #1.5.1 height:0）',
  'width': '当前内容存在特殊排版，可能在不同屏幕下出现居中不一致、宽度差异或溢出问题，请核实显示是否正常（参考文档 #1.4 width）',
  'animate-begin': '该动画 begin 包含 touchstart 触摸事件，但未包含 click 点击事件，PC 端可能无法通过鼠标触发播放，请确认交互是否符合预期（参考文档 #1.7 begin）',
  'height-nodisplay': '内容实际高度超出容器设定的 height 限制，溢出部分可能在移动端被裁切，请核实显示是否正常（参考文档 #1.5.2 内容溢出容器）',
  'line-height-overlapping': '行间距（line-height）设置较小，多行文本可能存在重叠，请核实阅读效果是否正常（参考文档 #1.3 line-height）',
  'nest-level': '当前内容 DOM 嵌套层级较深，存在冗余的重复嵌套结构，可能影响渲染表现，请核实（参考文档 #2.1 嵌套层级限制）',
  // Reserved copy: this rule has no spec chapter or CLI implementation yet.
  'redundant-node': '当前内容存在大量空白子节点（子节点数 > 20 且空节点数 > 15），这些冗余空节点会被编辑器自动删除，请核实是否符合预期',
  'node-leaf': '组件容器（section[nodeleaf]）内部结构可能不符合规范，该容器仅允许包含官方指定的特定组件或 img 图片元素，请核实（参考文档 #2.3 section[nodeleaf] 节点规范）',
  'span-leaf': '行内容器（span[leaf]）中检测到块级子元素，该容器仅允许包含文本或行内元素（如 span、strong、链接及行内图片等），请核实结构是否正确（参考文档 #2.2 span[leaf] 节点规范）',
  'pre': '当前 pre 标签内的内容超出容器宽度，且未启用横向滚动，移动端可能无法完整阅读，请核实显示是否正常（参考文档 #1.8 pre 标签）',
  'darkmode-low-contrast': '文字与背景色对比度太低（参考文档#4.1.1使用对比度适中的颜色）',
  'darkmode-no-gradient': '文字背景尽量不要使用渐变（参考文档#4.1.2如非必要，文字背景尽量不要使用渐变）'
};

export const WIDTH_DETAIL_RULES: Record<string, string> = {
  '居中布局不一致': '当前元素在不同屏幕宽度下居中状态不一致（部分屏幕居中、部分不居中），通常由固定 px 宽度或外边距偏移引起，移动端显示效果可能与编辑器预览不一致，请核实（参考文档 #1.4.1 居中布局不一致）',
  '存在溢出问题': '当前元素宽度超出容器边界，移动端可能出现水平滚动或内容被裁切，常见原因包括固定宽度过大、margin/padding 偏移、transform 位移等，请核实显示是否正常（参考文档 #1.4.2 存在溢出问题）',
  '不同屏幕下宽度差异': '当前元素在不同屏幕宽度下渲染宽度差异较大，且占父容器的比例也不一致，通常由固定 px 宽度未做响应式适配引起，请核实显示是否正常（参考文档 #1.4.3 不同屏幕下宽度差异）'
};
