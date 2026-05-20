<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <!-- 路由视图 -->
    <router-view />
  </div>
</template>

<style>
.app-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
</style>
