<template>
  <div 
    v-show="visible"
    ref="voiceWaveRef"
    class="voice-wave"
    :class="{ active: isActive }"
    :style="{ 
      '--wave-height': `${waveHeight}px`,
      'transform': `translateX(${mouseX}px) translateY(${mouseY}px)`
    }"
  >
    <div v-for="i in particleCount" :key="i" class="wave-line"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

type Props = {
  isActive?: boolean;
  waveHeight?: number;
  particleCount?: number;
  visible?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  waveHeight: 6,
  particleCount: 20,
  visible: true,
});

const emit = defineEmits<{
  (e: 'update:waveHeight', value: number): void;
}>();

// 添加鼠标位置响应式变量
const mouseX = ref(0);
const mouseY = ref(0);
const targetMouseX = ref(0);
const targetMouseY = ref(0);
const voiceWaveRef = ref<HTMLDivElement | null>(null);

// 添加缓动系数，模仿粒子背景的效果
const staticity = 30;
const ease = 40;
const magnetism = 3;

// 添加鼠标移动事件处理
const handleMouseMove = (e: MouseEvent) => {
  if (voiceWaveRef.value) {
    const rect = voiceWaveRef.value.getBoundingClientRect();
    // 计算鼠标相对于声浪容器中心的位置
    const x = (e.clientX - rect.left - rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2);
    
    // 应用类似粒子背景的磁力效果，但减弱效果使移动更加微妙
    targetMouseX.value = (x / (staticity / magnetism)) / 10;
    targetMouseY.value = (y / (staticity / magnetism)) / 10;
  }
};

// 添加窗口resize事件处理
const handleResize = () => {
  targetMouseX.value = 0;
  targetMouseY.value = 0;
  mouseX.value = 0;
  mouseY.value = 0;
};

// 添加动画循环实现缓动效果，模仿粒子背景的实现方式
const animate = () => {
  // 使用类似粒子背景的缓动函数
  mouseX.value += (targetMouseX.value - mouseX.value) / (ease / 8);
  mouseY.value += (targetMouseY.value - mouseY.value) / (ease / 8);
  
  requestAnimationFrame(animate);
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  // 启动动画循环
  animate();
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="less">
.voice-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  height: var(--wave-height, 6px);

  .wave-line {
    width: 3px;
    background: linear-gradient(180deg,
            rgba(128, 128, 128, 0.8) 0%,
            rgba(169, 169, 169, 0.6) 100%);
    border-radius: 4px;
    height: 3px;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.active .wave-line {
    animation: voice-wave 1s ease-in-out infinite;
    will-change: height, opacity;

    /* 给每个线条不同的动画延迟，创造波浪效果 */
    &:nth-child(1) {
      animation-delay: -0.4s;
    }

    &:nth-child(2) {
      animation-delay: -0.3s;
    }

    &:nth-child(3) {
      animation-delay: -0.2s;
    }

    &:nth-child(4) {
      animation-delay: -0.1s;
    }

    &:nth-child(5) {
      animation-delay: 0s;
    }

    &:nth-child(6) {
      animation-delay: -0.1s;
    }

    &:nth-child(7) {
      animation-delay: -0.2s;
    }

    &:nth-child(8) {
      animation-delay: -0.3s;
    }

    &:nth-child(9) {
      animation-delay: -0.4s;
    }

    &:nth-child(10) {
      animation-delay: -0.5s;
    }
    
    /* 为新增的声浪线条添加动画延迟 */
    &:nth-child(11) {
      animation-delay: -0.6s;
    }

    &:nth-child(12) {
      animation-delay: -0.7s;
    }

    &:nth-child(13) {
      animation-delay: -0.8s;
    }

    &:nth-child(14) {
      animation-delay: -0.9s;
    }

    &:nth-child(15) {
      animation-delay: -1.0s;
    }

    &:nth-child(16) {
      animation-delay: -1.1s;
    }

    &:nth-child(17) {
      animation-delay: -1.2s;
    }

    &:nth-child(18) {
      animation-delay: -1.3s;
    }

    &:nth-child(19) {
      animation-delay: -1.4s;
    }

    &:nth-child(20) {
      animation-delay: -1.5s;
    }
  }
}

@keyframes voice-wave {
  0% {
    height: 2px;
    opacity: 0.6;
  }

  50% {
    height: var(--wave-height, 6px);
    opacity: 0.8;
  }

  100% {
    height: 2px;
    opacity: 0.6;
  }
}
</style>