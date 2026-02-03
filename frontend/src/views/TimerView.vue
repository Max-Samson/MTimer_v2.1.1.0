<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInputNumber } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useTimerStore } from '../stores'

// 使用Pinia store
const timerStore = useTimerStore()

// 使用storeToRefs保持响应性
const { workTime, shortBreakTime, longBreakTime } = storeToRefs(timerStore)

function saveSettings() {
  // 使用store的方法保存番茄工作法模式设置
  timerStore.savePomodoroSettings()
}
</script>

<template>
  <div class="timer-view">
    <NCard class="timer-settings">
      <h3>番茄工作法模式设置</h3>
      <NForm inline>
        <NFormItem label="工作时长">
          <NInputNumber v-model:value="workTime" :min="1" :max="60" size="small" />
        </NFormItem>
        <NFormItem label="短休息">
          <NInputNumber v-model:value="shortBreakTime" :min="1" :max="30" size="small" />
        </NFormItem>
        <NFormItem label="长休息">
          <NInputNumber v-model:value="longBreakTime" :min="1" :max="45" size="small" />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" size="small" @click="saveSettings">
            应用
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.timer-view {
  text-align: center;
  padding: 20px;
}

.timer-settings {
  max-width: 800px;
  margin: 0 auto;
  margin-bottom: 20px;
}

:deep(.n-form) {
  justify-content: center;
}

:deep(.n-form-item) {
  margin-right: 16px;
}
</style>
