<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { ChatState, ChatEvent } from '@/types/chat';
import type { VoiceAnimationManager } from '@/services/VoiceAnimationManager';
import type { ChatStateManager } from '@/services/ChatStateManager';
import ParticlesBg from '@/components/ui/ParticlesBg.vue';
import Spline from '@/components/ui/Spline.vue';
import VoiceWave from '@/components/ui/VoiceWave.vue';
import ParticleImage from '@/components/ui/ParticleImage/ParticleImage.vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
    isVisible: boolean;
    voiceAnimationManager: VoiceAnimationManager;
    chatStateManager: ChatStateManager;
    isMuted?: boolean;
}>();

// 存储AI和用户消息列表
const aiMessages = ref<{text: string, displayedChars: {char: string, clarity: number}[], isTyping: boolean, isFadingOut?: boolean}[]>([]);
const userMessages = ref<string[]>([]);

// 对话区域可见性控制
const isChatAreaVisible = ref(true);
const isChatAreaFading = ref(false);
let chatAreaTimer: number | null = null;

// 语音状态监听
const isUserSpeaking = ref(false);
const isAiSpeaking = ref(false);

// 当前聊天状态 - 使用计算属性获取，绕过 computed 响应式问题
const currentChatState = computed(() => props.chatStateManager.getState());

// 打字机效果相关变量
const typingSpeed = 50; // 打字速度（毫秒/字符）
const claritySpeed = 10; // 清晰度变化速度（毫秒/帧）
let typingTimer: number | null = null;
let clarityTimer: number | null = null;

// 更新AI消息的方法 - 累积AI的回复内容，并添加模糊到清晰的打字机效果
const updateAIMessage = (message: string) => {
  if (message.trim()) {
    // 清除之前的打字机效果
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    if (clarityTimer) {
      clearInterval(clarityTimer);
      clarityTimer = null;
    }
    
    // 添加新消息，开始时为空
    aiMessages.value.push({
      text: message,
      displayedChars: [],
      isTyping: true,
      isFadingOut: false
    });
    
    // 检查消息数量，如果超过3条，开始淡出最早的消息
    if (aiMessages.value.length > 3) {
      fadeOutMessage(0);
    }
    
    // 开始打字机效果
    const messageIndex = aiMessages.value.length - 1;
    startTypewriterEffect(messageIndex);
    
    // 开始清晰度更新
    startClarityEffect();
  }
};

// 淡出消息的方法
const fadeOutMessage = (index: number) => {
  if (index < 0 || index >= aiMessages.value.length) return;
  
  // 标记消息为淡出状态
  aiMessages.value[index].isFadingOut = true;
  
  // 设置定时器，在淡出动画完成后移除消息
  setTimeout(() => {
    aiMessages.value.splice(index, 1);
  }, 500); // 与淡出动画时间一致
};

// 打字机效果实现
const startTypewriterEffect = (messageIndex: number) => {
  if (messageIndex < 0 || messageIndex >= aiMessages.value.length) return;
  
  const message = aiMessages.value[messageIndex];
  let charIndex = 0;
  
  // 获取文本中的所有字符（包括表情符号等复合字符）
  const chars = Array.from(message.text);
  
  const typeNextChar = () => {
    if (charIndex < chars.length) {
      // 添加新字符，初始清晰度为0（完全模糊）
      message.displayedChars.push({
        char: chars[charIndex],
        clarity: 0
      });
      charIndex++;
      
      // 继续下一个字符
      typingTimer = setTimeout(typeNextChar, typingSpeed);
    } else {
      // 打字完成
      message.isTyping = false;
      typingTimer = null;
    }
  };
  
  // 开始打字
  typeNextChar();
};

// 清晰度效果实现
const startClarityEffect = () => {
  clarityTimer = setInterval(() => {
    let allClear = true;
    
    // 更新所有消息中所有字符的清晰度
    aiMessages.value.forEach(message => {
      message.displayedChars.forEach(charObj => {
        if (charObj.clarity < 1) {
          charObj.clarity = Math.min(1, charObj.clarity + 0.05);
          allClear = false;
        }
      });
    });
    
    // 如果所有字符都清晰了，停止定时器
    if (allClear && clarityTimer) {
      clearInterval(clarityTimer);
      clarityTimer = null;
    }
  }, claritySpeed);
};

// 更新用户消息的方法
const updateUserMessage = (message: string) => {
  if (message.trim()) {
    userMessages.value = [message]; // 用户消息每次都是新的，替换之前的
  }
};

// 清空消息的方法
const clearMessages = () => {
  // 清除打字机效果定时器
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  
  // 清除清晰度效果定时器
  if (clarityTimer) {
    clearInterval(clarityTimer);
    clarityTimer = null;
  }
  
  // 清除对话区域定时器
  if (chatAreaTimer) {
    clearTimeout(chatAreaTimer);
    chatAreaTimer = null;
  }
  
  aiMessages.value = [];
  userMessages.value = [];
  // 不再自动设置对话区域为可见状态
  
  console.log("[VoiceCall] All messages cleared");
};

// 重置对话区域可见性定时器
const resetChatAreaTimer = () => {
  // 显示对话区域
  isChatAreaVisible.value = true;
  isChatAreaFading.value = false;
  
  // 清除之前的定时器
  if (chatAreaTimer) {
    clearTimeout(chatAreaTimer);
    chatAreaTimer = null;
  }
  
  // 移除8秒后自动消散消息的逻辑
  console.log("[VoiceCall] Chat area timer reset, auto fade out disabled");
};

// 逐条消散消息
const startSequentialFadeOut = () => {
  // 获取所有消息元素的总数
  const totalMessages = userMessages.value.length + aiMessages.value.length;
  
  if (totalMessages === 0) {
    // 如果没有消息，直接隐藏对话区域
    isChatAreaVisible.value = false;
    return;
  }
  
  // 先标记所有消息为开始消散状态
  userMessages.value.forEach((_, index) => {
    setTimeout(() => {
      // 用户消息逐条消散
      fadeOutMessageByType('user', index);
    }, index * 800); // 每条消息间隔800ms
  });
  
  aiMessages.value.forEach((_, index) => {
    setTimeout(() => {
      // AI消息逐条消散
      fadeOutMessageByType('ai', index);
    }, (userMessages.value.length + index) * 800); // 在用户消息之后开始消散
  });
  
  // 所有消息消散完成后，隐藏对话区域
  setTimeout(() => {
    console.log("[VoiceCall] All messages faded out, hiding chat area");
    isChatAreaVisible.value = false;
    // 不再清空消息，只隐藏对话区域
  }, totalMessages * 800 + 1500); // 最后一条消息消散后1.5秒隐藏对话区域
};

// 单条消息消散（按类型）
const fadeOutMessageByType = (type: 'user' | 'ai', index: number) => {
  if (type === 'user') {
    // 用户消息消散
    const messageElement = document.querySelector(`.user-message:nth-child(${index + 1})`);
    if (messageElement) {
      messageElement.classList.add('fade-out-single');
    }
  } else {
    // AI消息消散
    const messageElement = document.querySelector(`.ai-message:nth-child(${userMessages.value.length + index + 1})`);
    if (messageElement) {
      messageElement.classList.add('fade-out-single');
    }
  }
};

// 处理语音状态变化
const handleVoiceStateChange = () => {
  console.log("[VoiceCall] Voice state changed - User speaking:", isUserSpeaking.value, "AI speaking:", isAiSpeaking.value);
  
  // 如果用户或AI正在说话，显示对话区域
  if (isUserSpeaking.value || isAiSpeaking.value) {
    console.log("[VoiceCall] User or AI is speaking, showing chat area");
    isChatAreaVisible.value = true;
    isChatAreaFading.value = false;
    
    // 清除之前的定时器
    if (chatAreaTimer) {
      clearTimeout(chatAreaTimer);
      chatAreaTimer = null;
    }
  } else {
    // 用户和AI都不在说话，不再设置自动消散定时器
    console.log("[VoiceCall] Neither user nor AI is speaking, auto fade out disabled");
  }
};

const emit = defineEmits<{
    (e: 'onShutDown'): void;
    (e: 'toggleMute'): void;
}>();

// 语音状态监听器
const userStartSpeakingHandler = () => {
  isUserSpeaking.value = true;
  handleVoiceStateChange();
};

const userStopSpeakingHandler = () => {
  isUserSpeaking.value = false;
  handleVoiceStateChange();
};

const aiStartSpeakingHandler = () => {
  isAiSpeaking.value = true;
  handleVoiceStateChange();
};

const aiStopSpeakingHandler = () => {
  isAiSpeaking.value = false;
  handleVoiceStateChange();
};

// 设置语音状态监听器
const setupVoiceStateListeners = () => {
  // 监听用户开始说话事件
  props.chatStateManager.on(ChatEvent.USER_START_SPEAKING, userStartSpeakingHandler);
  
  // 监听用户停止说话事件
  props.chatStateManager.on(ChatEvent.USER_STOP_SPEAKING, userStopSpeakingHandler);
  
  // 监听AI开始说话事件
  props.chatStateManager.on(ChatEvent.AI_START_SPEAKING, aiStartSpeakingHandler);
  
  // 监听AI停止说话事件
  props.chatStateManager.on(ChatEvent.AI_STOP_SPEAKING, aiStopSpeakingHandler);
};

// 移除语音状态监听器
const removeVoiceStateListeners = () => {
  // 移除用户开始说话事件监听器
  props.chatStateManager.off(ChatEvent.USER_START_SPEAKING, userStartSpeakingHandler);
  
  // 移除用户停止说话事件监听器
  props.chatStateManager.off(ChatEvent.USER_STOP_SPEAKING, userStopSpeakingHandler);
  
  // 移除AI开始说话事件监听器
  props.chatStateManager.off(ChatEvent.AI_START_SPEAKING, aiStartSpeakingHandler);
  
  // 移除AI停止说话事件监听器
  props.chatStateManager.off(ChatEvent.AI_STOP_SPEAKING, aiStopSpeakingHandler);
  
  console.log("[VoiceCall] Voice state listeners removed");
};

// 组件挂载时设置语音状态监听器
onMounted(() => {
  setupVoiceStateListeners();
});

// 组件卸载时清理定时器和监听器
onUnmounted(() => {
  // 清除打字机效果定时器
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  
  // 清除清晰度效果定时器
  if (clarityTimer) {
    clearInterval(clarityTimer);
    clarityTimer = null;
  }
  
  // 清除对话区域定时器
  if (chatAreaTimer) {
    clearTimeout(chatAreaTimer);
    chatAreaTimer = null;
  }
  
  // 移除语音状态监听器
  removeVoiceStateListeners();
});

// 暴露方法给父组件
defineExpose({
  updateAIMessage,
  updateUserMessage,
  clearMessages
});

// Morphing Text
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

<template>
    <div class="phone-call-container" :class="{ visible: props.isVisible }">
        <!-- 顶部ParticleImage组件 -->
        <div class="particle-image-top">
            <ParticleImage 
                image-src="/2.png"
                :responsive-width="true"
                :responsive-height="true"
                canvas-width="100vw"
                canvas-height="auto"
                particle-size="2"
                particle-gap="2"
                mouse-force="100"
                gravity="0.1"
            />
        </div>
        
        <!-- 共享容器确保粒子背景和Spline交互范围完全一致 -->
        <div class="background-container">
            <!-- 粒子背景层 -->
            <ParticlesBg 
                :class="cn('particles-layer')"
                :quantity="150"
                :ease="60"
                color="#FFFFFF"
                :opacity="0.5"
                refresh
                :special-colors="{ fluorescentGreen: 0, fluorescentYellow: 0, lightBlue: 50 }"
            />
            
            <!-- Spline 3D 背景层，定位到底部 -->
            <div class="spline-container">
                <Spline 
                    scene="/spline/scene.splinecode"
                    :render-on-demand="false"
                    :style="{ width: '100%', height: '100%', pointerEvents: 'all' }"
                    @error="(err) => console.error('Spline load error:', err)"
                    @spline-start="() => console.log('🎮 Spline scene loaded successfully')"
                />
            </div>
        </div>

        <!-- 内容层 -->
        <div class="content-layer">
            <!-- 对话内容区域 -->
            <div class="chat-content-area" :class="{ 'chat-area-hidden': !isChatAreaVisible, 'chat-area-fading': isChatAreaFading }">
                <div class="message-container">
                    <div v-for="(message, index) in userMessages" :key="'user-'+index" class="user-message">
                        {{ message }}
                    </div>
                    <div v-for="(message, index) in aiMessages" :key="'ai-'+index" class="ai-message" :class="{ 'fade-out': message.isFadingOut }">
                        <span v-for="(charObj, charIndex) in message.displayedChars" :key="charIndex" 
                                :style="{ opacity: charObj.clarity, filter: `blur(${(1 - charObj.clarity) * 5}px)` }">
                              {{ charObj.char }}
                          </span>
                    </div>
                </div>
            </div>
            
            <div class="voice-avatar-container">
                <!-- <div class="voice-avatar" :class="{ speaking: currentChatState === ChatState.AI_SPEAKING }">
                    <img src="/avatar.jpg" alt="Moss头像" />
                </div>
                <div v-for="i in 3" :key="i" :class="`ripple-${i}`"></div> -->
            </div>
                
        </div>
        <!-- 声纹波浪 -->
        <div class="voice-wave-container">
            <VoiceWave 
                :is-active="currentChatState === ChatState.USER_SPEAKING"
                :wave-height="voiceAnimationManager.voiceWaveHeight.value"
                :particle-count="20"
                :visible="currentChatState === ChatState.USER_SPEAKING || currentChatState === ChatState.AI_SPEAKING"
            />
        </div>
        <!-- 静音和挂断按钮 -->
        <div class="button-container">
            <button @click="emit('toggleMute')" :class="{ muted: props.isMuted }">
                <span class="mute-icon">{{ props.isMuted ? '🔇' : '🔊' }}</span>
            </button>
            <button @click="emit('onShutDown')" class="hangup-button">
                <span class="hangup-icon">💬</span>
            </button>
        </div>
    </div>
</template>

<style scoped lang="less">
.phone-call-container {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1rem;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
    transform: translateY(-100%);
    overflow: hidden;
    transition: all 0.5s ease-in-out;
    
    /* 顶部粒子图片容器 */
    .particle-image-top {
        position: absolute;
        top: 5vh;
        left: 10vw;
        width: 80vw;
        z-index: 50;
        pointer-events: none;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 20px;
        
        :deep(canvas) {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            border-radius: 20px;
        }
    }

    &.visible {
        transform: translateY(0);
    }

    /* 共享背景容器 - 确保粒子和Spline交互范围完全一致 */
    .background-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100; /* 提高z-index，确保Spline容器能在最上层 */
        overflow: hidden;
        pointer-events: none; /* 允许鼠标事件穿透到粒子背景 */
    }

    /* 粒子背景层 - 在共享容器内 */
    .particles-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 1; /* 设置为完全不透明 */
        pointer-events: auto; /* 确保粒子背景可以接收鼠标事件 */
        z-index: 0; /* 确保粒子背景位于最底层 */
    }

    /* Spline容器 - 在共享容器内，位于粒子层之上 */
    .spline-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 75%;
        z-index: 99; /* 提高z-index确保始终在最上层，能够接收鼠标事件 */
        opacity: 1; /* 设置为完全不透明 */
        overflow: hidden;
        pointer-events: auto; /* 确保Spline容器可以接收鼠标事件 */
    }

    /* 内容层 - 允许鼠标事件穿透到下层Spline */
    .content-layer {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        z-index: 3; /* 调整z-index确保在ParticleImage和background-container之上 */
        pointer-events: none; /* 默认不接收鼠标事件，让事件穿透 */
    }
    
    /* 对话内容区域 */
    .chat-content-area {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60%; /* 宽度缩小到60% */
        height: auto; /* 高度根据内容自适应 */
        max-height: 50%; /* 设置最大高度，避免占用过多空间 */
        padding: 1rem;
        z-index: 4; /* 确保在ParticleImage、background-container和content-layer之上 */
        pointer-events: auto; /* 允许鼠标事件 */
        background-color: transparent; /* 透明背景 */
        backdrop-filter: none; /* 移除背景模糊效果 */
        overflow-y: auto; /* 允许内容滚动 */
        border-radius: 0.5rem; /* 添加圆角 */
        margin-top: 1rem; /* 顶部留出一些空间 */
        transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out;
    }
    
    /* 对话区域隐藏状态 */
    .chat-content-area.chat-area-hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }
    
    /* 对话区域消散动画状态 */
    .chat-content-area.chat-area-fading {
        animation: fadeOutAndScale 2s ease-in-out forwards;
    }
    
    /* 消散动画关键帧 */
    @keyframes fadeOutAndScale {
        0% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }
        50% {
            opacity: 0.5;
            transform: translateX(-50%) scale(0.95);
        }
        100% {
            opacity: 0;
            transform: translateX(-50%) scale(0.9);
            visibility: hidden;
        }
    }
    
    .message-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: flex-start;
    }
    
    .user-message, .ai-message {
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        border-radius: 0.5rem;
        word-wrap: break-word; /* 允许长单词换行 */
    }
    
    .user-message {
        align-self: flex-end;
        background-color: transparent; /* 透明背景 */
        color: #ffffff;
        max-width: 80%;
        animation: fadeIn 0.5s ease-in-out;
        transition: opacity 1.5s ease-in-out, transform 1.5s ease-in-out;
    }
    
    .ai-message {
        align-self: flex-start;
        background-color: transparent; /* 透明背景 */
        color: #ffffff;
        max-width: 80%;
        position: relative;
        min-height: 30px;
        transition: opacity 1.5s ease-in-out, transform 1.5s ease-in-out;
    }
    
    /* 单条消息消散动画 */
    .user-message.fade-out-single, .ai-message.fade-out-single {
        opacity: 0;
        transform: scale(0.8) translateY(10px);
    }
    
    /* 打字机光标样式 */
    .typing-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background-color: #ffffff;
        animation: blink 1s infinite;
        margin-left: 2px;
        vertical-align: text-bottom;
    }
    
    /* 用户消息滑入动画 */
    .slide-in-right {
        animation: slideInRight 0.5s ease-out;
    }

    /* 用户说话时的音浪动画 */
    .voice-wave-container {
        position: absolute;
        left: 50%;
        bottom: 5.5rem;
        transform: translateX(-50%);
        width: 80px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 4; /* 确保在ParticleImage、background-container和content-layer之上 */
        // 为音浪容器单独设置 pointer-events，覆盖父容器的设置
        pointer-events: auto;
    }
    /* 静音和挂断按钮容器 */
    .button-container {
        position: absolute;
        left: 50%;
        bottom: 1.5rem;
        transform: translateX(-50%);
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        align-items: center;
        z-index: 101;
        pointer-events: auto;

        button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            padding: 0.5rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            cursor: pointer;

            &:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(255, 64, 129, 0.3);
            }
        }

        .mute-icon {
            font-size: 2rem;
            line-height: 1;
            cursor: pointer;
        }

        .hangup-button {
            width: 3.5rem;
            height: 3.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hangup-icon {
            font-size: 2rem;
            line-height: 1;
            cursor: pointer;
        }
    }

    /* 多层涟漪效果 */
    .voice-avatar-container .ripple-1,
    .voice-avatar-container .ripple-2,
    .voice-avatar-container .ripple-3 {
        content: "";
        position: absolute;
        border: 2px solid rgba(64, 224, 255, 0.4);
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: none;
        width: 100%;
        height: 100%;
        opacity: 0;
        z-index: 1;
        animation: ripple-pulse 3s ease-out infinite;
    }

    .voice-avatar-container .ripple-2 {
        animation-delay: 1s;
    }

    .voice-avatar-container .ripple-3 {
        animation-delay: 2s;
    }

    .voice-avatar-container {
        position: absolute;
        top: 2rem;
        right: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 2.5rem;
        height: 2.5rem;
        pointer-events: none; /* 容器本身不阻挡鼠标交互 */

        .voice-avatar {
            position: relative;
            overflow: visible;
            height: 100%;
            width: 100%;
            border-radius: 50%; /* 圆形头像 */
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.1), 0 0 60px rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease-in-out;
            z-index: 2;
            pointer-events: none; /* 头像容器本身不阻挡鼠标交互 */

            &.speaking {
                animation: scale-avatar 1s ease-in-out infinite;
                box-shadow: 0 0 40px rgba(64, 224, 255, 0.3), 0 0 80px rgba(64, 224, 255, 0.1);
            }

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border: 2px solid #fff;
                border-radius: 50%; /* 圆形图片 */
                z-index: 2;
                pointer-events: auto; /* 只有头像图片可交互 */
            }
        }
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes ripple-pulse {
    0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.6;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0.3;
    }
    100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
    }
}

@keyframes scale-avatar {
    0% {
        transform: scale(1);
    }

    20% {
        transform: scale(1.02);
    }

    40% {
        transform: scale(1);
    }

    70% {
        transform: scale(1.05);
    }

    100% {
        transform: scale(1);
    }
}

/* 打字机光标闪烁动画 */
@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
}

/* 用户消息淡入动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* AI消息淡出动画 */
@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

/* AI消息淡出效果类 */
.ai-message.fade-out {
    animation: fadeOut 0.5s ease-in-out forwards;
}

/* 用户消息滑入动画 */
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* 添加缺失的voice-wave关键帧动画 */
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