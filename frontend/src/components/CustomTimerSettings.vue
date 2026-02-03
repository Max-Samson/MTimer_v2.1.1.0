<script setup lang="ts">
import { NButton, NDivider, NForm, NFormItem, NInputNumber, NModal, NSpace } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useTimerStore } from '../stores'

// 使用Pinia store
const timerStore = useTimerStore()

// 使用storeToRefs保持响应性
const {
  customWorkTime,
  customShortBreakTime,
  customLongBreakTime,
  showCustomModeSettings,
} = storeToRefs(timerStore)

// 保存自定义设置
function saveCustomSettings() {
  timerStore.saveCustomSettings()
}
</script>

<template>
  <NModal v-model:show="showCustomModeSettings" preset="card" title="自定义专注模式设置" style="width: 500px;">
    <NForm>
      <!-- 自定义模式介绍 -->
      <div class="custom-info-box">
        <h3>自定义专注模式 <span class="timer-emoji">⏱️</span></h3>
        <p>根据个人需求自由设置专注和休息时间：</p>
      </div>

      <NDivider />

      <NFormItem label="专注时长 (分钟)">
        <NInputNumber v-model:value="customWorkTime" :min="1" :max="120" />
        <span class="form-tip">（建议设置在15-60分钟之间）</span>
      </NFormItem>

      <NFormItem label="短休息时长 (分钟)">
        <NInputNumber v-model:value="customShortBreakTime" :min="1" :max="30" />
        <span class="form-tip">（建议设置在3-10分钟之间）</span>
      </NFormItem>

      <NFormItem label="长休息时长 (分钟)">
        <NInputNumber v-model:value="customLongBreakTime" :min="5" :max="60" />
        <span class="form-tip">（每4个专注周期后的休息时间）</span>
      </NFormItem>

      <NDivider />

      <div style="display: flex; justify-content: flex-end;">
        <NSpace>
          <NButton @click="showCustomModeSettings = false">
            取消
          </NButton>
          <NButton type="primary" @click="saveCustomSettings">
            保存设置
          </NButton>
        </NSpace>
      </div>
    </NForm>
  </NModal>
</template>

<style scoped>
.custom-info-box {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 4px solid #18a058;
}

.custom-info-box h3 {
  margin-top: 0;
  color: #18a058;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timer-emoji {
  font-size: 1.2em;
}

.form-tip {
  margin-left: 8px;
  color: #999;
  font-size: 0.9em;
}
</style>
