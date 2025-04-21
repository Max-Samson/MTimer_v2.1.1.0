<template>
  <div
    :class="[
      'message-bubble',
      isUser ? 'message-user' : 'message-assistant'
    ]"
  >
    <!-- 角色标识和头像 -->
    <div class="role-identifier">
      <div class="avatar">
        <n-avatar
          v-if="!isUser"
          round
          :size="36"
          :style="{ backgroundColor: '#6366f1' }"
        >
          <template #icon>
            <n-icon><Bot /></n-icon>
          </template>
        </n-avatar>
        <n-avatar
          v-else
          round
          :size="36"
          :style="{ backgroundColor: '#10b981' }"
        >
          <template #icon>
            <n-icon><UserAvatar /></n-icon>
          </template>
        </n-avatar>
      </div>
      <div class="role-name">{{ isUser ? '用户' : 'AI助手' }}</div>
    </div>

    <!-- 消息内容 -->
    <div class="message-content">
      <!-- 消息主体 -->
      <div
        :class="[
          'message-body',
          isUser ? 'message-body-user' : 'message-body-assistant'
        ]"
      >
        <n-scrollbar class="max-h-[400px]" trigger="hover">
          <div>
            <n-markdown :content="content" />
          </div>
        </n-scrollbar>
      </div>

      <!-- 消息时间和操作按钮 -->
      <div class="message-footer">
        <div class="message-time">
          {{ formatTime(timestamp) }}
        </div>

        <!-- 消息操作按钮 (仅AI消息显示) -->
        <div v-if="!isUser" class="message-actions">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button text size="small" class="action-btn" @click="copyMessage">
                <n-icon><Copy /></n-icon>
              </n-button>
            </template>
            <span>复制</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button text size="small" class="action-btn" :class="{ 'action-active': liked }" @click="toggleLike">
                <n-icon><ThumbsUp /></n-icon>
              </n-button>
            </template>
            <span>有帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button text size="small" class="action-btn" :class="{ 'action-active': disliked }" @click="toggleDislike">
                <n-icon><ThumbsDown /></n-icon>
              </n-button>
            </template>
            <span>无帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button text size="small" class="action-btn" @click="regenerateResponse">
                <n-icon><Reset /></n-icon>
              </n-button>
            </template>
            <span>重新生成</span>
          </n-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bot, UserAvatar, Copy, ThumbsUp, ThumbsDown, Reset } from '@vicons/carbon';
import { useMessage } from 'naive-ui';

const props = defineProps<{
  content: string;
  isUser: boolean;
  timestamp: number;
}>();

const emit = defineEmits<{
  (e: 'regenerate'): void;
  (e: 'feedback', type: 'like' | 'dislike', value: boolean): void;
}>();

const message = useMessage();
const liked = ref(false);
const disliked = ref(false);

// 格式化时间
function formatTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  });
}

// 复制消息内容
function copyMessage() {
  navigator.clipboard.writeText(props.content)
    .then(() => {
      message.success('已复制到剪贴板');
    })
    .catch(() => {
      message.error('复制失败，请手动复制');
    });
}

// 点赞/取消点赞
function toggleLike() {
  if (disliked.value) {
    disliked.value = false;
  }
  liked.value = !liked.value;
  emit('feedback', 'like', liked.value);
}

// 不喜欢/取消不喜欢
function toggleDislike() {
  if (liked.value) {
    liked.value = false;
  }
  disliked.value = !disliked.value;
  emit('feedback', 'dislike', disliked.value);
}

// 重新生成回复
function regenerateResponse() {
  emit('regenerate');
}
</script>

<style scoped>
.message-bubble {
  display: flex;
  width: 100%;
  padding: 16px 0;
  position: relative;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
}

.message-user {
  background-color: rgba(240, 253, 244, 0.3);
}

.message-assistant {
  background-color: transparent;
}

:root[data-theme="dark"] .message-user {
  background-color: rgba(6, 78, 59, 0.15);
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

:root[data-theme="dark"] .message-assistant {
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

.role-identifier {
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.role-name {
  font-size: 12px;
  margin-top: 8px;
  color: #6b7280;
}

:root[data-theme="dark"] .role-name {
  color: #9ca3af;
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-right: 36px;
}

.message-body {
  font-size: 15px;
  line-height: 1.6;
  padding: 0;
  transition: all 0.3s;
}

.message-body-user {
  color: #374151;
}

.message-body-assistant {
  color: #111827;
}

:root[data-theme="dark"] .message-body-user,
:root[data-theme="dark"] .message-body-assistant {
  color: #e5e7eb;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.message-time {
  font-size: 12px;
  color: #9ca3af;
}

.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

.action-btn {
  color: #6b7280;
  transition: all 0.2s;
}

.action-btn:hover {
  color: #6366f1;
  background-color: rgba(99, 102, 241, 0.1);
}

.action-active {
  color: #6366f1;
}

:root[data-theme="dark"] .action-btn {
  color: #9ca3af;
}

:root[data-theme="dark"] .action-btn:hover {
  color: #818cf8;
  background-color: rgba(129, 140, 248, 0.1);
}

:root[data-theme="dark"] .action-active {
  color: #818cf8;
}

/* Markdown 样式覆盖 */
.message-body :deep(pre) {
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 12px;
  overflow-x: auto;
  margin: 12px 0;
  font-size: 14px;
}

:root[data-theme="dark"] .message-body :deep(pre) {
  background-color: rgba(17, 24, 39, 0.6);
}

.message-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
}

.message-body :deep(p) {
  margin: 12px 0;
}

.message-body :deep(ul), .message-body :deep(ol) {
  padding-left: 20px;
  margin: 12px 0;
}

.message-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.message-body :deep(th),
.message-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
}

:root[data-theme="dark"] .message-body :deep(th),
:root[data-theme="dark"] .message-body :deep(td) {
  border-color: #374151;
}

.message-body :deep(th) {
  background-color: rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .message-body :deep(th) {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
