package models

import (
	"fmt"
)

// EventStat 表示任务历史统计数据
type EventStat struct {
	EventID        int64  `json:"event_id"`         // 对应todos表的todo_id
	Date           string `json:"date"`             // 格式：YYYY-MM-DD
	FocusCount     int    `json:"focus_count"`      // 该任务在这天的专注次数
	TotalFocusTime int    `json:"total_focus_time"` // 累计专注时长（分钟）
	Mode           int    `json:"mode"`             // 任务模式
	Completed      bool   `json:"completed"`        // 是否完成
}

// EventStatRepository 提供对EventStat表的操作
type EventStatRepository struct{}

// NewEventStatRepository 创建一个新的EventStatRepository
func NewEventStatRepository() *EventStatRepository {
	return &EventStatRepository{}
}

// UpdateEventStats 更新指定日期和任务的统计数据
func (r *EventStatRepository) UpdateEventStats(todoID int64, date string) error {
	// 获取任务信息
	var mode int
	var status string
	var isCompleted bool

	err := DB.QueryRow(`
		SELECT mode, status FROM todos WHERE todo_id = ?
	`, todoID).Scan(&mode, &status)

	if err != nil {
		return err
	}

	isCompleted = (status == "completed")

	// 获取该任务在指定日期的专注会话数据
	rows, err := DB.Query(`
		SELECT COUNT(*), SUM(duration)
		FROM focus_sessions
		WHERE todo_id = ? AND DATE(start_time) = ? AND end_time IS NOT NULL
	`, todoID, date)

	if err != nil {
		return err
	}
	defer rows.Close()

	var focusCount, totalFocusTime int
	if rows.Next() {
		var sumDuration *int // 使用指针以处理NULL值
		if err := rows.Scan(&focusCount, &sumDuration); err != nil {
			return err
		}

		if sumDuration != nil {
			totalFocusTime = *sumDuration
		}
	}

	// 检查是否已有记录
	var count int
	err = DB.QueryRow(`
		SELECT COUNT(*) FROM event_stats
		WHERE event_id = ? AND date = ?
	`, todoID, date).Scan(&count)

	if err != nil {
		return err
	}

	// 插入或更新记录
	if count > 0 {
		_, err = DB.Exec(`
			UPDATE event_stats
			SET focus_count = ?, total_focus_time = ?, mode = ?, completed = ?
			WHERE event_id = ? AND date = ?
		`, focusCount, totalFocusTime, mode, isCompleted, todoID, date)
	} else if focusCount > 0 {
		// 只有在有专注记录时才创建统计记录
		_, err = DB.Exec(`
			INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
			VALUES (?, ?, ?, ?, ?, ?)
		`, todoID, date, focusCount, totalFocusTime, mode, isCompleted)
	}

	return err
}

// GetEventStatsByDateRange 获取指定日期范围内的任务统计数据
func (r *EventStatRepository) GetEventStatsByDateRange(startDate, endDate string) ([]EventStat, error) {
	rows, err := DB.Query(`
		SELECT event_id, date, focus_count, total_focus_time, mode, completed
		FROM event_stats
		WHERE date BETWEEN ? AND ?
		ORDER BY date ASC, event_id ASC
	`, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []EventStat
	for rows.Next() {
		var stat EventStat
		err := rows.Scan(
			&stat.EventID,
			&stat.Date,
			&stat.FocusCount,
			&stat.TotalFocusTime,
			&stat.Mode,
			&stat.Completed,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// GetEventStatsForTodo 获取指定任务的统计数据
func (r *EventStatRepository) GetEventStatsForTodo(todoID int64, startDate, endDate string) ([]EventStat, error) {
	rows, err := DB.Query(`
		SELECT event_id, date, focus_count, total_focus_time, mode, completed
		FROM event_stats
		WHERE event_id = ? AND date BETWEEN ? AND ?
		ORDER BY date ASC
	`, todoID, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []EventStat
	for rows.Next() {
		var stat EventStat
		err := rows.Scan(
			&stat.EventID,
			&stat.Date,
			&stat.FocusCount,
			&stat.TotalFocusTime,
			&stat.Mode,
			&stat.Completed,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// GetCompletionStats 获取指定日期范围内的完成率统计
func (r *EventStatRepository) GetCompletionStats(startDate, endDate string) (map[string]interface{}, error) {
	// 查询指定时间段内的任务完成情况
	rows, err := DB.Query(`
		SELECT
			COUNT(DISTINCT event_id) as total_events,
			SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_events
		FROM event_stats
		WHERE date BETWEEN ? AND ?
	`, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var totalEvents, completedEvents int
	if rows.Next() {
		err := rows.Scan(&totalEvents, &completedEvents)
		if err != nil {
			return nil, err
		}
	}

	// 计算完成率
	completionRate := 0.0
	if totalEvents > 0 {
		completionRate = float64(completedEvents) / float64(totalEvents) * 100
	}

	return map[string]interface{}{
		"total_events":     totalEvents,
		"completed_events": completedEvents,
		"completion_rate":  fmt.Sprintf("%.2f", completionRate),
	}, nil
}
