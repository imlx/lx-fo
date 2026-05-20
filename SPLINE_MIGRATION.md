# Spline 3D 组件移植说明

## 📁 文件结构

```
lx-webui/
├── src/components/ui/
│   ├── Spline.vue          # Spline 3D 组件
│   ├── ParentSize.vue      # 自适应容器组件
│   ├── ParticlesBg.vue     # 粒子背景组件
│   └── index.ts            # 组件导出
├── public/spline/
│   ├── scene.splinecode    # Spline 3D 场景文件
│   └── process.wasm        # WebAssembly 运行时
└── public/
    ├── test-spline.html    # Spline 组件测试页面
    └── test-particles.html # 粒子背景测试页面
```

## 🎯 集成效果

在 VoiceCall 语音通话界面中，现在包含了多层视觉效果：

1. **底层**: 渐变背景 (`linear-gradient`)
2. **Spline 3D 层**: 3D 场景动画 (z-index: 0)
3. **粒子层**: 动态粒子背景 (z-index: 1) 
4. **遮罩层**: 径向渐变遮罩 (z-index: 2)
5. **内容层**: 用户界面元素 (z-index: 3)

## 🔧 技术特性

### Spline 3D 组件
- ✅ 基于 `@splinetool/runtime`
- ✅ 自动尺寸调整和响应式
- ✅ 支持 IntersectionObserver 优化
- ✅ 事件系统 (鼠标、键盘、场景事件)
- ✅ 加载状态指示器
- ✅ 错误处理机制

### 视觉效果优化
- 🎨 **模糊效果**: `filter: blur(1px)` 让 3D 效果更自然
- 🎭 **遮罩效果**: 径向渐变遮罩让边缘自然融入
- 🔄 **位置调整**: 扩大显示区域，底部向上偏移
- 💫 **透明度控制**: `opacity: 0.4` 保持背景感

## 🚀 使用方法

### 基础使用
```vue
<template>
  <Spline 
    scene="/spline/scene.splinecode"
    :render-on-demand="false"
    @spline-start="onSceneLoaded"
    @error="onError"
  />
</template>

<script setup>
import { Spline } from '@/components/ui'

function onSceneLoaded() {
  console.log('🎮 Spline 场景加载完成')
}

function onError(err) {
  console.error('❌ Spline 加载失败:', err)
}
</script>
```

### 高级配置
```vue
<Spline 
  scene="/path/to/scene.splinecode"
  :render-on-demand="true"
  :style="{ width: '100%', height: '400px' }"
  @spline-mouse-down="onMouseDown"
  @spline-mouse-hover="onMouseHover"
>
  <!-- 自定义加载状态 -->
  <div class="custom-loading">
    Loading 3D Scene...
  </div>
</Spline>
```

## 📋 依赖项

### 新增依赖
```json
{
  "dependencies": {
    "@splinetool/runtime": "^1.x.x",
    "@vueuse/core": "^11.x.x",
    "clsx": "^2.x.x"
  },
  "devDependencies": {
    "@types/resize-observer-browser": "^0.1.x"
  }
}
```

### 静态资源
- `public/spline/scene.splinecode` - 3D 场景文件 (1.3MB)
- `public/spline/process.wasm` - WASM 运行时 (495KB)

## 🧪 测试页面

### Spline 测试页面
访问: `http://localhost:5174/test-spline.html`
- 验证 Spline 资源加载
- 检查 WebAssembly 运行时
- 控制台调试信息

### 粒子背景测试页面  
访问: `http://localhost:5174/test-particles.html`
- 验证粒子背景渲染
- 检查全屏覆盖效果

## 🎨 样式层级

```css
.phone-call-container {
  /* Spline 3D 层 - 最底层 */
  .spline-layer { z-index: 0; opacity: 0.4; }
  
  /* 粒子背景层 */
  .particles-layer { z-index: 1; opacity: 0.8; }
  
  /* 渐变遮罩层 */
  .gradient-overlay { z-index: 2; }
  
  /* 内容层 - 最顶层 */
  .content-layer { z-index: 3; }
}
```

## 🔍 调试信息

在开发者控制台中查看以下日志：
- `🎮 Spline scene loaded successfully` - 场景加载成功
- `❌ Spline load error:` - 加载错误信息
- `Canvas resized: {width: xxx, height: xxx}` - 画布尺寸调整

## 💡 优化建议

1. **性能优化**:
   - 在不需要时启用 `render-on-demand`
   - 使用 IntersectionObserver 避免离屏渲染

2. **体验优化**:
   - 预加载 WASM 文件
   - 提供有意义的加载状态
   - 处理网络错误和超时

3. **视觉效果**:
   - 调整透明度匹配整体设计
   - 使用 CSS filter 创建特殊效果
   - 考虑响应式断点调整

## 🌟 移植完成

✅ Spline 3D 组件已成功移植到 lx-webui  
✅ 静态资源已正确复制到 public 目录  
✅ 与粒子背景完美融合  
✅ 保持语音通话功能完整性  
✅ 提供现代化科技感的视觉体验