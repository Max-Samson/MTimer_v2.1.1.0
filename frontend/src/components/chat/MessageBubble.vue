<template>
  <div
    :class="[
      'flex w-full px-4 py-3 items-start gap-4 border-b transition-all duration-300',
      isUser
        ? 'flex-row-reverse bg-indigo-50/70 dark:bg-indigo-900/30 border-gray-100 dark:border-gray-700/50 message-enter-right'
        : 'border-gray-100 dark:border-gray-700/50 message-enter-left'
    ]"
  >
    <!-- 角色标识和头像 -->
    <div class="flex flex-col items-center w-12">
      <div class="avatar transform transition-all duration-300 hover:scale-110">
        <n-avatar
          v-if="!isUser"
          round
          :size="36"
          :style="{ backgroundColor: '#6366f1' }"
          class="shadow-md"
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
          class="shadow-md"
        >
          <template #icon>
            <n-icon><UserAvatar /></n-icon>
          </template>
        </n-avatar>
      </div>
      <div class="text-xs mt-1 text-gray-500 dark:text-gray-400">{{ isUser ? '用户' : 'AI助手' }}</div>
    </div>

    <!-- 消息内容 -->
    <div class="flex-1 max-w-[calc(100%-70px)]">
      <!-- 消息主体 -->
      <div
        :class="[
          'rounded-lg p-4 shadow-sm transition-all duration-300 hover:shadow-md',
          isUser
            ? 'bg-green-100 dark:bg-green-900/30 text-gray-800 dark:text-gray-100 rounded-tr-none'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none'
        ]"
      >
        <!-- 如果有图片，显示图片 -->
        <div v-if="image" class="mb-3 rounded-lg overflow-hidden shadow transition-all duration-300 hover:shadow-md">
          <img
            :src="image"
            :alt="`${isUser ? '用户' : 'AI助手'}上传的图片`"
            class="max-w-full max-h-[300px] object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
            @click="previewImage"
          />
        </div>

        <n-scrollbar class="max-h-[300px]" trigger="hover">
          <div class="message-content">
            <div v-html="formatContentToHTML(content || '')" class="prose dark:prose-invert max-w-none prose-sm sm:prose-base"></div>
          </div>
        </n-scrollbar>
      </div>

      <!-- 消息时间和操作按钮 -->
      <div class="flex items-center justify-between mt-2 px-1 message-actions opacity-60 hover:opacity-100 transition-opacity duration-200">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatTime(timestamp) }}
        </div>

        <!-- 消息操作按钮 (仅AI消息显示) -->
        <div v-if="!isUser" class="flex gap-1 message-actions-buttons">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle size="tiny" class="text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transform transition-all duration-300 hover:-translate-y-0.5" @click="copyMessage">
                <n-icon><Copy /></n-icon>
              </n-button>
            </template>
            <span>复制</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                circle
                size="tiny"
                :class="[
                  'transform transition-all duration-300 hover:-translate-y-0.5',
                  liked ? 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                ]"
                @click="toggleLike"
              >
                <n-icon><ThumbsUp /></n-icon>
              </n-button>
            </template>
            <span>有帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                circle
                size="tiny"
                :class="[
                  'transform transition-all duration-300 hover:-translate-y-0.5',
                  disliked ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                ]"
                @click="toggleDislike"
              >
                <n-icon><ThumbsDown /></n-icon>
              </n-button>
            </template>
            <span>无帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle size="tiny" class="text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transform transition-all duration-300 hover:-translate-y-0.5" @click="regenerateResponse">
                <n-icon><Reset /></n-icon>
              </n-button>
            </template>
            <span>重新生成</span>
          </n-tooltip>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览模态框 -->
  <n-modal
    v-model:show="showImagePreview"
    preset="card"
    style="width: auto; max-width: 90vw;"
    :title="isUser ? '用户上传的图片' : 'AI助手分享的图片'"
    :bordered="false"
    :segmented="true"
    transform-origin="center"
    class="image-preview-modal"
  >
    <template #header-extra>
      <n-button text @click="downloadImage" class="transition-transform duration-200 hover:-translate-y-0.5">
        <template #icon>
          <n-icon><Download /></n-icon>
        </template>
        下载
      </n-button>
    </template>
    <div class="flex justify-center">
      <img :src="image" class="max-w-full max-h-[80vh] object-contain transition-all duration-300 hover:scale-[1.05]" />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bot, UserAvatar, Copy, ThumbsUp, ThumbsDown, Reset, Download } from '@vicons/carbon';
import { useMessage, NScrollbar } from 'naive-ui';

const props = defineProps<{
  content: string;
  isUser: boolean;
  timestamp: number;
  image?: string | null;
}>();

const emit = defineEmits<{
  (e: 'regenerate'): void;
  (e: 'feedback', type: 'like' | 'dislike', value: boolean): void;
}>();

const message = useMessage();
const liked = ref(false);
const disliked = ref(false);
const showImagePreview = ref(false);

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

// 预览图片
function previewImage() {
  if (props.image) {
    showImagePreview.value = true;
  }
}

// 下载图片
function downloadImage() {
  if (!props.image) return;

  const link = document.createElement('a');
  link.href = props.image;
  link.download = `image_${new Date().getTime()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 格式化内容为HTML
function formatContentToHTML(content: string): string {
  if (!content) return '';

  // 移除可能包含的JSON代码块（适用于任务数据）
  content = content.replace(/```json\s*([\s\S]*?)```/g, '');

  // 移除空行（由于删除代码块可能导致的）
  content = content.replace(/\n\s*\n/g, '\n\n');

  // 处理代码块（保留非JSON的代码块）
  content = content.replace(/```([a-z]+)\n([\s\S]*?)```/g, function(match, lang, code) {
    if (lang.toLowerCase() === 'json') {
      return ''; // 移除JSON代码块
    }
    return '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto"><code class="language-' + lang + '">' + code + '</code></pre>';
  });

  // 处理行内代码
  content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">$1</code>');

  // 处理链接
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">$1</a>');

  // 处理粗体
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 处理斜体
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 处理标题
  content = content.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  content = content.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>');
  content = content.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>');

  // 处理列表
  content = content.replace(/^\d+\. (.*?)$/gm, '<li class="ml-6 list-decimal">$1</li>');
  content = content.replace(/^- (.*?)$/gm, '<li class="ml-6 list-disc">$1</li>');

  // 检测并包装列表项
  const hasOrderedList = content.includes('<li class="ml-6 list-decimal">');
  const hasUnorderedList = content.includes('<li class="ml-6 list-disc">');

  if (hasOrderedList) {
    // 包装有序列表
    content = content.replace(
      /(<li class="ml-6 list-decimal">.*?<\/li>)+/g,
      match => `<ol class="list-decimal pl-4 my-2">${match}</ol>`
    );
  }

  if (hasUnorderedList) {
    // 包装无序列表
    content = content.replace(
      /(<li class="ml-6 list-disc">.*?<\/li>)+/g,
      match => `<ul class="list-disc pl-4 my-2">${match}</ul>`
    );
  }

  // 处理段落和换行
  content = content.replace(/\n\n/g, '</p><p class="my-2">');
  content = content.replace(/\n/g, '<br>');

  // 包装在段落标签中
  if (!content.startsWith('<h1') && !content.startsWith('<h2') && !content.startsWith('<h3') &&
      !content.startsWith('<ol') && !content.startsWith('<ul') && !content.startsWith('<p')) {
    content = '<p class="my-2">' + content + '</p>';
  }

  // 修复可能的嵌套标签问题
  content = content.replace(/<p class="my-2"><(h[1-3]|ol|ul|li)/g, '<$1');
  content = content.replace(/<\/(h[1-3]|ol|ul|li)><\/p>/g, '</$1>');

  return content;
}
</script>

<style scoped>
/* 消息进入动画 */
.message-enter-left {
  animation: slideInLeft 0.3s ease-out;
}

.message-enter-right {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 图片预览模态框动画 */
.image-preview-modal {
  animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 自定义滚动条 */
:deep(.n-scrollbar-rail) {
  width: 6px !important;
}

:deep(.n-scrollbar-rail--horizontal) {
  height: 6px !important;
}

:deep(.n-scrollbar-bar) {
  background-color: rgba(0, 0, 0, 0.1) !important;
}

:deep(.dark .n-scrollbar-bar) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* 代码显示样式 */
:deep(pre) {
  position: relative;
  max-height: 300px;
  overflow: auto;
  border-radius: 6px;
}

:deep(code) {
  font-family: 'Fira Code', monospace, 'Courier New', Courier;
  font-size: 0.9em;
}

/* JSON格式优化 */
:deep(pre code.language-json) {
  color: #0e7490;
}

.message-content {
  overflow-wrap: break-word;
  word-break: break-word;
  max-height: 350px;
  overflow-y: auto;
}

/* 增强滚动条样式 */
.message-content::-webkit-scrollbar {
  width: 4px;
}

.message-content::-webkit-scrollbar-track {
  background: transparent;
}

.message-content::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}

.message-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 消息操作按钮 */
.message-actions {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.message-actions:hover {
  opacity: 1;
}

.message-actions-buttons {
  display: flex;
  gap: 4px;
}
</style>
