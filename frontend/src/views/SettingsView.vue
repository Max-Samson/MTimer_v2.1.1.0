<script setup lang="ts">
import { NCard, NForm, NFormItem, NInput, NSwitch, NSelect, NButton, NSpace } from 'naive-ui'
import { useSettingsStore } from '../stores'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

// 使用Pinia store
const settingsStore = useSettingsStore()

// 使用storeToRefs保持响应性
const { aiSettings } = storeToRefs(settingsStore)

// 从aiSettings中解构出需要的属性，保持响应性
const aiModel = computed(() => aiSettings.value.model)
const apiKey = computed(() => aiSettings.value.apiKey)

const modelOptions = [
    { label: '千义通问', value: 'qianyi' },
    { label: 'DeepSeek', value: 'deepseek' }
]

const saveSettings = () => {
    // 使用store提供的方法保存设置
    settingsStore.updateAISettings({
        model: aiModel.value,
        apiKey: apiKey.value
    })
}
</script>

<template>
    <div class="settings-view">
        <n-form>
            <n-form-item label="时间管理AI模型接口">
                <n-select v-model:value="aiModel" :options="modelOptions" />
            </n-form-item>
            <n-form-item label="AI接口的API密钥">
                <n-input v-model:value="apiKey" type="password" show-password-on="click" placeholder="请输入API密钥" />
            </n-form-item>
            <n-space justify="end">
                <n-button type="primary" @click="saveSettings">保存设置</n-button>
            </n-space>
        </n-form>
    </div>
</template>

<style scoped>
.settings-view {
    padding: 10px;
}
</style>