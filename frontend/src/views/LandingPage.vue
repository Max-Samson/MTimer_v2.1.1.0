<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NIcon, NTooltip } from 'naive-ui'
import {
  Rocket,
  ChartLine,
  Bot,
  Time,
  Leaf,
  Sparkles,
  ArrowRight,
  Checkmark,
  TrendingUp
} from '@vicons/carbon'

const router = useRouter()

// 滚动动画状态
const activeSection = ref<string>('hero')

// 监听滚动，更新当前可见区域
const handleScroll = () => {
  const sections = document.querySelectorAll('.landing-section')
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect()
    if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
      activeSection.value = section.id
    }
  })
}

// 滚动到指定区域
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// 跳转到主应用
const goToApp = () => {
  router.push('/')
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

// 功能列表
const features = [
  {
    icon: Time,
    title: '番茄工作法',
    description: '经典的25分钟专注+5分钟休息模式，科学提升工作效率',
    color: '#ff6347'
  },
  {
    icon: Bot,
    title: 'AI智能助手',
    description: '接入DeepSeek、智谱等大模型，智能规划任务',
    color: '#8b5cf6'
  },
  {
    icon: ChartLine,
    title: '数据可视化',
    description: '直观的数据图表，追踪您的专注习惯和进步',
    color: '#32CD32'
  },
  {
    icon: Leaf,
    title: '自定义专注',
    description: '灵活设置工作时长和休息时间，适配个人节奏',
    color: '#10b981'
  }
]

// AI模型支持
const aiModels = [
  { name: 'DeepSeek', description: '强大的推理能力', icon: '🧠' },
  { name: '智谱AI', description: '中文理解专家', icon: '🌟' },
  { name: '通义千问', description: '阿里云大模型', icon: '☁️' },
  { name: 'OpenAI', description: '国际领先模型', icon: '🌐' }
]

// 数据统计示例
const statsData = [
  { value: '25', label: '分钟/番茄', icon: '🍅' },
  { value: '4+', label: '番茄/周期', icon: '🔄' },
  { value: '∞', label: '任务管理', icon: '📋' },
  { value: '100%', label: '数据本地', icon: '🔒' }
]
</script>

<template>
  <div class="landing-page">
    <!-- 导航栏 -->
    <nav class="landing-nav">
      <div class="nav-container">
        <div class="nav-logo">
          <div class="tomato-icon-mini"></div>
          <span class="nav-title">MTimer</span>
        </div>
        <div class="nav-links">
          <a @click.prevent="scrollToSection('features')" :class="{ active: activeSection === 'features' }">功能</a>
          <a @click.prevent="scrollToSection('ai')" :class="{ active: activeSection === 'ai' }">AI助手</a>
          <a @click.prevent="scrollToSection('stats')" :class="{ active: activeSection === 'stats' }">数据统计</a>
        </div>
        <n-button type="primary" class="nav-cta" @click="goToApp">
          开始使用
          <template #icon>
            <n-icon><ArrowRight /></n-icon>
          </template>
        </n-button>
      </div>
    </nav>

    <!-- Hero区域 -->
    <section id="hero" class="hero-section landing-section">
      <!-- 番茄藤蔓装饰背景 -->
      <div class="vine-decoration left-vine-bg"></div>
      <div class="vine-decoration right-vine-bg"></div>

      <div class="hero-content">
        <div class="hero-badge">
          <n-icon size="16"><Sparkles /></n-icon>
          <span>AI驱动的专注工具</span>
        </div>

        <h1 class="hero-title">
          <span class="title-gradient">番茄工作法</span>
          <br />
          <span class="title-accent">× AI智能助手</span>
        </h1>

        <p class="hero-description">
          MTimer 将经典的番茄工作法与先进的人工智能相结合，
          帮助您更高效地规划任务、保持专注、追踪进步
        </p>

        <div class="hero-buttons">
          <n-button type="primary" size="large" class="hero-cta-primary" @click="goToApp">
            <template #icon>
              <n-icon><Rocket /></n-icon>
            </template>
            立即开始
          </n-button>
          <n-button size="large" class="hero-cta-secondary" @click="scrollToSection('features')">
            了解更多
            <template #icon>
              <n-icon><ArrowRight /></n-icon>
            </template>
          </n-button>
        </div>

        <!-- 快速统计 -->
        <div class="hero-stats">
          <div v-for="stat in statsData" :key="stat.label" class="stat-item">
            <span class="stat-icon">{{ stat.icon }}</span>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 番茄动画装饰 -->
      <div class="hero-decoration">
        <div class="floating-tomato tomato-1">🍅</div>
        <div class="floating-tomato tomato-2">🍅</div>
        <div class="floating-tomato tomato-3">🍅</div>
      </div>
    </section>

    <!-- 功能特点区域 -->
    <section id="features" class="features-section landing-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            <n-icon size="32" color="#ff6347"><Sparkles /></n-icon>
            强大功能，简单易用
          </h2>
          <p class="section-subtitle">专为提升专注度和工作效率设计</p>
        </div>

        <div class="features-grid">
          <n-card
            v-for="feature in features"
            :key="feature.title"
            class="feature-card"
            :style="{ '--accent-color': feature.color }"
          >
            <template #header>
              <div class="feature-icon" :style="{ backgroundColor: `${feature.color}20`, color: feature.color }">
                <n-icon :size="28">
                  <component :is="feature.icon" />
                </n-icon>
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
            </template>
            <p class="feature-description">{{ feature.description }}</p>
          </n-card>
        </div>
      </div>
    </section>

    <!-- AI助手区域 -->
    <section id="ai" class="ai-section landing-section">
      <div class="ai-background">
        <div class="ai-grid-pattern"></div>
      </div>

      <div class="section-container">
        <div class="ai-content">
          <div class="ai-text">
            <div class="section-header">
              <div class="ai-badge">
                <n-icon size="18"><Bot /></n-icon>
                <span>AI Powered</span>
              </div>
              <h2 class="section-title">智能任务规划助手</h2>
              <p class="section-subtitle">
                接入多种大语言模型，根据您的需求智能规划任务，
                让专注更有方向
              </p>
            </div>

            <div class="ai-features">
              <div class="ai-feature-item">
                <div class="feature-check">
                  <n-icon size="20" color="#32CD32"><Checkmark /></n-icon>
                </div>
                <div>
                  <h4>智能任务拆解</h4>
                  <p>将大任务自动拆分为可管理的小任务</p>
                </div>
              </div>
              <div class="ai-feature-item">
                <div class="feature-check">
                  <n-icon size="20" color="#32CD32"><Checkmark /></n-icon>
                </div>
                <div>
                  <h4>专注建议</h4>
                  <p>根据工作习惯提供个性化建议</p>
                </div>
              </div>
              <div class="ai-feature-item">
                <div class="feature-check">
                  <n-icon size="20" color="#32CD32"><Checkmark /></n-icon>
                </div>
                <div>
                  <h4>多模式对话</h4>
                  <p>任务规划、日常聊天、学习助手</p>
                </div>
              </div>
            </div>

            <n-button type="primary" size="large" class="ai-cta" @click="goToApp">
              体验AI助手
              <template #icon>
                <n-icon><ArrowRight /></n-icon>
              </template>
            </n-button>
          </div>

          <!-- AI模型展示 -->
          <div class="ai-models-showcase">
            <div class="models-title">
              <n-icon size="24"><Bot /></n-icon>
              <span>支持的大模型</span>
            </div>
            <div class="ai-models">
              <div v-for="model in aiModels" :key="model.name" class="ai-model-card">
                <div class="model-icon">{{ model.icon }}</div>
                <div class="model-info">
                  <span class="model-name">{{ model.name }}</span>
                  <span class="model-desc">{{ model.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据统计区域 -->
    <section id="stats" class="stats-section landing-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            <n-icon size="32" color="#32CD32"><TrendingUp /></n-icon>
            数据可视化，洞察进步
          </h2>
          <p class="section-subtitle">直观的图表展示，让您清楚看到自己的成长</p>
        </div>

        <div class="stats-showcase">
          <div class="stat-card main-stat">
            <div class="stat-card-header">
              <n-icon size="24" color="#ff6347"><ChartLine /></n-icon>
              <span>周趋势分析</span>
            </div>
            <div class="mock-chart">
              <div class="chart-bars">
                <div class="chart-bar" style="height: 60%">
                  <div class="bar-label">周一</div>
                </div>
                <div class="chart-bar" style="height: 80%">
                  <div class="bar-label">周二</div>
                </div>
                <div class="chart-bar" style="height: 45%">
                  <div class="bar-label">周三</div>
                </div>
                <div class="chart-bar" style="height: 90%">
                  <div class="bar-label">周四</div>
                </div>
                <div class="chart-bar" style="height: 70%">
                  <div class="bar-label">周五</div>
                </div>
                <div class="chart-bar" style="height: 40%">
                  <div class="bar-label">周六</div>
                </div>
                <div class="chart-bar" style="height: 30%">
                  <div class="bar-label">周日</div>
                </div>
              </div>
            </div>
          </div>

          <div class="stat-cards">
            <div class="stat-card mini-stat">
              <div class="mini-stat-icon" style="background: #ff634720">
                <n-icon size="20" color="#ff6347"><Time /></n-icon>
              </div>
              <div class="mini-stat-content">
                <span class="mini-stat-value">125</span>
                <span class="mini-stat-label">今日专注分钟</span>
              </div>
            </div>
            <div class="stat-card mini-stat">
              <div class="mini-stat-icon" style="background: #8b5cf620">
                <n-icon size="20" color="#8b5cf6"><Bot /></n-icon>
              </div>
              <div class="mini-stat-content">
                <span class="mini-stat-value">8</span>
                <span class="mini-stat-label">完成任务数</span>
              </div>
            </div>
            <div class="stat-card mini-stat">
              <div class="mini-stat-icon" style="background: #32CD3220">
                <n-icon size="20" color="#32CD32"><TrendingUp /></n-icon>
              </div>
              <div class="mini-stat-content">
                <span class="mini-stat-value">+15%</span>
                <span class="mini-stat-label">较上周增长</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA区域 -->
    <section class="cta-section landing-section">
      <div class="cta-content">
        <div class="cta-decoration">
          <div class="tomato-circle"></div>
        </div>
        <h2 class="cta-title">准备好开始专注之旅了吗？</h2>
        <p class="cta-description">
          立即下载 MTimer，体验番茄工作法与AI助手的强大结合
        </p>
        <n-button type="primary" size="large" class="cta-button" @click="goToApp">
          <template #icon>
            <n-icon><Rocket /></n-icon>
          </template>
          免费开始使用
        </n-button>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-logo">
          <div class="tomato-icon-mini"></div>
          <span>MTimer</span>
        </div>
        <p class="footer-text">
          番茄工作法 × AI智能助手 —— 让专注更高效
        </p>
        <p class="footer-copyright">© 2024 MTimer. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 全局样式 */
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F0 0%, #FFFFFF 100%);
  overflow-x: hidden;
}

:root[data-theme="dark"] .landing-page {
  background: linear-gradient(135deg, #121824 0%, #1a1a2e 100%);
}

/* 导航栏 */
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 99, 71, 0.1);
  transition: all 0.3s ease;
}

:root[data-theme="dark"] .landing-nav {
  background: rgba(18, 24, 36, 0.9);
  border-bottom: 1px solid rgba(255, 99, 71, 0.2);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
  color: #ff6347;
}

.tomato-icon-mini {
  width: 28px;
  height: 28px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="70" r="40" fill="%23ff6347"/><path d="M50,30 C50,30 40,10 50,0 C60,10 50,30 50,30" fill="%23228B22" /><path d="M50,30 C50,30 20,20 10,5 C30,15 50,30 50,30" fill="%2332CD32" /><path d="M50,30 C50,30 80,20 90,5 C70,15 50,30 50,30" fill="%2332CD32" /></svg>');
  background-repeat: no-repeat;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: #666;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  cursor: pointer;
}

:root[data-theme="dark"] .nav-links a {
  color: #aaa;
}

.nav-links a:hover,
.nav-links a.active {
  color: #ff6347;
}

:root[data-theme="dark"] .nav-links a:hover,
:root[data-theme="dark"] .nav-links a.active {
  color: var(--primary-dark, #ff6b6b);
}

.nav-cta {
  border-radius: 20px;
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, #ff6347, #ff8566);
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 99, 71, 0.4);
}

/* Hero区域 */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem 4rem;
  position: relative;
  overflow: hidden;
}

.vine-decoration {
  position: absolute;
  width: 150px;
  height: 400px;
  opacity: 0.1;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 400"><path d="M50,0 C50,80 30,160 50,240 C70,320 50,400 50,400" stroke="%2332CD32" stroke-width="4" fill="none"/><path d="M50,80 C35,95 15,90 5,75" stroke="%2332CD32" stroke-width="3" fill="none"/><path d="M50,160 C35,175 15,170 5,155" stroke="%2332CD32" stroke-width="3" fill="none"/><path d="M50,240 C35,255 15,250 5,235" stroke="%2332CD32" stroke-width="3" fill="none"/><path d="M50,320 C35,335 15,330 5,315" stroke="%2332CD32" stroke-width="3" fill="none"/></svg>');
  background-repeat: no-repeat;
  pointer-events: none;
}

.left-vine-bg {
  left: 5%;
  top: 10%;
}

.right-vine-bg {
  right: 5%;
  top: 10%;
  transform: scaleX(-1);
}

.hero-content {
  max-width: 800px;
  text-align: center;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  color: #8b5cf6;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 2rem;
}

:root[data-theme="dark"] .hero-badge {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.title-gradient {
  background: linear-gradient(135deg, #ff6347, #ff8566);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-accent {
  color: #8b5cf6;
}

:root[data-theme="dark"] .title-accent {
  color: #a78bfa;
}

.hero-description {
  font-size: 1.25rem;
  color: #666;
  line-height: 1.8;
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

:root[data-theme="dark"] .hero-description {
  color: #aaa;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 3rem;
}

.hero-cta-primary {
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff6347, #ff8566);
  border: none;
  transition: all 0.3s ease;
}

.hero-cta-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(255, 99, 71, 0.4);
}

.hero-cta-secondary {
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 30px;
  background: transparent;
  border: 2px solid #ff6347;
  color: #ff6347;
  transition: all 0.3s ease;
}

:root[data-theme="dark"] .hero-cta-secondary {
  border-color: var(--primary-dark, #ff6b6b);
  color: var(--primary-dark, #ff6b6b);
}

.hero-cta-secondary:hover {
  background: rgba(255, 99, 71, 0.1);
  transform: translateY(-3px);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

:root[data-theme="dark"] .stat-item {
  background: rgba(30, 38, 52, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: #ff6347;
}

:root[data-theme="dark"] .stat-value {
  color: var(--primary-dark, #ff6b6b);
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
}

:root[data-theme="dark"] .stat-label {
  color: #888;
}

/* 浮动番茄装饰 */
.hero-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-tomato {
  position: absolute;
  font-size: 2rem;
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;
}

.tomato-1 {
  top: 15%;
  left: 10%;
  animation-delay: 0s;
}

.tomato-2 {
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.tomato-3 {
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(10deg);
  }
}

/* 功能区域 */
.features-section {
  padding: 6rem 2rem;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

:root[data-theme="dark"] .section-title {
  color: #eee;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #666;
}

:root[data-theme="dark"] .section-subtitle {
  color: #aaa;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.feature-card {
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .feature-card {
  background: rgba(30, 38, 52, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color);
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

:root[data-theme="dark"] .feature-title {
  color: #eee;
}

.feature-description {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

:root[data-theme="dark"] .feature-description {
  color: #aaa;
}

/* AI助手区域 */
.ai-section {
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
}

.ai-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02));
}

:root[data-theme="dark"] .ai-background {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
}

.ai-grid-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

.ai-content {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

@media (max-width: 968px) {
  .ai-content {
    grid-template-columns: 1fr;
  }
}

.ai-text {
  z-index: 1;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  color: #8b5cf6;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
}

.ai-features {
  margin: 2rem 0;
}

.ai-feature-item {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-check {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(50, 205, 50, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-feature-item h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

:root[data-theme="dark"] .ai-feature-item h4 {
  color: #eee;
}

.ai-feature-item p {
  color: #666;
  margin: 0;
  font-size: 0.9375rem;
}

:root[data-theme="dark"] .ai-feature-item p {
  color: #aaa;
}

.ai-cta {
  margin-top: 2rem;
  padding: 1rem 2rem;
  border-radius: 30px;
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  border: none;
  font-weight: 600;
}

.ai-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
}

/* AI模型展示 */
.ai-models-showcase {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] .ai-models-showcase {
  background: rgba(30, 38, 52, 0.9);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.models-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
}

:root[data-theme="dark"] .models-title {
  color: #eee;
}

.ai-models {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.ai-model-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

:root[data-theme="dark"] .ai-model-card {
  background: rgba(35, 42, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.05);
}

.ai-model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(139, 92, 246, 0.3);
}

.model-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.model-info {
  display: flex;
  flex-direction: column;
}

.model-name {
  font-weight: 600;
  color: #333;
}

:root[data-theme="dark"] .model-name {
  color: #eee;
}

.model-desc {
  font-size: 0.8125rem;
  color: #666;
}

:root[data-theme="dark"] .model-desc {
  color: #aaa;
}

/* 数据统计区域 */
.stats-section {
  padding: 6rem 2rem;
}

.stats-showcase {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .stats-showcase {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

:root[data-theme="dark"] .stat-card {
  background: rgba(30, 38, 52, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
}

:root[data-theme="dark"] .stat-card-header {
  color: #eee;
}

/* 模拟图表 */
.mock-chart {
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 1rem 0;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #ff6347, #ff8566);
  border-radius: 6px 6px 0 0;
  position: relative;
  transition: all 0.3s ease;
  min-height: 20%;
}

:root[data-theme="dark"] .chart-bar {
  background: linear-gradient(180deg, var(--primary-dark, #ff6b6b), #ff8566);
  box-shadow: 0 0 10px rgba(255, 99, 71, 0.3);
}

.chart-bar:hover {
  transform: scaleY(1.05);
  transform-origin: bottom;
}

.bar-label {
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
}

:root[data-theme="dark"] .bar-label {
  color: #aaa;
}

.stat-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
}

.mini-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-stat-content {
  display: flex;
  flex-direction: column;
}

.mini-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
}

:root[data-theme="dark"] .mini-stat-value {
  color: #eee;
}

.mini-stat-label {
  font-size: 0.875rem;
  color: #666;
}

:root[data-theme="dark"] .mini-stat-label {
  color: #aaa;
}

/* CTA区域 */
.cta-section {
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
}

.cta-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
}

.tomato-circle {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 99, 71, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
}

:root[data-theme="dark"] .tomato-circle {
  background: radial-gradient(circle, rgba(255, 99, 71, 0.15) 0%, transparent 70%);
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.cta-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1rem;
}

:root[data-theme="dark"] .cta-title {
  color: #eee;
}

.cta-description {
  font-size: 1.125rem;
  color: #666;
  margin-bottom: 2rem;
}

:root[data-theme="dark"] .cta-description {
  color: #aaa;
}

.cta-button {
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff6347, #ff8566);
  border: none;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(255, 99, 71, 0.4);
}

/* 页脚 */
.landing-footer {
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .landing-footer {
  background: rgba(18, 24, 36, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
  color: #ff6347;
  margin-bottom: 1rem;
}

.footer-text {
  color: #666;
  margin-bottom: 0.5rem;
}

:root[data-theme="dark"] .footer-text {
  color: #aaa;
}

.footer-copyright {
  color: #999;
  font-size: 0.875rem;
}

:root[data-theme="dark"] .footer-copyright {
  color: #888;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-description {
    font-size: 1rem;
  }

  .hero-buttons {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-title {
    font-size: 2rem;
  }

  .nav-links {
    display: none;
  }

  .ai-models {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
