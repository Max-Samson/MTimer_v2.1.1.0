<template>
  <div class="ai-chat-container">
    <!-- 聊天历史区域 -->
    <div class="chat-history" ref="chatHistoryRef">
      <template v-for="(message, index) in chatHistory" :key="index">
        <!-- 消息气泡 -->
        <message-bubble
          :content="message.content"
          :is-user="message.role === 'user'"
          :timestamp="message.timestamp"
          @regenerate="regenerateResponse(index)"
          @feedback="handleFeedback(index, $event)"
        />

        <!-- 如果消息包含任务数据且是最新消息，显示任务预览 -->
        <task-preview
          v-if="message.taskData && index === chatHistory.length - 1 && message.role === 'assistant'"
          :task-data="message.taskData"
          @apply="$emit('apply-plan', message.taskData)"
        />
      </template>

      <!-- 加载中状态 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-header">
          <div class="loading-avatar">
            <n-avatar round :size="36" :style="{ backgroundColor: '#6366f1' }">
              <template #icon>
                <n-icon><Bot /></n-icon>
              </template>
            </n-avatar>
          </div>
          <div class="loading-role">AI助手</div>
        </div>
        <div class="loading-content">
          <n-skeleton text :repeat="3" />
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <n-input
          v-model:value="inputText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="描述你想要完成的任务，如：我需要复习3小时英语、写2小时论文..."
          @keydown.enter.exact.prevent="handleSend"
          :disabled="isLoading"
          class="chat-input"
        />
        <div class="input-actions">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button text circle size="small" class="tool-btn" @click="clearInput">
                <n-icon><Close /></n-icon>
              </n-button>
            </template>
            <span>清空</span>
          </n-tooltip>

          <div class="action-buttons">
            <n-button tertiary size="small" @click="$emit('clear-history')" :disabled="isLoading" class="clear-btn">
              <template #icon>
                <n-icon><Delete /></n-icon>
              </template>
              清空对话
            </n-button>
            <n-button
              type="primary"
              :disabled="!inputText.trim() || isLoading"
              @click="handleSend"
              :loading="isLoading"
              class="send-btn"
            >
              <template #icon>
                <n-icon><Send /></n-icon>
              </template>
              发送
            </n-button>
          </div>
        </div>
      </div>

      <div class="input-hint">
        <n-icon size="14"><InformationFilled /></n-icon>
        <span>提示: 输入你的任务描述，AI将为你规划番茄工作法时间安排。按Enter发送。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Delete, Send, InformationFilled, Bot, Close } from '@vicons/carbon';
import { ChatMessage, TaskPlan } from '../services/AIAssistantService';
import MessageBubble from './chat/MessageBubble.vue';
import TaskPreview from './chat/TaskPreview.vue';
import { useMessage } from 'naive-ui';

const props = defineProps<{
  chatHistory: ChatMessage[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'send-message', message: string): void;
  (e: 'apply-plan', taskPlan: TaskPlan[]): void;
  (e: 'clear-history'): void;
  (e: 'regenerate', messageIndex: number): void;
  (e: 'feedback', messageIndex: number, type: string, value: boolean): void;
}>();

const message = useMessage();
const inputText = ref('');
const chatHistoryRef = ref<HTMLElement | null>(null);

// 发送消息
const handleSend = () => {
  if (inputText.value.trim() && !props.isLoading) {
    emit('send-message', inputText.value);
    inputText.value = '';
  }
};

// 监听聊天历史变化，自动滚动到底部
watch(() => props.chatHistory, async () => {
  await nextTick();
  scrollToBottom();
}, { deep: true });

// 滚动到底部
const scrollToBottom = () => {
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  }
};

// 清空输入框
const clearInput = () => {
  inputText.value = '';
};

// 处理消息反馈
const handleFeedback = (messageIndex: number, event: { type: 'like' | 'dislike'; value: boolean }) => {
  const { type, value } = event;
  emit('feedback', messageIndex, type, value);

  // 可以在这里实现反馈提示
  if (value) {
    message.success(`已${type === 'like' ? '点赞' : '反馈'}`);
  }
};

// 重新生成回复
const regenerateResponse = (messageIndex: number) => {
  emit('regenerate', messageIndex);
};
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: #fefefe;
  transition: all 0.3s;
}

:root[data-theme="dark"] .ai-chat-container {
  background-color: #1f2937;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}

.chat-history::-webkit-scrollbar {
  width: 6px;
}

.chat-history::-webkit-scrollbar-track {
  background: transparent;
}

.chat-history::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  padding: 16px 0;
}

:root[data-theme="dark"] .loading-container {
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

.loading-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: 0 16px;
}

.loading-avatar {
  display: flex;
  justify-content: center;
}

.loading-role {
  font-size: 12px;
  margin-top: 8px;
  color: #6b7280;
}

:root[data-theme="dark"] .loading-role {
  color: #9ca3af;
}

.loading-content {
  flex: 1;
  padding: 0 24px 0 0;
  margin-top: 16px;
}

.input-area {
  border-top: 1px solid #e5e7eb;
  padding: 16px 24px;
  background-color: white;
  transition: all 0.3s;
  position: relative;
}

:root[data-theme="dark"] .input-area {
  border-top: 1px solid #374151;
  background-color: #1f2937;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 16px;
  transition: all 0.3s;
}

:root[data-theme="dark"] .input-container {
  background-color: #111827;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.chat-input {
  border-radius: 8px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.tool-btn {
  color: #6b7280;
  transition: all 0.2s;
}

.tool-btn:hover {
  color: #6366f1;
  background-color: rgba(99, 102, 241, 0.1);
}

.clear-btn {
  color: #6b7280;
}

.send-btn {
  border-radius: 8px;
  background-color: #6366f1;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background-color: #4f46e5;
  transform: translateY(-1px);
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
  padding: 0 8px;
}

:root[data-theme="dark"] .input-hint {
  color: #9ca3af;
}
</style>
