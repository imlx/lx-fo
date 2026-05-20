<template>
  <ClientOnly>
    <MorphingText :texts="texts" />
  </ClientOnly>
</template>

<script lang="ts" setup>
import MorphingText from '@/components/ui/MorphingText.vue';
const texts = [
  "Hello",
  "Morphing",
  "Text",
  "Animation",
  "Vue",
  "Component",
  "Smooth",
  "Transition",
  "Engaging",
];
</script>

<style></style>