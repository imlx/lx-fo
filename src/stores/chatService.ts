import { ref, onUnmounted, markRaw } from 'vue'
import { defineStore } from 'pinia'
import type { HelloResponse, UserEcho, AIResponse_Emotion, AIResponse_Text, AbortMessage } from '@/types/message'
import { ChatStateManager } from '@/services/ChatStateManager'
import { ChatEvent, ChatState } from '@/types/chat'
import { VoiceAnimationManager } from '@/services/VoiceAnimationManager'
import { AudioService } from '@/services/AudioManager'
import { WebSocketService } from '@/services/WebSocketManager'
import { useSettingStore } from './setting'

type MessageHandler = {
  onAudioMessage?: (audioBuffer: AudioBuffer) => void | Promise<void>
  onTextMessage?: (message: any) => void | Promise<void>
  onConnect?: () => void
  onDisconnect?: (event: CloseEvent) => void
}

export const useChatServiceStore = defineStore('chatService', () => {
  const settingStore = useSettingStore()

  // 服务实例（使用 markRaw 避免 Pinia 响应式代理导致类型问题）
  const voiceAnimationManager = markRaw(new VoiceAnimationManager())
  const chatStateManager = markRaw(new ChatStateManager({
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
  }))
  const audioService = AudioService.getInstance()

  // 消息处理器注册
  const messageHandlers = ref<MessageHandler[]>([])

  // WebSocket 服务
  const wsService = new WebSocketService(
    {
      decodeAudioData: (arrayBuffer: ArrayBuffer) =>
        audioService.decodeAudioData(arrayBuffer),
      settingStore: settingStore
    },
    {
      async onAudioMessage(audioBuffer) {
        console.log("[ChatService][onAudioMessage] audio data received.")
        for (const handler of messageHandlers.value) {
          if (handler.onAudioMessage) {
            await handler.onAudioMessage(audioBuffer)
          }
        }
      },
      async onTextMessage(message) {
        console.log("[ChatService][onTextmessage] Text message received:", message)
        for (const handler of messageHandlers.value) {
          if (handler.onTextMessage) {
            await handler.onTextMessage(message)
          }
        }
      },
      onConnect() {
        for (const handler of messageHandlers.value) {
          if (handler.onConnect) {
            handler.onConnect()
          }
        }
      },
      onDisconnect(event) {
        for (const handler of messageHandlers.value) {
          if (handler.onDisconnect) {
            handler.onDisconnect(event)
          }
        }
      }
    }
  )

  // 音频服务初始化（只需要一次）
  let audioInitialized = false

  const initAudioService = () => {
    if (audioInitialized) return
    audioInitialized = true
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
      audioService.playAudio()
    })
  }

  // 连接管理
  let isConnected = false

  const connect = async () => {
    initAudioService()
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
        console.warn("[ChatService] Could not fetch config, using defaults")
        wsService.connect(settingStore.wsProxyUrl)
      }
    }
    isConnected = true
  }

  const disconnect = () => {
    wsService.disconnect()
    isConnected = false
  }

  // 消息处理器管理
  const registerHandler = (handler: MessageHandler) => {
    messageHandlers.value.push(handler)
  }

  const unregisterHandler = (handler: MessageHandler) => {
    const index = messageHandlers.value.indexOf(handler)
    if (index !== -1) {
      messageHandlers.value.splice(index, 1)
    }
  }

  // 发送消息
  const sendTextMessage = (message: any) => {
    wsService.sendTextMessage(message)
  }

  const sendAbortMessage = () => {
    const abortMessage: AbortMessage = {
      type: "abort",
      session_id: settingStore.sessionId
    }
    wsService.sendTextMessage(abortMessage)
  }

  // 清理资源
  const destroy = () => {
    console.log("[ChatService] Destroying services...")
    chatStateManager.destroy()
    audioService.clearMediaResources()
    disconnect()
  }

  return {
    voiceAnimationManager,
    chatStateManager,
    audioService,
    wsService,
    connect,
    disconnect,
    registerHandler,
    unregisterHandler,
    sendTextMessage,
    sendAbortMessage,
    destroy
  }
})
