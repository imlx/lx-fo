<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { useSettingStore } from "@/stores/setting"
import type {
  HelloResponse,
  UserEcho,
  AIResponse_Emotion,
  AIResponse_Text,
  AbortMessage,
  UserMessage
} from "@/types/message"
import { ChatStateManager } from "@/services/ChatStateManager"
import { ChatEvent, ChatState } from "@/types/chat"
import { VoiceAnimationManager } from "@/services/VoiceAnimationManager"
import { AudioService } from "@/services/AudioManager"
import { WebSocketService } from "@/services/WebSocketManager"
import VoiceCall from "@/components/VoiceCall.vue"
import { ElMessage } from "element-plus"

const settingStore = useSettingStore()
const router = useRouter()

// 静音状态
const isMuted = ref(false)

// 语音对话配置
const voiceAnimationManager = new VoiceAnimationManager()
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
      wsService.sendAudioMessage(data)
    },
    sendTextData(text: string) {
      wsService.sendTextMessage(text)
    },
    getSessionId() {
      return settingStore.sessionId
    }
  },
  voiceAnimationManager: voiceAnimationManager,
})
const audioService = AudioService.getInstance()
audioService.onQueueEmpty(() => {
  chatStateManager.setState(ChatState.IDLE)
})
audioService.onProcess((audioLevel: number, audioData: Float32Array) => {
  chatStateManager.handleUserAudioLevel(audioLevel, audioData)
})
chatStateManager.on(ChatEvent.USER_START_SPEAKING, async () => {
  audioService.stopPlaying()
  audioService.clearAudioQueue()
})
chatStateManager.on(ChatEvent.AI_START_SPEAKING, () => {
  if (!isMuted.value) {
    audioService.playAudio()
  }
})

// WebSocket 配置
const voiceCallRef = ref<InstanceType<typeof VoiceCall> | null>(null)
const wsService = new WebSocketService(
  {
    decodeAudioData: (arrayBuffer: ArrayBuffer) =>
      audioService.decodeAudioData(arrayBuffer),
    settingStore: settingStore
  },
  {
    async onAudioMessage(audioBuffer) {
      console.log("[WebSocketService][onAudioMessage] audio data received.")

      if (isMuted.value) {
        console.log("[WebSocketService][onAudioMessage] Muted, skipping audio play")
        return
      }

      switch (chatStateManager.currentState.value as ChatState) {
        case ChatState.USER_SPEAKING:
          console.warn(
            "[WebSocketService][onAudioMessage] User is speaking, discarding audio data."
          )
          audioService.enqueueAudio(audioBuffer)
          break
        case ChatState.IDLE:
          console.log(
            "[WebSocketService][onAudioMessage] Audio is not playing, set ai speaking..."
          )
          audioService.enqueueAudio(audioBuffer)
          chatStateManager.setState(ChatState.AI_SPEAKING)
          break
        case ChatState.AI_SPEAKING:
          console.log(
            "[WebSocketService][onAudioMessage] AI is speaking, enqueuing audio data."
          )
          audioService.enqueueAudio(audioBuffer)
          break
        default:
          console.error(
            "[WebSocketService][onAudioMessage] Unknown state:",
            chatStateManager.currentState.value
          )
      }
    },
    async onTextMessage(message) {
      console.log("[WebSocketService][onTextmessage] Text message received:", message)

      switch (message.type) {
        case "hello":
          const helloMessage = message as HelloResponse
          settingStore.sessionId = helloMessage.session_id!
          console.log("[WebSocketService][onTextmessage] Session ID:", helloMessage.session_id)
          break

        case "stt":
          const sttMessage = message as UserEcho
          if (sttMessage.text?.trim()) {
            if (voiceCallRef.value) {
              voiceCallRef.value.clearMessages()
              voiceCallRef.value.updateUserMessage(sttMessage.text)
            }
          }
          break

        case "llm":
          const emotionMessage = message as AIResponse_Emotion
          if (emotionMessage.text?.trim()) {
            if (voiceCallRef.value) {
              voiceCallRef.value.updateAIMessage(emotionMessage.text)
            }
          }
          break

        case "tts":
          switch (message.state) {
            case "start":
              break
            case "sentence_start":
              const textMessage = message as AIResponse_Text
              if (voiceCallRef.value) {
                voiceCallRef.value.updateAIMessage(textMessage.text!)
              }
              break
            case "sentence_end":
              break
          }
          break
      }
    },
    onConnect() {
      ElMessage.success("连接成功")
    },
    onDisconnect() {
      ElMessage.error("连接断开，正在重连...")
      setTimeout(() => {
        wsService.connect(settingStore.wsProxyUrl)
      }, 3000)
    }
  }
)

// 静音切换
const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (isMuted.value) {
    audioService.stopPlaying()
    audioService.clearAudioQueue()
    ElMessage.error("已静音")
  } else {
    ElMessage.success("取消静音")
  }
}

// 挂断电话，切换到文字聊天
const handleHangup = () => {
  audioService.stopPlaying()
  audioService.clearAudioQueue()
  audioService.clearMediaResources()
  router.push('/chat')
}

// 确保后端连接
const ensureBackendUrl = async () => {
  if (!settingStore.backendUrl) {
    // 这里可以简化逻辑，直接使用默认地址或提示输入
    settingStore.backendUrl = "http://localhost:8081"
  }
}

onMounted(async () => {
  const loaded = settingStore.loadFromLocal()
  if (loaded) {
    wsService.connect(settingStore.wsProxyUrl)
  } else {
    settingStore.initDefaultConfig()
    const fetchOk = await settingStore.fetchConfig()
    if (fetchOk) {
      settingStore.saveToLocal()
      wsService.connect(settingStore.wsProxyUrl)
    } else {
      await ensureBackendUrl()
      const retryFetchOk = await settingStore.fetchConfig()
      if (retryFetchOk) {
        settingStore.saveToLocal()
        wsService.connect(settingStore.wsProxyUrl)
      } else {
        ElMessage.error("连接失败，请检查服务器是否启动")
      }
    }
  }

  // 准备音频资源
  await audioService.prepareMediaResources()
})

onUnmounted(() => {
  console.log("[VoicePage][onUnmounted] Clearing resources...")
  chatStateManager.destroy()
  audioService.clearMediaResources()
})
</script>

<template>
  <div class="voice-page">
    <VoiceCall
      ref="voiceCallRef"
      :voice-animation-manager="voiceAnimationManager"
      :chat-state-manager="chatStateManager"
      :is-visible="true"
      :is-muted="isMuted"
      @toggle-mute="toggleMute"
      @on-shut-down="handleHangup"
    />
  </div>
</template>

<style scoped>
.voice-page {
  width: 100%;
  height: 100%;
}
</style>
