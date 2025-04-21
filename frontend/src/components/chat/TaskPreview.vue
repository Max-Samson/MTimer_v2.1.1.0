<template>
  <div class="ml-12 mt-1 w-full max-w-[calc(100%-70px)] rounded-xl bg-gray-100 p-4 transition-all dark:bg-gray-800">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="m-0 text-base font-semibold text-blue-500">AI推荐的番茄工作计划</h3>
      <n-button type="primary" @click="handleApply">
        <template #icon>
          <n-icon><CheckmarkFilled /></n-icon>
        </template>
        应用到待办事项
      </n-button>
    </div>

    <div class="flex flex-col gap-3">
      <n-card size="small" class="overflow-hidden rounded-lg">
        <n-table :bordered="false" :single-line="false">
          <thead>
            <tr>
              <th class="text-left">任务名称</th>
              <th class="text-center">专注模式</th>
              <th class="text-center">专注时长</th>
              <th class="text-center">休息时长</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(task, index) in taskData" :key="index">
              <td>{{ task.name }}</td>
              <td class="text-center">{{ formatMode(task.mode) }}</td>
              <td class="text-center">{{ task.focusDuration }}分钟</td>
              <td class="text-center">{{ task.breakDuration }}分钟</td>
            </tr>
          </tbody>
        </n-table>
      </n-card>

      <div class="flex flex-wrap gap-4">
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-gray-500 dark:text-gray-400">总专注时间:</span>
          <span class="font-semibold text-blue-500">{{ calculateTotalFocusTime() }}分钟</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-gray-500 dark:text-gray-400">预计完成时间:</span>
          <span class="font-semibold text-blue-500">{{ formatCompletionTime() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { format, addMinutes } from 'date-fns';
import { CheckmarkFilled } from '@vicons/carbon';
import { TaskPlan } from '../../services/AIAssistantService';

const props = defineProps<{
  taskData: TaskPlan[];
}>();

const emit = defineEmits<{
  (e: 'apply'): void;
}>();

// 格式化专注模式
function formatMode(mode: string): string {
  const modeMap: Record<string, string> = {
    'pomodoro': '番茄工作法',
    'deep_work': '深度工作',
    'short_break': '短休息',
    'long_break': '长休息'
  };
  return modeMap[mode] || mode;
}

// 计算总专注时间
function calculateTotalFocusTime(): number {
  return props.taskData.reduce((total, task) => total + task.focusDuration, 0);
}

// 格式化预计完成时间
function formatCompletionTime(): string {
  const now = new Date();
  const totalMinutes = props.taskData.reduce((total, task) => {
    return total + task.focusDuration + task.breakDuration;
  }, 0);

  const completionTime = addMinutes(now, totalMinutes);
  return format(completionTime, 'HH:mm');
}

// 处理应用按钮点击
function handleApply(): void {
  emit('apply');
}
</script>

<style scoped>
.task-preview {
  margin-left: 52px;
  background-color: #f3f4f6;
  border-radius: 12px;
  padding: 16px;
  margin-top: 4px;
  width: 100%;
  max-width: calc(100% - 70px);
  transition: all 0.3s;
}

:root[data-theme="dark"] .task-preview {
  background-color: #1f2937;
}

.task-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-preview-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
  margin: 0;
}

.task-preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border-radius: 8px;
  overflow: hidden;
}

.task-preview-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label {
  font-weight: 500;
  color: #6b7280;
}

:root[data-theme="dark"] .label {
  color: #9ca3af;
}

.value {
  font-weight: 600;
  color: #1890ff;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}
</style>
