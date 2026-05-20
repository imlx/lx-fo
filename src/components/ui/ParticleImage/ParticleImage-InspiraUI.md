继续为您补齐关于 `ParticleImage` 组件的 API 介绍部分。这通常是组件文档中非常重要的一部分，它详细说明了组件的所有可配置属性（Props）。

---

# Inspira UI: Particle Image 特效组件安装与API指南

`Particle Image` 是 Inspira UI 提供的一个特殊效果组件，它能够让图像以粒子效果的形式展示，提供独特的视觉体验。

## 安装方式

本指南将介绍如何手动安装 `Particle Image` 组件。

### 1. 安装核心依赖

首先，您需要安装 Inspira UI 的核心库，它是运行 `Particle Image` 组件的基础。

```bash
npm install @inspira-ui/react
# 或者
yarn add @inspira-ui/react
```

### 2. 安装 Particle Image 组件

接下来，安装 `Particle Image` 组件本身。

```bash
npm install @inspira-ui/particle-image
# 或者
yarn add @inspira-ui/particle-image
```

### 3. 使用示例

安装完成后，您可以在您的 React 应用中导入并使用 `Particle Image` 组件。

```jsx
import React from 'react';
import { ParticleImage } from '@inspira-ui/particle-image';

function MyComponent() {
  return (
    <div>
      <h1>我的粒子图像示例</h1>
      <ParticleImage
        src="path/to/your/image.jpg" // 替换为您的图片路径
        width={300}
        height={200}
        // 更多可选配置项，参考下方API介绍
      />
    </div>
  );
}

export default MyComponent;
```

**图片示例:**

这里是一个粒子图像效果的示例图：

`
## API 介绍 (Props)

`ParticleImage` 组件接受以下属性（Props）以自定义其行为和外观：

| 属性名     | 类型            | 默认值 | 描述                                                                  |
| :--------- | :-------------- | :----- | :-------------------------------------------------------------------- |
| `src`      | `string`        | 无     | **必填**。要转换为粒子效果的图片路径。                                |
| `width`    | `number`        | 无     | **必填**。粒子图像渲染的宽度 (像素)。                                 |
| `height`   | `number`        | 无     | **必填**。粒子图像渲染的高度 (像素)。                                 |
| `particleSize` | `number` | `1` | 单个粒子的大小 (像素)。                                               |
| `gap`      | `number`        | `1`    | 粒子之间的间距 (像素)。较大的值会导致粒子更稀疏。                   |
| `maxParticles` | `number` | 无     | 渲染的最大粒子数量。如果图片像素过多，可以通过此属性限制粒子数量。  |
| `color`    | `string` \| `(pixelColor: string) => string` | `null` | 粒子颜色。可以是CSS颜色字符串，或一个函数，根据原始像素颜色返回新的颜色。 |
| `alpha`    | `number`        | `1`    | 粒子的透明度 (0-1)。                                                  |
| `interactive` | `boolean` | `true` | 是否允许鼠标交互，例如鼠标悬停时粒子移动或变形。                      |
| `mouseForce` | `number` | `30` | 鼠标交互时对粒子的推力强度。                                        |
| `hoverMode` | `string`        | `'repel'` | 鼠标悬停时的模式，例如 `'repel'` (排斥) 或 `'attract'` (吸引)。       |
| `clickMode` | `string`        | `'push'` | 鼠标点击时的模式，例如 `'push'` (推动) 或 `'bubble'` (气泡)。         |
| `duration` | `number`        | `1000` | 动画持续时间 (毫秒)，例如粒子入场或交互后的恢复时间。                 |
| `easing`   | `string`        | `'linear'` | 动画缓动函数。                                                        |
| `onLoad`   | `() => void`    | `null` | 图片加载完成并粒子化后触发的回调函数。                                |
| `onError`  | `(error: Error) => void` | `null` | 图片加载或粒子化过程中发生错误时触发的回调函数。                      |

**注意：** 上述API列表是基于常见的粒子效果库和组件可能提供的属性推断的。具体属性名称、类型、默认值以及支持的功能，请务必以 `inspira-ui.com` 官方文档为准。

## 其他注意事项

*   **图片路径:** 确保 `src` 属性指向的图片路径是正确的。
*   **性能考量:** 渲染大量粒子可能会影响性能。适当地调整 `particleSize`、`gap` 和 `maxParticles` 可以优化性能。
*   **CSS 样式:** 您可能需要为组件添加适当的 CSS 样式以确保其正确显示和布局。

---

**请注意：** 由于我无法直接访问该页面，以上内容是根据常见的文档结构和组件安装流程以及粒子特效库的API设计推断的。具体内容可能与实际页面有所出入。强烈建议您访问原始链接 `https://inspira-ui.com/docs/components/special-effects/particle-image#install-manually` 以获取最准确和详细的信息。