import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

type ConfigData = {
	[key: string]: string | boolean,
	ws_url: string
	ws_proxy_url: string
	ota_version_url: string,
	backend_url: string,
	token_enable: boolean
	token: string
	device_id: string
}

export const useSettingStore = defineStore('setting', () => {
	// state
	const sessionId = ref<string>("")
	const deviceId = ref<string>("")
	const wsUrl = ref<string>("")
	const wsProxyUrl = ref<string>("")
	const otaVersionUrl = ref<string>("")
	const backendUrl = ref<string>("")
	const tokenEnable = ref<boolean>(false)
	const token = ref<string>("")
	const visible = ref<boolean>(false)
	const textChatVoiceEnabled = ref<boolean>(true) // 文字聊天时是否播放语音
	
	const configRefMap: Record<string, Ref<string | boolean>> = {
		ws_url: wsUrl,
		ws_proxy_url: wsProxyUrl,
		ota_version_url: otaVersionUrl,
		token_enable: tokenEnable,
		token: token,
		device_id: deviceId,
		backend_url: backendUrl,
		text_chat_voice_enabled: textChatVoiceEnabled
	}

	const fetchConfig = async (): Promise<boolean> => {
		try {
			const response = await fetch(backendUrl.value + "/config")
			const jsonData = await response.json()
			console.log("[useSettingStore][fetchConfig] response: ", jsonData)
			if (!response.ok) {
				throw new Error("Failed to fetch config")
			}
			const { data } = jsonData as { data: ConfigData }
			Object.entries(configRefMap).forEach(([key, ref]) => {
				const value = data[key]
				if (value !== undefined && value !== null) {
					// 本地服务器和本地代理 IP 默认为当前主机
					if (key === 'ws_proxy_url' && typeof value === 'string') {
						const currentHost = window.location.hostname;
						const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
						ref.value = `${currentProtocol}//${currentHost}` + value.substring(value.lastIndexOf(':'))
					} else {
						ref.value = value
					}
				}
			})
			return true;
		} catch (error) {
			console.error("[useSettingStore][fetchConfig]", error)
			return false;
		}
	}

	const saveToLocal = (): boolean => {
		const configJson = {
			ws_url: wsUrl.value,
			ws_proxy_url: wsProxyUrl.value,
			ota_version_url: otaVersionUrl.value,
			backend_url: backendUrl.value,
			token_enable: tokenEnable.value,
			token: token.value,
			device_id: deviceId.value,
			text_chat_voice_enabled: textChatVoiceEnabled.value
		}
		const dataOK = Object.values(configJson).every(value => value !== "")
		if (dataOK) {
			localStorage.setItem('settings', JSON.stringify(configJson))
			console.log("[useSettingStore][saveToLocal] 配置文件更新成功", configJson)
		} else {
			console.warn("[useSettingStore][saveToLocal] 配置文件数据不完整，未保存", configJson)
		}
		return dataOK
	}

	const updateConfig = (settings: any) => {
		Object.entries(configRefMap).forEach(([key, ref]) => {
			if (settings[key] !== undefined && settings[key] !== null) {
				ref.value = settings[key]
			}
		})
	}

	const loadFromLocal = (): boolean => {
		const localConfig = localStorage.getItem('settings')
		if (localConfig) {
			updateConfig(JSON.parse(localConfig))
			console.log("[useSettingStore][loadFromLocal] 配置文件加载成功")
			return true
		}
		console.log("[useSettingStore][loadFromLocal] 配置文件不存在")
		return false
	}

	// 初始化默认配置
	const initDefaultConfig = (): void => {
		// 如果localStorage中没有配置，则设置默认配置
		if (!localStorage.getItem('settings')) {
			// 获取当前页面的主机名和协议
			const currentHost = window.location.hostname;
			const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			
			const defaultConfig = {
				ws_url: "wss://api.tenclass.net/xiaozhi/v1/",
				ws_proxy_url: `${currentProtocol}//${currentHost}:5002`,
				ota_version_url: "https://api.tenclass.net/xiaozhi/ota/",
				backend_url: `${window.location.protocol}//${currentHost}:8081`,
				token_enable: true,
				token: "test_token",
				device_id: "b6:63:7d:91:0b:b4",
				text_chat_voice_enabled: true
			}
			// 直接设置各个ref的值，确保backendUrl被正确设置
			wsUrl.value = defaultConfig.ws_url;
			wsProxyUrl.value = defaultConfig.ws_proxy_url;
			otaVersionUrl.value = defaultConfig.ota_version_url;
			backendUrl.value = defaultConfig.backend_url;
			tokenEnable.value = defaultConfig.token_enable;
			token.value = defaultConfig.token;
			deviceId.value = defaultConfig.device_id;
			textChatVoiceEnabled.value = defaultConfig.text_chat_voice_enabled;
			// 不自动保存到localStorage，让用户确认后再保存
			console.log("[useSettingStore][initDefaultConfig] 默认配置已初始化，wsProxyUrl:", wsProxyUrl.value);
			console.log("[useSettingStore][initDefaultConfig] 默认配置已初始化，backendUrl:", backendUrl.value);
		}
	}

	const destoryLocal = () => {
		localStorage.removeItem('settings')
		console.log("[useSettingStore][destoryLocal] 本地缓存配置文件已删除")
	}

	return {
		sessionId,
		deviceId,
		wsUrl,
		wsProxyUrl,
		otaVersionUrl,
		backendUrl,
		tokenEnable,
		token,
		visible,
		textChatVoiceEnabled,
		updateConfig,
		fetchConfig,
		saveToLocal,
		loadFromLocal,
		initDefaultConfig,
		destoryLocal,
	}
})

