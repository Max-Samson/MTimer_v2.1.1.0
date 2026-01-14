package models

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// BehaviorFeature AI 分析用的行为特征
// 从现有数据（daily_stats + focus_sessions + todos）计算得出，无需额外存储
//
// 设计理念：
// 1. 不创建新表，从现有数据实时计算
// 2. 提供结构化的行为特征向量供 AI 分析
// 3. 支持单日、周、月等多种时间范围的特征提取
type BehaviorFeature struct {
	Date string `json:"date"`

	// 基础统计指标
	TotalFocusMinutes int     `json:"total_focus_minutes"`
	PomodoroRatio     float64 `json:"pomodoro_ratio"`
	SessionCount      int     `json:"session_count"`
	AvgSessionLength  float64 `json:"avg_session_length"`

	// 时间分布特征
	FirstFocusTime string   `json:"first_focus_time"`
	LastFocusTime  string   `json:"last_focus_time"`
	PeakHours      []string `json:"peak_hours"`

	// 任务相关特征
	TaskDiversity  int `json:"task_diversity"`  // 当天专注的不同任务数
	CompletedTasks int `json:"completed_tasks"` // 当天完成的任务数

	// 休息特征
	BreakRatio float64 `json:"break_ratio"`

	// 对比特征
	ComparedToAvg      string  `json:"compared_to_avg"`       // "better", "same", "worse"
	ComparedToAvgRatio float64 `json:"compared_to_avg_ratio"` // 与平均值的比值

	// 连续性特征
	StreakDays int `json:"streak_days"` // 连续专注天数

	// 最佳时段
	BestHour string `json:"best_hour"` // 专注次数最多的小时

	// 原始数据引用（供 AI 深度分析）
	RawSessions []SessionDetail `json:"raw_sessions,omitempty"` // 原始会话详情
	RawStats    *DailyStat       `json:"raw_stats,omitempty"`    // 原始统计数据
}

// SessionDetail 会话详情（供 AI 分析用）
type SessionDetail struct {
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	Duration     int    `json:"duration"`
	BreakTime    int    `json:"break_time"`
	Mode         string `json:"mode"`          // "pomodoro" or "custom"
	TodoID       int64  `json:"todo_id"`
	TodoName     string `json:"todo_name,omitempty"` // 关联的任务名称
}

// BehaviorFeatureRepository 行为特征仓库
type BehaviorFeatureRepository struct {
	db            Database
	dailyStatRepo *DailyStatRepository
}

// NewBehaviorFeatureRepository 创建行为特征仓库
func NewBehaviorFeatureRepository(db Database) *BehaviorFeatureRepository {
	return &BehaviorFeatureRepository{
		db:            db,
		dailyStatRepo: NewDailyStatRepository(db),
	}
}

// GetBehaviorFeatures 计算指定日期的行为特征
// 这是给 AI 使用的核心接口，返回结构化的行为特征向量
func (r *BehaviorFeatureRepository) GetBehaviorFeatures(date string) (*BehaviorFeature, error) {
	log.Printf("[BehaviorFeature] 计算日期 %s 的行为特征", date)

	// 1. 获取基础统计数据
	stats, err := r.dailyStatRepo.GetByDateRange(date, date)
	if err != nil {
		log.Printf("[BehaviorFeature] 获取统计数据失败: %v", err)
		return nil, err
	}

	if len(stats) == 0 {
		log.Printf("[BehaviorFeature] 日期 %s 没有统计数据", date)
		return r.createEmptyFeature(date), nil
	}

	stat := stats[0]

	// 2. 解析 time_ranges 获取时间特征
	var timeRanges []string
	if err := json.Unmarshal([]byte(stat.TimeRanges), &timeRanges); err != nil {
		log.Printf("[BehaviorFeature] 解析 time_ranges 失败: %v", err)
		timeRanges = []string{}
	}

	firstFocus, lastFocus, peakHours, bestHour := r.extractTimeFeatures(timeRanges)

	// 3. 获取任务多样性（从 focus_sessions）
	taskDiversity := r.getTaskDiversity(date)

	// 4. 获取完成任务数（从 todos）
	completedTasks := r.getCompletedTasks(date)

	// 5. 计算对比特征（与过去7天对比）
	comparedToAvg, comparedToAvgRatio := r.compareWithAverage(date, stat.TotalFocusMinutes)

	// 6. 计算连续专注天数
	streakDays := r.calculateStreakDays(date)

	// 7. 计算番茄钟比例
	pomodoroRatio := 0.0
	if stat.TotalFocusSessions > 0 {
		pomodoroRatio = float64(stat.PomodoroCount) / float64(stat.TotalFocusSessions)
	}

	// 8. 计算平均单次时长
	avgSessionLength := 0.0
	if stat.TotalFocusSessions > 0 {
		avgSessionLength = float64(stat.TotalFocusMinutes) / float64(stat.TotalFocusSessions)
	}

	// 9. 计算休息比例
	breakRatio := 0.0
	if stat.TotalFocusMinutes > 0 {
		breakRatio = float64(stat.TotalBreakMinutes) / float64(stat.TotalFocusMinutes)
	}

	// 10. 获取原始会话数据（供 AI 深度分析）
	rawSessions := r.getSessionDetails(date)

	// 11. 构建特征对象
	feature := &BehaviorFeature{
		Date:               date,
		TotalFocusMinutes:  stat.TotalFocusMinutes,
		PomodoroRatio:      pomodoroRatio,
		SessionCount:       stat.TotalFocusSessions,
		AvgSessionLength:   avgSessionLength,
		FirstFocusTime:     firstFocus,
		LastFocusTime:      lastFocus,
		PeakHours:          peakHours,
		TaskDiversity:      taskDiversity,
		CompletedTasks:     completedTasks,
		BreakRatio:         breakRatio,
		ComparedToAvg:      comparedToAvg,
		ComparedToAvgRatio: comparedToAvgRatio,
		StreakDays:         streakDays,
		BestHour:           bestHour,
		RawSessions:        rawSessions,
		RawStats:           &stat,
	}

	log.Printf("[BehaviorFeature] 特征计算完成: 总时长=%d分钟, 会话数=%d, 番茄比=%.1f%%",
		feature.TotalFocusMinutes, feature.SessionCount, feature.PomodoroRatio*100)

	return feature, nil
}

// GetBehaviorFeaturesRange 获取日期范围内的行为特征
func (r *BehaviorFeatureRepository) GetBehaviorFeaturesRange(startDate, endDate string) ([]*BehaviorFeature, error) {
	log.Printf("[BehaviorFeature] 获取日期范围 %s 至 %s 的行为特征", startDate, endDate)

	// 计算日期范围
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, err
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, err
	}

	var features []*BehaviorFeature
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		feature, err := r.GetBehaviorFeatures(dateStr)
		if err != nil {
			log.Printf("[BehaviorFeature] 获取日期 %s 特征失败: %v", dateStr, err)
			continue
		}
		features = append(features, feature)
	}

	return features, nil
}

// ExportForAI 导出 AI 友好的数据格式
// 返回一个易于 AI 理解的结构化数据字符串
func (r *BehaviorFeatureRepository) ExportForAI(date string) (string, error) {
	feature, err := r.GetBehaviorFeatures(date)
	if err != nil {
		return "", err
	}

	// 生成 AI 友好的文本格式
	output := fmt.Sprintf(`# 用户行为数据报告 - %s

## 基础统计
- 总专注时长: %d 分钟
- 专注会话数: %d 次
- 平均单次时长: %.0f 分钟
- 番茄钟比例: %.1f%%

## 时间分布
- 首次专注: %s
- 最后专注: %s
- 最佳时段: %s
- 高峰时段: %v

## 任务情况
- 任务多样性: %d 个不同任务
- 完成任务数: %d 个
- 休息比例: %.1f%%

## 对比分析
- 与7天平均相比: %s (%.1f%%)

## 连续性
- 连续专注天数: %d 天

## 会话详情
`,
		feature.Date,
		feature.TotalFocusMinutes,
		feature.SessionCount,
		feature.AvgSessionLength,
		feature.PomodoroRatio*100,
		feature.FirstFocusTime,
		feature.LastFocusTime,
		feature.BestHour,
		feature.PeakHours,
		feature.TaskDiversity,
		feature.CompletedTasks,
		feature.BreakRatio*100,
		feature.ComparedToAvg,
		(feature.ComparedToAvgRatio-1)*100,
		feature.StreakDays,
	)

	// 添加会话详情
	for i, session := range feature.RawSessions {
		output += fmt.Sprintf("%d. %s - %s | %s模式 | %d分钟 | 任务: %s\n",
			i+1,
			session.StartTime,
			session.EndTime,
			session.Mode,
			session.Duration,
			session.TodoName,
		)
	}

	return output, nil
}

// getSessionDetails 获取会话详情（包含关联的任务名称）
func (r *BehaviorFeatureRepository) getSessionDetails(date string) []SessionDetail {
	rows, err := r.db.Query(`
		SELECT
			fs.start_time,
			fs.end_time,
			fs.duration,
			fs.break_time,
			fs.mode,
			fs.todo_id,
			coalesce(t.name, '未知任务') as todo_name
		FROM focus_sessions fs
		LEFT JOIN todos t ON fs.todo_id = t.todo_id
		WHERE fs.date = ? AND fs.end_time IS NOT NULL
		ORDER BY fs.start_time
	`, date)

	if err != nil {
		log.Printf("[BehaviorFeature] 获取会话详情失败: %v", err)
		return []SessionDetail{}
	}
	defer rows.Close()

	var sessions []SessionDetail
	for rows.Next() {
		var s SessionDetail
		var startTime, endTime string
		var mode int

		err := rows.Scan(&startTime, &endTime, &s.Duration, &s.BreakTime, &mode, &s.TodoID, &s.TodoName)
		if err != nil {
			log.Printf("[BehaviorFeature] 扫描会话行失败: %v", err)
			continue
		}

		s.StartTime = startTime
		s.EndTime = endTime
		s.Mode = map[int]string{0: "pomodoro", 1: "custom"}[mode]

		sessions = append(sessions, s)
	}

	return sessions
}

// extractTimeFeatures 从时间段提取时间特征
func (r *BehaviorFeatureRepository) extractTimeFeatures(timeRanges []string) (first, last string, peakHours []string, bestHour string) {
	if len(timeRanges) == 0 {
		return "", "", []string{}, ""
	}

	// 解析第一个和最后一个时间段
	first = extractStartTime(timeRanges[0])
	last = extractStartTime(timeRanges[len(timeRanges)-1])

	// 统计每个小时的专注次数
	hourCount := make(map[int]int)
	for _, tr := range timeRanges {
		hour := extractHour(tr)
		if hour >= 0 {
			hourCount[hour]++
		}
	}

	// 找出最佳时段（专注次数最多的小时）
	maxCount := 0
	for hour, count := range hourCount {
		if count > maxCount {
			maxCount = count
			bestHour = fmt.Sprintf("%02d:00-%02d:00", hour, hour+1)
		}
	}

	// 找出高峰时段（至少2次专注的小时）
	for hour, count := range hourCount {
		if count >= 2 {
			peakHours = append(peakHours, fmt.Sprintf("%02d:00-%02d:00", hour, hour+1))
		}
	}

	return first, last, peakHours, bestHour
}

// extractStartTime 从时间段字符串提取开始时间 "09:00~09:25" -> "09:00"
func extractStartTime(timeRange string) string {
	if len(timeRange) >= 5 {
		return timeRange[:5]
	}
	return ""
}

// extractHour 从时间段字符串提取小时 "09:00~09:25" -> 9
func extractHour(timeRange string) int {
	if len(timeRange) >= 2 {
		hour := int(timeRange[0]-'0')*10 + int(timeRange[1]-'0')
		if hour >= 0 && hour <= 23 {
			return hour
		}
	}
	return -1
}

// getTaskDiversity 获取任务多样性（当天专注的不同任务数）
func (r *BehaviorFeatureRepository) getTaskDiversity(date string) int {
	var count int
	err := r.db.QueryRow(`
		SELECT COUNT(DISTINCT todo_id)
		FROM focus_sessions
		WHERE date = ?
	`, date).Scan(&count)

	if err != nil {
		log.Printf("[BehaviorFeature] 获取任务多样性失败: %v", err)
		return 0
	}

	return count
}

// getCompletedTasks 获取完成任务数
func (r *BehaviorFeatureRepository) getCompletedTasks(date string) int {
	var count int
	err := r.db.QueryRow(`
		SELECT COUNT(*)
		FROM todos
		WHERE date(completed_at) = ?
	`, date).Scan(&count)

	if err != nil {
		log.Printf("[BehaviorFeature] 获取完成任务数失败: %v", err)
		return 0
	}

	return count
}

// compareWithAverage 与过去7天平均水平对比
func (r *BehaviorFeatureRepository) compareWithAverage(date string, todayMinutes int) (string, float64) {
	var avgMinutes float64
	err := r.db.QueryRow(`
		SELECT AVG(total_focus_minutes)
		FROM daily_stats
		WHERE date >= date(?, '-7 days') AND date < ? AND total_focus_minutes > 0
	`, date, date).Scan(&avgMinutes)

	if err != nil || avgMinutes == 0 {
		return "same", 1.0
	}

	ratio := float64(todayMinutes) / avgMinutes

	if ratio > 1.2 {
		return "better", ratio
	} else if ratio < 0.8 {
		return "worse", ratio
	}
	return "same", ratio
}

// calculateStreakDays 计算连续专注天数
func (r *BehaviorFeatureRepository) calculateStreakDays(date string) int {
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return 0
	}

	streak := 0
	for i := 0; i < 366; i++ { // 最多查找一年
		checkDate := targetDate.AddDate(0, 0, -i).Format("2006-01-02")

		var count int
		err := r.db.QueryRow(`
			SELECT COUNT(*)
			FROM daily_stats
			WHERE date = ? AND total_focus_minutes > 0
		`, checkDate).Scan(&count)

		if err != nil || count == 0 {
			break
		}
		streak++
	}

	return streak
}

// createEmptyFeature 创建空特征对象
func (r *BehaviorFeatureRepository) createEmptyFeature(date string) *BehaviorFeature {
	return &BehaviorFeature{
		Date:               date,
		TotalFocusMinutes:  0,
		PomodoroRatio:      0,
		SessionCount:       0,
		AvgSessionLength:   0,
		FirstFocusTime:     "",
		LastFocusTime:      "",
		PeakHours:          []string{},
		TaskDiversity:      0,
		CompletedTasks:     0,
		BreakRatio:         0,
		ComparedToAvg:      "same",
		ComparedToAvgRatio: 1.0,
		StreakDays:         0,
		BestHour:           "",
		RawSessions:        []SessionDetail{},
		RawStats:           nil,
	}
}

// GetWeeklySummary 获取周总结数据（用于周报）
func (r *BehaviorFeatureRepository) GetWeeklySummary(endDate string) (*WeeklySummary, error) {
	log.Printf("[BehaviorFeature] 获取截至 %s 的周总结", endDate)

	// 获取过去7天的特征
	startDate := time.Now().AddDate(0, 0, -6).Format("2006-01-02")
	features, err := r.GetBehaviorFeaturesRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	summary := &WeeklySummary{
		StartDate: startDate,
		EndDate:   endDate,
		Days:      len(features),
	}

	// 计算汇总数据
	totalMinutes := 0
	totalSessions := 0
	bestDay := &BehaviorFeature{TotalFocusMinutes: -1}

	for _, f := range features {
		totalMinutes += f.TotalFocusMinutes
		totalSessions += f.SessionCount

		// 找出最佳日
		if f.TotalFocusMinutes > bestDay.TotalFocusMinutes {
			bestDay = f
		}
	}

	if len(features) > 0 {
		summary.TotalFocusMinutes = totalMinutes
		summary.AvgDailyMinutes = totalMinutes / len(features)
		summary.TotalSessions = totalSessions
		summary.BestDay = bestDay
	}

	return summary, nil
}

// WeeklySummary 周总结
type WeeklySummary struct {
	StartDate         string             `json:"start_date"`
	EndDate           string             `json:"end_date"`
	Days              int                `json:"days"`
	TotalFocusMinutes int                `json:"total_focus_minutes"`
	AvgDailyMinutes   int                `json:"avg_daily_minutes"`
	TotalSessions     int                `json:"total_sessions"`
	BestDay           *BehaviorFeature   `json:"best_day"`
}
