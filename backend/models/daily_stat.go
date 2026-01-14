package models

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// DailyStat 代表每日统计数据
type DailyStat struct {
	ID                 int64  `json:"stat_id"`              // 统计记录的唯一标识ID
	Date               string `json:"date"`                 // 日期，格式: YYYY-MM-DD
	PomodoroCount      int    `json:"pomodoro_count"`       // 番茄工作法模式的完成次数
	CustomCount        int    `json:"custom_count"`         // 自定义专注模式的完成次数
	TotalFocusSessions int    `json:"total_focus_sessions"` // 当日专注会话总数（番茄+自定义）
	PomodoroMinutes    int    `json:"pomodoro_minutes"`     // 番茄工作法专注总分钟数
	CustomMinutes      int    `json:"custom_minutes"`       // 自定义专注总分钟数
	TotalFocusMinutes  int    `json:"total_focus_minutes"`  // 当日专注总时长（分钟）
	TotalBreakMinutes  int    `json:"total_break_minutes"`  // 当日休息总时长（分钟）
	TomatoHarvests     int    `json:"tomato_harvests"`      // 番茄收获数（完成的番茄钟次数）
	TimeRanges         string `json:"time_ranges"`          // 当日专注时段分布，JSON格式字符串数组，例如：["09:00~09:25", "11:00~11:25"]
}

// DailyStatRepository 提供对DailyStat表的操作
type DailyStatRepository struct {
	db Database
}

// NewDailyStatRepository 创建一个新的DailyStatRepository
func NewDailyStatRepository(db Database) *DailyStatRepository {
	return &DailyStatRepository{
		db: db,
	}
}

// GetByDateRange 获取指定日期范围内的统计数据
func (r *DailyStatRepository) GetByDateRange(startDate, endDate string) ([]DailyStat, error) {
	rows, err := DB.Query(`
		SELECT
			stat_id, date, pomodoro_count, custom_count,
			total_focus_sessions, total_focus_minutes, total_break_minutes,
			tomato_harvests, time_ranges
		FROM daily_stats
		WHERE date BETWEEN ? AND ?
		ORDER BY date ASC
	`, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []DailyStat
	for rows.Next() {
		var stat DailyStat
		err := rows.Scan(
			&stat.ID,
			&stat.Date,
			&stat.PomodoroCount,
			&stat.CustomCount,
			&stat.TotalFocusSessions,
			&stat.TotalFocusMinutes,
			&stat.TotalBreakMinutes,
			&stat.TomatoHarvests,
			&stat.TimeRanges,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// UpdateDailyStats 根据今天的专注会话更新每日统计数据
// 应该在每次专注会话结束时调用
func (r *DailyStatRepository) UpdateDailyStats(date string) error {
	log.Printf("[DailyStat] 开始更新日期 %s 的统计数据", date)

	// 获取指定日期的所有专注会话
	rows, err := r.db.Query(`
		SELECT
			start_time, end_time, break_time, duration, mode
		FROM focus_sessions
		WHERE date = ? AND end_time IS NOT NULL
	`, date)

	if err != nil {
		log.Printf("[DailyStat] 查询专注会话失败: %v", err)
		return err
	}
	defer rows.Close()

	var pomodoroCount, customCount, totalSessions int
	var pomodoroMinutes, customMinutes, totalFocusMinutes, totalBreakMinutes, tomatoHarvests int
	var timeRanges []string

	sessionCount := 0
	for rows.Next() {
		var startTime, endTime string
		var breakTime, duration, mode int

		err := rows.Scan(&startTime, &endTime, &breakTime, &duration, &mode)
		if err != nil {
			return err
		}

		// 解析时间
		start, err := parseTime(startTime)
		if err != nil {
			continue
		}
		end, err := parseTime(endTime)
		if err != nil {
			continue
		}

		// 根据模式计数和累计分钟数
		if mode == 0 { // 番茄模式
			pomodoroCount++
			pomodoroMinutes += duration
			// 每个番茄钟增加一个番茄收成
			tomatoHarvests++
		} else { // 自定义模式
			customCount++
			customMinutes += duration
		}

		totalSessions++
		totalFocusMinutes += duration
		totalBreakMinutes += breakTime

		// 添加时间段
		startHour, startMin := start.Hour(), start.Minute()
		endHour, endMin := end.Hour(), end.Minute()
		timeRange := formatTimeRange(startHour, startMin, endHour, endMin)
		timeRanges = append(timeRanges, timeRange)

		sessionCount++
	}

	log.Printf("[DailyStat] 找到 %d 个完成的专注会话", sessionCount)

	// 转换时间段为JSON
	timeRangesJSON, err := json.Marshal(timeRanges)
	if err != nil {
		return err
	}

	// 检查该日期是否已有记录
	var count int
	err = r.db.QueryRow(`SELECT COUNT(*) FROM daily_stats WHERE date = ?`, date).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		log.Printf("[DailyStat] 更新现有记录, 日期: %s", date)
		// 更新现有记录
		_, err = r.db.Exec(`
			UPDATE daily_stats
			SET
				pomodoro_count = ?,
				custom_count = ?,
				total_focus_sessions = ?,
				pomodoro_minutes = ?,
				custom_minutes = ?,
				total_focus_minutes = ?,
				total_break_minutes = ?,
				tomato_harvests = ?,
				time_ranges = ?
			WHERE date = ?
		`,
			pomodoroCount,
			customCount,
			totalSessions,
			pomodoroMinutes,
			customMinutes,
			totalFocusMinutes,
			totalBreakMinutes,
			tomatoHarvests,
			string(timeRangesJSON),
			date,
		)
	} else {
		log.Printf("[DailyStat] 插入新记录, 日期: %s", date)
		// 插入新记录
		_, err = r.db.Exec(`
			INSERT INTO daily_stats (
				date, pomodoro_count, custom_count,
				total_focus_sessions, pomodoro_minutes, custom_minutes,
				total_focus_minutes, total_break_minutes,
				tomato_harvests, time_ranges
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			date,
			pomodoroCount,
			customCount,
			totalSessions,
			pomodoroMinutes,
			customMinutes,
			totalFocusMinutes,
			totalBreakMinutes,
			tomatoHarvests,
			string(timeRangesJSON),
		)
	}

	log.Printf("[DailyStat] 更新完成 - 番茄:%d, 自定义:%d, 总时长:%d分钟",
		pomodoroCount, customCount, totalFocusMinutes)

	return err
}

// formatTimeRange 格式化时间范围为 "HH:MM~HH:MM" 格式
func formatTimeRange(startHour, startMin, endHour, endMin int) string {
	return fmt.Sprintf("%02d:%02d~%02d:%02d", startHour, startMin, endHour, endMin)
}

// parseTime 兼容解析多种时间格式
func parseTime(timeStr string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, f := range formats {
		t, err := time.Parse(f, timeStr)
		if err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析时间格式: %s", timeStr)
}
