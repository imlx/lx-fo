<template>
  <div
    ref="canvasContainerRef"
    :class="$props.class"
    aria-hidden="true"
    style="width: 100%; height: 100%;"
  >
    <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
  </div>
</template>

<script setup lang="ts">
import { useMouse, useDevicePixelRatio } from "@vueuse/core";
import { ref, onMounted, onBeforeUnmount, watch, computed, reactive } from "vue";

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
  color?: string; // 特殊颜色
};

type Props = {
  color?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  class?: string;
  specialColors?: {
    fluorescentGreen?: number;
    fluorescentYellow?: number;
    lightBlue?: number;
  };
};

const props = withDefaults(defineProps<Props>(), {
  color: "#FFF",
  quantity: 10,
  staticity: 50, // 参照demo文件，调整为50
  ease: 50, // 参照demo文件，调整为50
  class: "",
  specialColors: () => ({
    fluorescentGreen: 0,
    fluorescentYellow: 0,
    lightBlue: 3,
  }),
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContainerRef = ref<HTMLDivElement | null>(null);
const context = ref<CanvasRenderingContext2D | null>(null);
const circles = ref<Circle[]>([]);
const mouse = reactive<{ x: number; y: number }>({ x: 0, y: 0 });
const canvasSize = reactive<{ w: number; h: number }>({ w: 0, h: 0 });
const { x: mouseX, y: mouseY } = useMouse();
const { pixelRatio } = useDevicePixelRatio();

const color = computed(() => {
  // Remove the leading '#' if it's present
  let hex = props.color.replace(/^#/, "");

  // If the hex code is 3 characters, expand it to 6 characters
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  // Parse the r, g, b values from the hex string
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255; // Extract the red component
  const g = (bigint >> 8) & 255; // Extract the green component
  const b = bigint & 255; // Extract the blue component

  // Return the RGB values as a string separated by spaces
  return `${r} ${g} ${b}`;
});

onMounted(() => {
  if (canvasRef.value) {
    context.value = canvasRef.value.getContext("2d");
  }

  initCanvas();
  animate();
  window.addEventListener("resize", initCanvas);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", initCanvas);
});

watch([mouseX, mouseY], () => {
  onMouseMove();
});

function initCanvas() {
  resizeCanvas();
  drawParticles();
}

function onMouseMove() {
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const { w, h } = canvasSize;
    const x = mouseX.value - rect.left - w / 2;
    const y = mouseY.value - rect.top - h / 2;

    // 移除 inside 检查，让鼠标在任何位置都能影响粒子
    mouse.x = x;
    mouse.y = y;
  }
}

function resizeCanvas() {
  if (canvasContainerRef.value && canvasRef.value && context.value) {
    circles.value.length = 0;
    
    // 获取容器的实际尺寸
    const containerRect = canvasContainerRef.value.getBoundingClientRect();
    canvasSize.w = containerRect.width || canvasContainerRef.value.offsetWidth;
    canvasSize.h = containerRect.height || canvasContainerRef.value.offsetHeight;
    
    // 如果容器尺寸为0，使用视窗尺寸
    if (canvasSize.w === 0 || canvasSize.h === 0) {
      canvasSize.w = window.innerWidth;
      canvasSize.h = window.innerHeight;
    }
    
    canvasRef.value.width = canvasSize.w * pixelRatio.value;
    canvasRef.value.height = canvasSize.h * pixelRatio.value;
    canvasRef.value.style.width = canvasSize.w + "px";
    canvasRef.value.style.height = canvasSize.h + "px";
    context.value.scale(pixelRatio.value, pixelRatio.value);
    
    console.log('Canvas resized:', { width: canvasSize.w, height: canvasSize.h });
  }
}

function circleParams(index: number): Circle {
  const x = Math.floor(Math.random() * canvasSize.w);
  const y = Math.floor(Math.random() * canvasSize.h);
  const translateX = 0;
  const translateY = 0;
  const size = Math.floor(Math.random() * 2) + 1;
  const alpha = 0;
  const targetAlpha = parseFloat((Math.random() * 0.8 + 0.2).toFixed(1));
  const dx = (Math.random() - 0.5) * 0.2; // 参照demo文件，调整为0.2
  const dy = (Math.random() - 0.5) * 0.2; // 参照demo文件，调整为0.2
  const magnetism = 0.1 + Math.random() * 4; // 参照demo文件，调整为0.1+随机4
  
  // 添加特殊颜色粒子
  let color: string | undefined;
  const fluorescentGreenCount = props.specialColors?.fluorescentGreen || 0;
  const fluorescentYellowCount = props.specialColors?.fluorescentYellow || 0;
  const lightBlueCount = props.specialColors?.lightBlue || 0;
  
  if (index < fluorescentGreenCount) {
    color = "#39FF14"; // 荧光绿
  } else if (index < fluorescentGreenCount + fluorescentYellowCount) {
    color = "#FFD700"; // 荧光黄
  } else if (index < fluorescentGreenCount + fluorescentYellowCount + lightBlueCount) {
    color = "#87CEFA"; // 淡蓝色
  }
  
  return {
    x,
    y,
    translateX,
    translateY,
    size,
    alpha,
    targetAlpha,
    dx,
    dy,
    magnetism,
    color,
  };
}

function drawCircle(circle: Circle, update = false) {
  if (context.value) {
    const { x, y, translateX, translateY, size, alpha, color: circleColor } = circle;
    context.value.translate(translateX, translateY);
    context.value.beginPath();
    context.value.arc(x, y, size, 0, 2 * Math.PI);
    
    // 使用特殊颜色或默认颜色
    let fillColor: string;
    if (circleColor) {
      // 将十六进制颜色转换为RGB
      let hex = circleColor.replace(/^#/, "");
      if (hex.length === 3) {
        hex = hex.split("").map(char => char + char).join("");
      }
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      fillColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      fillColor = `rgba(${color.value.split(" ").join(", ")}, ${alpha})`;
    }
    
    context.value.fillStyle = fillColor;
    context.value.fill();
    context.value.setTransform(pixelRatio.value, 0, 0, pixelRatio.value, 0, 0);

    if (!update) {
      circles.value.push(circle);
    }
  }
}

function clearContext() {
  if (context.value) {
    context.value.clearRect(0, 0, canvasSize.w, canvasSize.h);
  }
}

function drawParticles() {
  clearContext();
  const particleCount = props.quantity;
  for (let i = 0; i < particleCount; i++) {
    const circle = circleParams(i);
    drawCircle(circle);
  }
}

function remapValue(
  value: number,
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): number {
  const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
  return remapped > 0 ? remapped : 0;
}

function animate() {
  clearContext();
  circles.value.forEach((circle, i) => {
    // Handle the alpha value
    const edge = [
      circle.x + circle.translateX - circle.size, // distance from left edge
      canvasSize.w - circle.x - circle.translateX - circle.size, // distance from right edge
      circle.y + circle.translateY - circle.size, // distance from top edge
      canvasSize.h - circle.y - circle.translateY - circle.size, // distance from bottom edge
    ];

    const closestEdge = edge.reduce((a, b) => Math.min(a, b));
    const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

    if (remapClosestEdge > 1) {
      circle.alpha += 0.02;
      if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
    } else {
      circle.alpha = circle.targetAlpha * remapClosestEdge;
    }

    circle.x += circle.dx;
    circle.y += circle.dy;
    circle.translateX +=
      (mouse.x / (props.staticity / circle.magnetism) - circle.translateX) / props.ease;
    circle.translateY +=
      (mouse.y / (props.staticity / circle.magnetism) - circle.translateY) / props.ease;

    // circle gets out of the canvas
    if (
      circle.x < -circle.size ||
      circle.x > canvasSize.w + circle.size ||
      circle.y < -circle.size ||
      circle.y > canvasSize.h + circle.size
    ) {
      // remove the circle from the array
      circles.value.splice(i, 1);
      // create a new circle
      const newCircle = circleParams(circles.value.length);
      drawCircle(newCircle);
      // update the circle position
    } else {
      drawCircle(
        {
          ...circle,
          x: circle.x,
          y: circle.y,
          translateX: circle.translateX,
          translateY: circle.translateY,
          alpha: circle.alpha,
        },
        true,
      );
    }
  });
  window.requestAnimationFrame(animate);
}
</script>

<style scoped>
/* 确保容器和 canvas 充满整个区域 */
div {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>