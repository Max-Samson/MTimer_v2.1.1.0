<script setup lang="ts">
import { Pause, Play } from '@vicons/carbon'
import { NButton, NIcon, NSpace, NTooltip } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { audioService } from '../services/audioService'
import { useSettingsStore } from '../stores'

// 使用Pinia store
const settingsStore = useSettingsStore()

// 使用storeToRefs保持响应性
const { soundSettings } = storeToRefs(settingsStore)

// 创建本地响应式变量
const currentTrackName = ref('')

// 在组件挂载后初始化
onMounted(() => {
  // 确保audioService已初始化并与Pinia store连接
  // 在组件挂载后初始化，确保Pinia已经准备好
  setTimeout(() => {
    audioService.initializeStore()

    // 获取当前曲目名称
    currentTrackName.value = audioService.getCurrentTrackName()

    // 监听曲目变化
    setInterval(() => {
      currentTrackName.value = audioService.getCurrentTrackName()
    }, 1000)
  }, 100) // 短暂延迟确保Pinia已初始化
})

// 播放/暂停
function togglePlay() {
  audioService.togglePlay()
}
</script>

<template>
  <div v-if="soundSettings.bgMusic.currentTrack" class="mini-music-controller">
    <NSpace>
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton circle size="small" class="play-btn" @click="togglePlay">
            <template #icon>
              <NIcon>
                <Play v-if="!soundSettings.bgMusic.isPlaying" />
                <Pause v-else />
              </NIcon>
            </template>
          </NButton>
        </template>
        {{ soundSettings.bgMusic.isPlaying ? '暂停' : '播放' }}: {{ currentTrackName }}
      </NTooltip>
    </NSpace>
  </div>
</template>

<style scoped>
.mini-music-controller {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  padding: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.mini-music-controller:hover {
  transform: scale(1.1);
  background-color: rgba(0, 0, 0, 0.8);
}

.play-btn {
  background: linear-gradient(135deg, #8e2de2, #4a00e0);
  border: none;
  transition: all 0.3s ease;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(142, 45, 226, 0.6);
}
</style>
