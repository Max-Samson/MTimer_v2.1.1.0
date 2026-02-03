<script setup lang="ts">
import type { TimerSettings } from '../stores/todoStore'
import { NButton, NForm, NFormItem, NInput, NInputNumber, NRadio, NRadioGroup, NSpace } from 'naive-ui'
import { ref } from 'vue'
import { useTodoStore } from '../stores'

const todoStore = useTodoStore()
const todoText = ref('')
const timerMode = ref<'standard' | 'custom'>('standard')
const estimatedPomodoros = ref(1)

// 标准番茄钟设置
const standardSettings = ref({
  workTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
})

// 自定义时间设置
const customTime = ref(25)

function handleSubmit() {
  if (todoText.value.trim()) {
    const timerSettings: TimerSettings = {
      workTime: standardSettings.value.workTime,
      shortBreakTime: standardSettings.value.shortBreakTime,
      longBreakTime: standardSettings.value.longBreakTime,
      isCustom: timerMode.value === 'custom',
      customTime: timerMode.value === 'custom' ? customTime.value : undefined,
    }

    todoStore.addTodo({
      name: todoText.value.trim(),
      mode: timerMode.value === 'standard' ? 'pomodoro' : 'custom',
      estimatedPomodoros: estimatedPomodoros.value,
    })
    todoText.value = ''
    timerMode.value = 'standard'
    estimatedPomodoros.value = 1
  }
}
</script>

<template>
  <NForm class="todo-form">
    <NFormItem label="待办事项">
      <NInput v-model:value="todoText" placeholder="输入待办事项内容" />
    </NFormItem>

    <NFormItem label="计时模式">
      <NRadioGroup v-model:value="timerMode">
        <NSpace>
          <NRadio value="standard">
            标准番茄钟
          </NRadio>
          <NRadio value="custom">
            自定义时间
          </NRadio>
        </NSpace>
      </NRadioGroup>
    </NFormItem>

    <template v-if="timerMode === 'standard'">
      <NFormItem label="工作时间">
        <NInputNumber v-model:value="standardSettings.workTime" :min="1" :max="60" />
      </NFormItem>
      <NFormItem label="短休息时间">
        <NInputNumber v-model:value="standardSettings.shortBreakTime" :min="1" :max="30" />
      </NFormItem>
      <NFormItem label="长休息时间">
        <NInputNumber v-model:value="standardSettings.longBreakTime" :min="1" :max="45" />
      </NFormItem>
    </template>

    <template v-else>
      <NFormItem label="专注时间">
        <NInputNumber v-model:value="customTime" :min="1" :max="120" />
      </NFormItem>
    </template>

    <NFormItem label="预计番茄钟数量">
      <NInputNumber v-model:value="estimatedPomodoros" :min="1" :max="10" />
    </NFormItem>

    <NFormItem>
      <NButton type="primary" @click="handleSubmit">
        添加待办事项
      </NButton>
    </NFormItem>
  </NForm>
</template>

<style scoped>
.todo-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}
</style>
