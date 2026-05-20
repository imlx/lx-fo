<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useSettingStore } from "./stores/setting";
import type {
  HelloResponse,
  UserEcho,
  AIResponse_Emotion,
  AIResponse_Text,
  AbortMessage,
  UserMessage
} from "./types/message";

const settingStore = useSettingStore();

// ---------- 语音对话配置 start --------------
import { ChatStateManager } from "./services/ChatStateManager";
import { ChatEvent, ChatState } from "./types/chat";
import { VoiceAnimationManager } from "./services/VoiceAnimationManager";
import { AudioService } from "./services/AudioManager";

const voiceAnimationManager = new VoiceAnimationManager();
const chatStateManager = new ChatStateManager({
  thresholds: {
    USER_SPEAKING: 0.04,
    USER_INTERRUPT_AI: 0.1,
  },
  timeout: {
    SILENCE: 1000
  },
  callbacks: {
    sendAudioData(data: Float32Array) {
      wsService.sendAudioMessage(data);
    },
    sendTextData(text: string) {
      wsService.sendTextMessage(text);
    },
    getSessionId() {
      return settingStore.sessionId;
    }
  },
  voiceAnimationManager: voiceAnimationManager,
})
const audioService = AudioService.getInstance();
audioService.onQueueEmpty(() => {
  chatStateManager.setState(ChatState.IDLE);
})
audioService.onProcess((audioLevel: number, audioData: Float32Array) => {
  chatStateManager.handleUserAudioLevel(audioLevel, audioData);
})
chatStateManager.on(ChatEvent.USER_START_SPEAKING, async () => {
  audioService.stopPlaying();
  audioService.clearAudioQueue();
})
chatStateManager.on(ChatEvent.AI_START_SPEAKING, () => {
  audioService.playAudio();
})
// ---------- 语音对话配置 end ----------------

// ---------- WebSocket 配置 start ----------
import { WebSocketService } from "./services/WebSocketManager";
const chatContainerRef = ref<InstanceType<typeof ChatContainer> | null>(null);
const wsService = new WebSocketService({
  decodeAudioData: (arrayBuffer: ArrayBuffer) => audioService.decodeAudioData(arrayBuffer),
  settingStore: settingStore,
},{
  async onAudioMessage(audioBuffer) {
    console.log("[WebSocketService][onAudioMessage] audio data received.");
    switch (chatStateManager.currentState.value as ChatState) {
      case ChatState.USER_SPEAKING:
        console.warn("[WebSocketService][onAudioMessage] User is speaking, discarding audio data.");
        audioService.enqueueAudio(audioBuffer);
        break;
      case ChatState.IDLE:
        console.log("[WebSocketService][onAudioMessage] Audio is not playing, set ai speaking...");
        audioService.enqueueAudio(audioBuffer);
        chatStateManager.setState(ChatState.AI_SPEAKING);
        break;
      case ChatState.AI_SPEAKING:
        console.log("[WebSocketService][onAudioMessage] AI is speaking, enqueuing audio data.");
        audioService.enqueueAudio(audioBuffer);
        break;
      default:
        console.error("[WebSocketService][onAudioMessage] Unknown state:", chatStateManager.currentState.value);
    }
  },
  async onTextMessage(message) {
    console.log("[WebSocketService][onTextmessage] Text message received:", message);

    switch (message.type) {
      case "hello":
        const helloMessage = message as HelloResponse;
        settingStore.sessionId = helloMessage.session_id!;
        console.log("[WebSocketService][onTextmessage] Session ID:", helloMessage.session_id);
        break;

      case "stt":
        const sttMessage = message as UserEcho;
        if (sttMessage.text?.trim()) {
          chatContainerRef.value?.appendMessage("user", sttMessage.text);
          // 更新VoiceCall组件中的用户消息
          if (voiceCallRef.value) {
            // 清空之前的消息，开始新的对话
            voiceCallRef.value.clearMessages();
            voiceCallRef.value.updateUserMessage(sttMessage.text);
          }
        }
        break;

      case "llm":
        const emotionMessage = message as AIResponse_Emotion;
        if (emotionMessage.text?.trim()) {
          chatContainerRef.value?.appendMessage("ai", emotionMessage.text);
          // 更新VoiceCall组件中的AI消息
          if (voiceCallRef.value) {
            voiceCallRef.value.updateAIMessage(emotionMessage.text);
          }
        }
        break;

      case "tts":
        switch (message.state) {
          case "start":
            break;
          case "sentence_start":
            const textMessage = message as AIResponse_Text;
            chatContainerRef.value?.appendMessage("ai", textMessage.text!);
            // 更新VoiceCall组件中的AI消息
            if (voiceCallRef.value) {
              voiceCallRef.value.updateAIMessage(textMessage.text!);
            }
            break;
          case "sentence_end":
            break;
        }
        break;
    }
  },
  onConnect() {
    ElMessage.success("核心损坏已修复");
    // setTimeout(() => {
    //   sendMessage("系统自动触发：量子波动数据检查...");
    // }, 3000);
  },
  onDisconnect() {
    ElMessage.error("检测到量子波动异常...");
    setTimeout(() => {
      wsService.connect(settingStore.wsProxyUrl);
    }, 3000);
  }
})
// ---------- WebSocket 配置 end ------------

import Header from './components/Header/index.vue'
import SettingPanel from './components/Setting/index.vue'
import VoiceCall from "./components/VoiceCall.vue";
import InputField from "./components/InputField.vue";
import ChatContainer from './components/ChatContainer.vue';

import { ElMessage, ElMessageBox } from 'element-plus';

// 添加VoiceCall组件的引用
const voiceCallRef = ref<InstanceType<typeof VoiceCall> | null>(null);

const sendAbortMessage = () => {
  const abortMessage: AbortMessage = {
    type: "abort",
    session_id: settingStore.sessionId,  // 修正：使用正确的属性名 session_id
  };
  wsService.sendTextMessage(abortMessage)
}

const sendMessage = (text: string) => {
  const textMessage: UserMessage = {
    type: "listen",
    state: "detect",
    text: text,
    source: "text",
  };
  if (chatStateManager.currentState.value == ChatState.AI_SPEAKING) {
    sendAbortMessage();
    audioService.clearAudioQueue();
  }
  // 清空VoiceCall组件中的消息，开始新的对话
  if (voiceCallRef.value) {
    voiceCallRef.value.clearMessages();
  }
  wsService.sendTextMessage(textMessage)
}

const isVoiceCallVisible = ref<boolean>(true);

const showVoiceCallPanel = async () => {
  sendAbortMessage();
  audioService.clearAudioQueue();
  isVoiceCallVisible.value = true;
  // 清空VoiceCall组件中的消息
  if (voiceCallRef.value) {
    voiceCallRef.value.clearMessages();
  }
  await audioService.prepareMediaResources();
  if (chatStateManager.currentState.value != ChatState.IDLE) {
    chatStateManager.setState(ChatState.IDLE);
  }
};

const closeVoiceCallPanel = async () => {
  isVoiceCallVisible.value = false;
  sendAbortMessage();
  audioService.stopMediaResources();
};

const ensureBackendUrl = async () => {
  if (!settingStore.backendUrl) {
    const { value: backendUrl } = await ElMessageBox.prompt('请输入本地服务器地址：', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: 'http://localhost:8081',
      inputPattern: /^http(s?):\/\/.+/, 
      inputErrorMessage: '请输入有效的服务器地址(http:// 或 https:// 开头)',
    });
    settingStore.backendUrl = backendUrl;
    ElMessage.success("后端服务器地址已保存");
  }
}

onMounted(async () => {
  const loaded = settingStore.loadFromLocal();
  if (loaded) {
    ElMessage.success("神经中枢网络初始化装载...");
    wsService.connect(settingStore.wsProxyUrl);
    // 自动显示VoiceCall面板
    await showVoiceCallPanel();
    return;
  }

  // 如果本地配置不存在，初始化默认配置
  settingStore.initDefaultConfig();
  
  // 尝试使用默认配置连接后端
  const fetchOk = await settingStore.fetchConfig();
  if (fetchOk) {
    settingStore.saveToLocal();
    ElMessage.warning("未发现本地配置，默认配置已加载并缓存至本地");
    wsService.connect(settingStore.wsProxyUrl);
    // 自动显示VoiceCall面板
    await showVoiceCallPanel();
  } else {
    // 如果默认配置连接失败，再提示用户输入后端地址
    await ensureBackendUrl();
    const retryFetchOk = await settingStore.fetchConfig();
    if (retryFetchOk) {
      settingStore.saveToLocal();
      ElMessage.success("后端服务器地址已保存并连接成功");
      wsService.connect(settingStore.wsProxyUrl);
      // 自动显示VoiceCall面板
      await showVoiceCallPanel();
    } else {
      ElMessage.error("连接失败，请检查服务器是否启动");
    }
  }
});

onUnmounted(() => {
  console.log("[App][onUnmounted] Clearing resources...");
  chatStateManager.destroy();
  audioService.clearMediaResources();
});

</script>

<template>
  <div class="app-container">
    <Header :connection-status="wsService.connectionStatus.value" />

    <ChatContainer class="chat-container" ref="chatContainerRef" />
    <InputField 
      @send-message="(text: string) => sendMessage(text)" 
      @phone-call-button-clicked="showVoiceCallPanel"
    />
    <SettingPanel />
    <VoiceCall 
      ref="voiceCallRef"
      :voice-animation-manager="voiceAnimationManager" 
      :chat-state-manager="chatStateManager"
      :is-visible="isVoiceCallVisible" 
      @on-shut-down="closeVoiceCallPanel" 
    />
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