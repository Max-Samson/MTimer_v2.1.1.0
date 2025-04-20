<!-- AI时间专注助手视图 -->
<template>
  <div class="ai-assistant-view">
    <!-- 顶部标题栏，使用卡片式设计 -->
    <div class="page-header">
      <h1 class="page-title">AI 时间专注助手</h1>
      <p class="page-subtitle">让AI帮你规划专注任务和时间安排</p>
    </div>

    <div class="assistant-container">
      <!-- 使用AIChat组件 -->
      <ai-chat
        :chat-history="chatHistory.value"
        :is-loading="isLoading.value"
        @send-message="sendMessage"
        @apply-plan="applyPlan"
        @clear-history="clearHistory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import AIAssistantService, { TaskPlan } from '../services/AIAssistantService';
import AIChat from '../components/AIChat.vue';

const message = useMessage();
const router = useRouter();
const chatHistory = AIAssistantService.getChatHistory();
const isLoading = AIAssistantService.getLoadingState();

// 发送消息
const sendMessage = async (input: string) => {
  if (input.trim() === '' || isLoading.value) return;

  // 发送消息到AI服务
  await AIAssistantService.sendMessage(input);
};

// 应用计划
const applyPlan = async (taskPlan: TaskPlan[]) => {
  message.info('正在应用计划，请稍候...');
  const success = await AIAssistantService.applyTaskPlan(taskPlan);

  if (success) {
    message.success('计划已应用，已为你创建任务');
    // 导航到待办事项页面
    setTimeout(() => {
      router.push('/todo');
    }, 1500);
  } else {
    message.error('应用计划失败，请稍后再试');
  }
};

// 清空聊天记录
const clearHistory = () => {
  AIAssistantService.clearChatHistory();
};

onMounted(() => {
  // 初始化
});
</script>

<style scoped>
.ai-assistant-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  transition: background-color 0.3s;
}

:root[data-theme="dark"] .ai-assistant-view {
  background-color: #111827;
}

.page-header {
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

:root[data-theme="dark"] .page-header {
  background-color: #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #111827;
  transition: color 0.3s;
}

:root[data-theme="dark"] .page-title {
  color: #f3f4f6;
}

.page-subtitle {
  font-size: 14px;
  color: #4b5563;
  margin: 0;
  transition: color 0.3s;
}

:root[data-theme="dark"] .page-subtitle {
  color: #9ca3af;
}

.assistant-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s;
}

:root[data-theme="dark"] .assistant-container {
  background-color: #1f2937;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}
</style>
