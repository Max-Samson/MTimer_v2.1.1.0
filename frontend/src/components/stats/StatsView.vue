<template>
  <div class="stats-view">
    <n-card class="stats-card">
      <n-tabs type="line" animated>
        <n-tab-pane name="daily" tab="每日小结">
          <DailySummary />
        </n-tab-pane>
        <n-tab-pane name="pomodoro" tab="番茄统计">
          <PomodoroStats />
        </n-tab-pane>
        <n-tab-pane name="event" tab="任务统计">
          <EventStats />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NTabs, NTabPane } from 'naive-ui';
import DailySummary from './DailySummary.vue';
import PomodoroStats from './PomodoroStats.vue';
import EventStats from './EventStats.vue';
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-card {
  border-radius: 8px;
}

:deep(.n-tabs-nav) {
  padding: 0 10px;
}

:deep(.n-tab-pane) {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .stats-view {
    padding: 10px;
  }
}

:root[data-theme="dark"] .stats-view {
  background-color: transparent;
}
</style>
