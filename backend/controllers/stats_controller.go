package controllers

import (
	"encoding/json"
	"time"

	"MTimer/backend/controllers/types"
	"MTimer/backend/models"
)

// StatsController 处理统计数据相关的请求
type StatsController struct {
	dailyStatRepo    *models.DailyStatRepository
	focusSessionRepo *models.FocusSessionRepository
}

// NewStatsController 创建一个新的StatsController
func NewStatsController() *StatsController {
	return &StatsController{
		dailyStatRepo:    models.NewDailyStatRepository(),
		focusSessionRepo: models.NewFocusSessionRepository(),
	}
}

// GetStats 获取统计数据
func (c *StatsController) GetStats(req types.GetStatsRequest) ([]*types.StatResponse, error) {
	// 验证日期格式
	if req.StartDate == "" {
		// 默认为过去7天
		req.StartDate = time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	}

	if req.EndDate == "" {
		// 默认为今天
		req.EndDate = time.Now().Format("2006-01-02")
	}

	// 获取统计数据
	stats, err := c.dailyStatRepo.GetByDateRange(req.StartDate, req.EndDate)
	if err != nil {
		return nil, err
	}

	var response []*types.StatResponse
	for _, stat := range stats {
		var timeRanges []string
		// 解析JSON字符串为字符串数组
		if err := json.Unmarshal([]byte(stat.TimeRanges), &timeRanges); err != nil {
			// 如果解析失败，使用空数组
			timeRanges = []string{}
		}

		response = append(response, &types.StatResponse{
			Date:               stat.Date,
			PomodoroCount:      stat.PomodoroCount,
			CustomCount:        stat.CustomCount,
			TotalFocusSessions: stat.TotalFocusSessions,
			TotalFocusMinutes:  stat.TotalFocusMinutes,
			TotalBreakMinutes:  stat.TotalBreakMinutes,
			TomatoHarvests:     stat.TomatoHarvests,
			TimeRanges:         timeRanges,
		})
	}

	return response, nil
}

// UpdateStats 手动更新指定日期的统计数据
func (c *StatsController) UpdateStats(date string) (types.BasicResponse, error) {
	// 如果未提供日期，使用今天的日期
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	err := c.dailyStatRepo.UpdateDailyStats(date)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新统计数据失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "统计数据更新成功",
	}, nil
}

// GetSummary 获取概要统计信息
func (c *StatsController) GetSummary() (*types.StatSummary, error) {
	// 获取总数据
	totalPomodoros, err := models.DB.Query(`
		SELECT COUNT(*) FROM focus_sessions WHERE mode = 0 AND end_time IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer totalPomodoros.Close()

	var pomodoroCount int
	if totalPomodoros.Next() {
		err = totalPomodoros.Scan(&pomodoroCount)
		if err != nil {
			return nil, err
		}
	}

	// 获取总专注时间
	totalMinutes, err := models.DB.Query(`
		SELECT SUM(duration) FROM focus_sessions WHERE end_time IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer totalMinutes.Close()

	var focusMinutes int
	if totalMinutes.Next() {
		err = totalMinutes.Scan(&focusMinutes)
		if err != nil {
			return nil, err
		}
	}

	// 获取连续专注天数
	today := time.Now().Format("2006-01-02")
	streakDays, err := c.calculateStreakDays(today)
	if err != nil {
		return nil, err
	}

	return &types.StatSummary{
		TotalPomodoroCount: pomodoroCount,
		TotalFocusMinutes:  focusMinutes,
		TotalFocusHours:    float64(focusMinutes) / 60.0,
		StreakDays:         streakDays,
	}, nil
}

// calculateStreakDays 计算连续专注天数
func (c *StatsController) calculateStreakDays(today string) (int, error) {
	// 从today开始向前查找连续的专注记录
	todayDate, err := time.Parse("2006-01-02", today)
	if err != nil {
		return 0, err
	}

	streak := 0
	for i := 0; i < 366; i++ { // 最多查找一年
		checkDate := todayDate.AddDate(0, 0, -i).Format("2006-01-02")

		// 检查该天是否有专注记录
		var count int
		err := models.DB.QueryRow(`
			SELECT COUNT(*) FROM focus_sessions 
			WHERE DATE(start_time) = ? AND end_time IS NOT NULL
		`, checkDate).Scan(&count)

		if err != nil {
			return streak, err
		}

		if count > 0 {
			streak++
		} else {
			// 连续中断，结束计算
			break
		}
	}

	return streak, nil
}
