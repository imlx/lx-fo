<template>
  <img
    ref="imageParticleRef"
    :src="imageSrc"
    :class="cn('invisible absolute w-0 h-0 overflow-hidden', $props.class)"
    :data-particle-gap="particleGap"
    :data-width="canvasWidth"
    :data-height="canvasHeight"
    :data-gravity="gravity"
    :data-particle-size="particleSize"
    :data-mouse-force="mouseForce"
    :data-renderer="renderer"
    :data-color="color"
    :data-color-arr="colorArr"
    :data-init-position="initPosition"
    :data-init-direction="initDirection"
    :data-fade-position="fadePosition"
    :data-fade-direction="fadeDirection"
    :data-noise="noise"
    :data-responsive-width="responsiveWidth"
    :data-responsive-height="responsiveHeight"
    @load="onImageLoad"
    style="visibility: hidden; position: absolute; width: 0; height: 0;"
  />
</template>

<script lang="ts" setup>
import { cn } from "@/lib/utils";
import {
  inspiraImageParticles,
  type InspiraImageParticle as ImageParticle,
} from "./inspiraImageParticles";
import { ref, onMounted } from "vue";

type ParticleImageProps = {
  imageSrc: string;
  class?: string;
  canvasWidth?: string;
  canvasHeight?: string;
  gravity?: string;
  particleSize?: string;
  particleGap?: string;
  mouseForce?: string;
  renderer?: "default" | "webgl";
  color?: string;
  colorArr?: number[];
  initPosition?: "random" | "top" | "left" | "bottom" | "right" | "misplaced" | "none";
  initDirection?: "random" | "top" | "left" | "bottom" | "right" | "none";
  fadePosition?: "explode" | "top" | "left" | "bottom" | "right" | "random" | "none";
  fadeDirection?: "random" | "top" | "left" | "bottom" | "right" | "none";
  noise?: number;
  responsiveWidth?: boolean;
  responsiveHeight?: boolean;
};

defineProps<ParticleImageProps>();

let particles: ImageParticle;
const imageParticleRef = ref<HTMLImageElement>();

const onImageLoad = () => {
  const { InspiraImageParticle } = inspiraImageParticles();
  particles = new InspiraImageParticle(imageParticleRef.value);
  
  // 确保图片元素完全不可见
  if (imageParticleRef.value) {
    imageParticleRef.value.style.visibility = 'hidden';
    imageParticleRef.value.style.position = 'absolute';
    imageParticleRef.value.style.width = '0';
    imageParticleRef.value.style.height = '0';
    imageParticleRef.value.style.overflow = 'hidden';
  }
  
  // 启动粒子效果
  particles.start();
};

onMounted(() => {
  // 不在这里初始化，等待图像加载完成
});
</script>