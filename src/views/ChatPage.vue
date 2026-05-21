<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useChatServiceStore } from '@/stores/chatService'
import type { HelloResponse, UserEcho, AIResponse_Emotion, AIResponse_Text, UserMessage } from '@/types/message'
import { ChatState } from '@/types/chat'
import Header from '@/components/Header/index.vue'
import SettingPanel from '@/components/Setting/index.vue'
import InputField from '@/components/InputField.vue'
import ChatContainer from '@/components/ChatContainer.vue'
import VoiceCall from '@/components/VoiceCall.vue'
import { ElMessage } from 'element-plus'

const settingStore = useSettingStore()
const chatService = useChatServiceStore()
const router = useRouter()

// 组件引用
const chatContainerRef = ref<InstanceType<typeof ChatContainer> | null>(null)
const voiceCallRef = ref<InstanceType<typeof VoiceCall> | null>(null)

// 消息处理回调
const messageHandler = {
  async onAudioMessage(audioBuffer: AudioBuffer) {
    console.log("[ChatPage][onAudioMessage] audio data received, duration:", audioBuffer.duration)

    if (!settingStore.textChatVoiceEnabled) {
      console.log("[ChatPage][onAudioMessage] Text chat voice disabled, discarding audio data.")
      return
    }

    // 使用 getState() 方法直接获取状态值，绕过 computed 响应式问题
    const currentState = chatService.chatStateManager.getState()
    console.log("[ChatPage][onAudioMessage] Current state:", currentState, "isPlaying:", chatService.audioService.isPlaying)

    // 如果状态为 undefined，使用 IDLE 作为默认值
    const effectiveState = currentState ?? ChatState.IDLE

    switch (effectiveState) {
      case ChatState.USER_SPEAKING:
        console.warn(
          "[ChatPage][onAudioMessage] User is speaking, discarding audio data."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        break
      case ChatState.IDLE:
        console.log(
          "[ChatPage][onAudioMessage] Audio is not playing, set ai speaking..."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        chatService.chatStateManager.setState(ChatState.AI_SPEAKING)
        // 直接触发播放，不依赖事件
        if (settingStore.textChatVoiceEnabled && !chatService.audioService.isPlaying) {
          console.log("[ChatPage][onAudioMessage] Calling playAudio...")
          chatService.audioService.playAudio()
        }
        break
      case ChatState.AI_SPEAKING:
        console.log(
          "[ChatPage][onAudioMessage] AI is speaking, enqueuing audio data."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        // 已经在播放中，依靠 onended 自动播放下一个
        break
      default:
        console.error("[ChatPage][onAudioMessage] Unknown state:", currentState, "treating as IDLE")
        chatService.audioService.enqueueAudio(audioBuffer)
        chatService.chatStateManager.setState(ChatState.AI_SPEAKING)
        if (settingStore.textChatVoiceEnabled && !chatService.audioService.isPlaying) {
          chatService.audioService.playAudio()
        }
        break
    }
  },
  async onTextMessage(message: any) {
    console.log("[ChatPage][onTextmessage] Text message received:", message)

    switch (message.type) {
      case "hello":
        const helloMessage = message as HelloResponse
        settingStore.sessionId = helloMessage.session_id!
        console.log("[ChatPage][onTextmessage] Session ID:", helloMessage.session_id)
        break

      case "stt":
        const sttMessage = message as UserEcho
        if (sttMessage.text?.trim()) {
          chatContainerRef.value?.appendMessage("user", sttMessage.text)
          if (voiceCallRef.value) {
            voiceCallRef.value.clearMessages()
            voiceCallRef.value.updateUserMessage(sttMessage.text)
          }
        }
        break

      case "llm":
        const emotionMessage = message as AIResponse_Emotion
        if (emotionMessage.text?.trim()) {
          chatContainerRef.value?.appendMessage("ai", emotionMessage.text)
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
            chatContainerRef.value?.appendMessage("ai", textMessage.text!)
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
    ElMessage.success("核心损坏已修复")
  },
  onDisconnect(event: CloseEvent) {
    ElMessage.error("检测到量子波动异常...")
  }
}

// 发送文字消息
const sendMessage = (text: string) => {
  const textMessage: UserMessage = {
    type: "listen",
    state: "detect",
    text: text,
    source: "text"
  }
  if (chatService.chatStateManager.getState() === ChatState.AI_SPEAKING) {
    chatService.sendAbortMessage()
    chatService.audioService.clearAudioQueue()
  }
  if (voiceCallRef.value) {
    voiceCallRef.value.clearMessages()
  }
  chatService.sendTextMessage(textMessage)
}

// 切换到语音聊天
const showVoiceCallPanel = async () => {
  chatService.sendAbortMessage()
  chatService.audioService.clearAudioQueue()
  router.push('/voice')
}

onMounted(async () => {
  console.log("[ChatPage] Mounted")
  chatService.registerHandler(messageHandler)
  await chatService.connect()
})

onUnmounted(() => {
  console.log("[ChatPage] Unmounted")
  chatService.unregisterHandler(messageHandler)
})
</script>

<template>
  <div class="chat-page">
    <Header :connection-status="chatService.wsService.getConnectionStatus()" />

    <ChatContainer class="chat-container" ref="chatContainerRef" />
    <InputField
      @send-message="(text: string) => sendMessage(text)"
      @phone-call-button-clicked="showVoiceCallPanel"
    />
    <SettingPanel />
    <VoiceCall
      ref="voiceCallRef"
      :voice-animation-manager="chatService.voiceAnimationManager"
      :chat-state-manager="chatService.chatStateManager"
      :is-visible="false"
      @on-shut-down="() => {}"
    />
  </div>
</template>

<style scoped>
.chat-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
