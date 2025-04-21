<template>
  <div class="ai-assistant-view">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <n-icon size="24" class="header-icon">
            <Bot />
          </n-icon>
          <div>
            <h1 class="page-title">AI 时间专注助手</h1>
            <p class="page-subtitle">让AI帮你规划专注任务和时间安排</p>
          </div>
        </div>
        <n-button @click="refreshView" size="small" class="refresh-btn">
          <template #icon>
            <n-icon><Reset /></n-icon>
          </template>
          刷新
        </n-button>
      </div>
    </div>

    <!-- 聊天区域容器 -->
    <div class="assistant-container">
      <AIChat
        :chat-history="chatHistory.value"
        :is-loading="isLoading.value"
        @send-message="sendMessage"
        @apply-plan="applyPlan"
        @clear-history="clearHistory"
        @regenerate="regenerateResponse"
        @feedback="handleFeedback"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import { Bot, Reset } from '@vicons/carbon';
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

// 重新生成回复
const regenerateResponse = async (messageIndex: number) => {
  if (isLoading.value) return;

  message.info('正在重新生成回复...');

  try {
    // 如果需要实现，可以调用AIAssistantService的相应方法
    // 这里简单实现为直接发送最近一条用户消息
    const userMessages = chatHistory.value.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      await AIAssistantService.sendMessage(lastUserMessage.content);
    }
  } catch (error) {
    message.error('重新生成失败，请稍后再试');
    console.error('重新生成失败:', error);
  }
};

// 处理消息反馈
const handleFeedback = (messageIndex: number, type: string, value: boolean) => {
  // 实际项目中可以发送到后端记录
  console.log(`消息反馈: 索引=${messageIndex}, 类型=${type}, 值=${value}`);
};

// 刷新视图
const refreshView = () => {
  window.location.reload();
};

onMounted(() => {
  // 检查是否有有效的AI对话
  if (chatHistory.value.length <= 0) {
    AIAssistantService.clearChatHistory();
  }
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
  padding: 0;
  overflow: hidden;
}

:root[data-theme="dark"] .ai-assistant-view {
  background-color: #111827;
}

.page-header {
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px 24px;
  transition: all 0.3s;
  border-bottom: 1px solid #e5e7eb;
}

:root[data-theme="dark"] .page-header {
  background-color: #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #374151;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #6366f1;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #111827;
  transition: color 0.3s;
}

:root[data-theme="dark"] .page-title {
  color: #f3f4f6;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  transition: color 0.3s;
}

:root[data-theme="dark"] .page-subtitle {
  color: #9ca3af;
}

.refresh-btn {
  border-radius: 8px;
  transition: all 0.2s;
}

.refresh-btn:hover {
  transform: translateY(-1px);
}

.assistant-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s;
}
</style>