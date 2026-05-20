<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useChatServiceStore } from '@/stores/chatService'
import type { HelloResponse, UserEcho, AIResponse_Emotion, AIResponse_Text } from '@/types/message'
import { ChatState } from '@/types/chat'
import VoiceCall from '@/components/VoiceCall.vue'
import { ElMessage } from 'element-plus'

const settingStore = useSettingStore()
const chatService = useChatServiceStore()
const router = useRouter()

// 静音状态
const isMuted = ref(false)

// 组件引用
const voiceCallRef = ref<InstanceType<typeof VoiceCall> | null>(null)

// 消息处理回调
const messageHandler = {
  async onAudioMessage(audioBuffer: AudioBuffer) {
    console.log("[VoicePage][onAudioMessage] audio data received.")

    if (isMuted.value) {
      console.log("[VoicePage][onAudioMessage] Muted, skipping audio play")
      return
    }

    switch (chatService.chatStateManager.currentState.value as ChatState) {
      case ChatState.USER_SPEAKING:
        console.warn(
          "[VoicePage][onAudioMessage] User is speaking, discarding audio data."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        break
      case ChatState.IDLE:
        console.log(
          "[VoicePage][onAudioMessage] Audio is not playing, set ai speaking..."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        chatService.chatStateManager.setState(ChatState.AI_SPEAKING)
        break
      case ChatState.AI_SPEAKING:
        console.log(
          "[VoicePage][onAudioMessage] AI is speaking, enqueuing audio data."
        )
        chatService.audioService.enqueueAudio(audioBuffer)
        break
    }
  },
  async onTextMessage(message: any) {
    console.log("[VoicePage][onTextmessage] Text message received:", message)

    switch (message.type) {
      case "hello":
        const helloMessage = message as HelloResponse
        settingStore.sessionId = helloMessage.session_id!
        console.log("[VoicePage][onTextmessage] Session ID:", helloMessage.session_id)
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
  onDisconnect(event: CloseEvent) {
    ElMessage.error("连接断开，正在重连...")
  }
}

// 静音切换
const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (isMuted.value) {
    chatService.audioService.stopPlaying()
    chatService.audioService.clearAudioQueue()
    ElMessage.error("已静音")
  } else {
    ElMessage.success("取消静音")
  }
}

// 挂断电话，切换到文字聊天
const handleHangup = () => {
  chatService.audioService.stopPlaying()
  chatService.audioService.clearAudioQueue()
  chatService.audioService.clearMediaResources()
  router.push('/chat')
}

onMounted(async () => {
  console.log("[VoicePage] Mounted")
  chatService.registerHandler(messageHandler)
  await chatService.connect()
  await chatService.audioService.prepareMediaResources()
})

onUnmounted(() => {
  console.log("[VoicePage] Unmounted")
  chatService.unregisterHandler(messageHandler)
})
</script>

<template>
  <div class="voice-page">
    <VoiceCall
      ref="voiceCallRef"
      :voice-animation-manager="chatService.voiceAnimationManager"
      :chat-state-manager="chatService.chatStateManager"
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
