<template>
    <div class="statistics-view">
        <h2>专注统计</h2>
        <div class="stats-container">
            <div class="stat-card">
                <h3>今日专注</h3>
                <div class="stat-value">0 分钟</div>
            </div>
            <div class="stat-card">
                <h3>本周专注</h3>
                <div class="stat-value">0 小时</div>
            </div>
            <div class="stat-card">
                <h3>完成番茄数</h3>
                <div class="stat-value">0 个</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.statistics-view {
    padding: 20px;
}

h2 {
    color: #333;
    margin-bottom: 24px;
    text-align: center;
}

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    padding: 0 20px;
}

.stat-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
    color: #666;
    margin-bottom: 12px;
    font-size: 16px;
}

.stat-value {
    color: #333;
    font-size: 24px;
    font-weight: bold;
}
</style>