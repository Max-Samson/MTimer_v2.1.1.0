package types

// DeepSeekMessage 表示DeepSeek API的单条消息
type DeepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// DeepSeekAPIRequest 表示发送到DeepSeek API的请求
type DeepSeekAPIRequest struct {
	Model    string            `json:"model"`
	Messages []DeepSeekMessage `json:"messages"`
	Stream   bool              `json:"stream"`
	ApiKey   string            `json:"api_key,omitempty"` // 可选API密钥，不发送到DeepSeek API
}

// DeepSeekChoice 表示API返回的选择
type DeepSeekChoice struct {
	Index   int              `json:"index"`
	Message DeepSeekMessage  `json:"message"`
	Delta   *DeepSeekMessage `json:"delta,omitempty"` // 用于流式响应
}

// TokenUsage 表示API使用的token数量
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// DeepSeekAPIResponse 表示从DeepSeek API接收到的响应
type DeepSeekAPIResponse struct {
	ID      string           `json:"id"`
	Object  string           `json:"object"`
	Created int64            `json:"created"`
	Model   string           `json:"model"`
	Choices []DeepSeekChoice `json:"choices"`
	Usage   TokenUsage       `json:"usage"`
}

// TaskPlan 表示AI生成的任务计划
type TaskPlan struct {
	Name          string `json:"name"`
	Mode          string `json:"mode"`
	FocusDuration int    `json:"focusDuration"`
	BreakDuration int    `json:"breakDuration"`
}

// TaskResponse 表示处理后的任务计划响应
type TaskResponse struct {
	Content  string     `json:"content"`
	TaskData []TaskPlan `json:"taskData,omitempty"`
}

// DailyInsightResponse 每日洞察响应
type DailyInsightResponse struct {
	Date          string   `json:"date"`
	Summary       string   `json:"summary"`
	Score         int      `json:"score"`
	Highlights    []string `json:"highlights"`
	Improvements  []string `json:"improvements"`
	RiskAlerts    []string `json:"risk_alerts"`
	NextDayTips   []string `json:"next_day_tips"`
}

// WeeklyInsightResponse 周洞察响应
type WeeklyInsightResponse struct {
	StartDate    string   `json:"start_date"`
	EndDate      string   `json:"end_date"`
	Summary      string   `json:"summary"`
	TotalMinutes int      `json:"total_minutes"`
	AvgMinutes   int      `json:"avg_minutes"`
	BestDay      string   `json:"best_day"`
	Achievements []string `json:"achievements"`
	Suggestions  []string `json:"suggestions"`
}

// BehaviorFeatureResponse 行为特征响应
type BehaviorFeatureResponse struct {
	Date               string   `json:"date"`
	TotalFocusMinutes  int      `json:"total_focus_minutes"`
	PomodoroRatio      float64  `json:"pomodoro_ratio"`
	SessionCount       int      `json:"session_count"`
	AvgSessionLength   float64  `json:"avg_session_length"`
	FirstFocusTime     string   `json:"first_focus_time"`
	LastFocusTime      string   `json:"last_focus_time"`
	PeakHours          []string `json:"peak_hours"`
	TaskDiversity      int      `json:"task_diversity"`
	CompletedTasks     int      `json:"completed_tasks"`
	BreakRatio         float64  `json:"break_ratio"`
	ComparedToAvg      string   `json:"compared_to_avg"`
	ComparedToAvgRatio float64  `json:"compared_to_avg_ratio"`
	StreakDays         int      `json:"streak_days"`
	BestHour           string   `json:"best_hour"`
}
