<template>
  <img
    ref="imageParticleRef"
    :src="imageSrc"
    :class="cn('invisible absolute overflow-hidden', $props.class)"
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
    style="visibility: hidden; position: absolute;"
  />
</template>

<script lang="ts" setup>
import { cn } from '@/lib/utils'
import {
  inspiraImageParticles,
  type InspiraImageParticle as ImageParticle,
} from './inspiraImageParticles'
import { ref, onUnmounted } from 'vue'

type ParticleImageProps = {
  imageSrc: string
  class?: string
  canvasWidth?: string
  canvasHeight?: string
  gravity?: string
  particleSize?: string
  particleGap?: string
  mouseForce?: string
  renderer?: 'default' | 'webgl'
  color?: string
  colorArr?: number[]
  initPosition?: 'random' | 'top' | 'left' | 'bottom' | 'right' | 'misplaced' | 'none'
  initDirection?: 'random' | 'top' | 'left' | 'bottom' | 'right' | 'none'
  fadePosition?: 'explode' | 'top' | 'left' | 'bottom' | 'right' | 'random' | 'none'
  fadeDirection?: 'random' | 'top' | 'left' | 'bottom' | 'right' | 'none'
  noise?: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
}

defineProps<ParticleImageProps>()

let particles: ImageParticle | null = null
const imageParticleRef = ref<HTMLImageElement>()

const onImageLoad = () => {
  if (!imageParticleRef.value) {
    console.warn('[ParticleImage] Image reference is null')
    return
  }

  // 检查图片是否有有效的尺寸
  const { naturalWidth, naturalHeight } = imageParticleRef.value
  if (naturalWidth === 0 || naturalHeight === 0) {
    console.warn('[ParticleImage] Image has zero dimensions, skipping initialization')
    return
  }

  const { InspiraImageParticle } = inspiraImageParticles()
  particles = new InspiraImageParticle(imageParticleRef.value)
  particles.start()
}

onUnmounted(() => {
  if (particles) {
    console.log('[ParticleImage] Stopping particle animation')
    particles.stop()
    particles = null
  }
})
</script>
