import { computed, ref } from 'vue'
import type { WebSocketMessage } from '@/types/message'
import type { WebSocketDependencies, WebSocketHandlers } from '@/types/websocket'

export class WebSocketService {
    private _connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected')
    readonly connectionStatus = computed(() => this._connectionStatus.value)
    
    // 提供一个方法来获取状态值，避免模板中需要 .value
    public getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
        return this._connectionStatus.value
    }
    private ws: WebSocket | null = null
    private handlers: WebSocketHandlers
    private reconnectTimer: number | null = null
    private reconnectAttempts = 0
    private readonly maxReconnectAttempts = 5
    private readonly reconnectDelay = 3000  // 3秒重连间隔
    private deps: WebSocketDependencies
    private currentUrl: string = ""

    constructor(deps: WebSocketDependencies, handlers: WebSocketHandlers) {
        this.deps = deps
        this.handlers = handlers
    }

    public connect(url: string | URL): void {
        // 保存当前 URL 用于重连
        this.currentUrl = url.toString()
        // 重置重连计数
        this.reconnectAttempts = 0
        this.ws = new WebSocket(url)
        this.ws.onopen = this.handleOpen.bind(this)
        this.ws.onclose = this.handleClose.bind(this)
        this.ws.onerror = this.handleError.bind(this)
        this.ws.onmessage = this.handleMessage.bind(this)
    }

    public disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        this.ws?.close()
        this.ws = null
    }

    public setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
        this._connectionStatus.value = status
    }

    public sendTextMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn("[WebSocketService] Connection not ready")
            return
        }

        const data = typeof message === 'string' ? message : JSON.stringify(message)
        this.ws.send(data)
    }

    public sendAudioMessage(data: Float32Array): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn("[WebSocketService] Connection not ready")
            return
        }
        this.ws.send(data)
    }

    private handleOpen(): void {
        console.log("[WebSocketService] Connected to server", this.deps.settingStore.wsProxyUrl)
        this._connectionStatus.value = "connected"

        // 发送 Hello 消息
        this.sendHelloMessage()
        this.handlers.onConnect?.()
    }

    private handleClose(event: CloseEvent): void {
        // 根据 code 分析断开原因
        let reason = ""
        switch (event.code) {
            case 1000:
                reason = "Normal closure (正常关闭)"
                break
            case 1001:
                reason = "Server going away (服务器关闭)"
                break
            case 1002:
                reason = "Protocol error (协议错误)"
                break
            case 1003:
                reason = "Unsupported data (不支持的数据)"
                break
            case 1005:
                reason = "No status received (无状态)"
                break
            case 1006:
                reason = "Abnormal closure (异常关闭-网络问题)"
                break
            case 1007:
                reason = "Invalid frame payload data (无效数据)"
                break
            case 1008:
                reason = "Policy violation (策略违规)"
                break
            case 1009:
                reason = "Message too big (消息太大)"
                break
            case 1010:
                reason = "Required extension missing (缺少扩展)"
                break
            case 1011:
                reason = "Internal server error (服务器内部错误)"
                break
            case 1012:
                reason = "Service restart (服务重启)"
                break
            case 1013:
                reason = "Try again later (稍后重试)"
                break
            case 1015:
                reason = "TLS handshake fail (TLS握手失败)"
                break
            default:
                reason = "Unknown"
        }
        console.log(`[WebSocketService] Connection closed: code=${event.code} reason="${event.reason}" meaning="${reason}"`)
        this._connectionStatus.value = "disconnected"
        this.deps.settingStore.sessionId = ""
        
        // 自动重连机制（参照初始版本设计）
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`[WebSocketService] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`)
            this.reconnectTimer = window.setTimeout(() => {
                console.log(`[WebSocketService] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
                this.connect(this.currentUrl)
            }, this.reconnectDelay)
        } else {
            console.warn(`[WebSocketService] Max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up.`)
        }
        
        this.handlers.onDisconnect?.(event)
    }

    private handleError(error: Event): void {
        console.error("[WebSocketService] Error:", error)
        this._connectionStatus.value = "error"
        this.handlers.onError?.(error)
    }

    private async handleMessage(event: MessageEvent<any>): Promise<void> {
        try {
            if (event.data instanceof Blob) {
                const arrayBuffer: ArrayBuffer = await event.data.arrayBuffer();
                const audioBuffer: AudioBuffer = await this.deps.decodeAudioData(arrayBuffer);
                await this.handleAudioMessage(audioBuffer)
            } else {
                await this.handleTextMessage(event.data)
            }
        } catch (e) {
            console.error("[WebSocketService][handleMessage] Error processing message:", e)
        }
    }

    private async handleAudioMessage(audioBuffer: AudioBuffer): Promise<void> {
        await this.handlers.onAudioMessage?.(audioBuffer)
    }

    private async handleTextMessage(data: any): Promise<void> {
        const message = JSON.parse(data) as WebSocketMessage
        if (message.type === "hello") {
            this.deps.settingStore.sessionId = message.session_id!
        }
        await this.handlers.onTextMessage?.(message)
    }

    private sendHelloMessage(): void {
        const helloMessage = {
            type: "hello",
            version: 3,
            audio_params: {
                format: "opus",
                sample_rate: 16000,  // 需要与后端采样率相匹配（直接改为 24000 将导致语音对话频繁中断）
                channels: 1,
                frame_duration: 60,
            }
        }
        this.sendTextMessage(helloMessage)
    }
}