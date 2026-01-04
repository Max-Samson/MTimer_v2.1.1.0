package models

import (
	"database/sql"
	"time"

	"MTimer/backend/errors"
	"MTimer/backend/logger"
)

// FocusSession 代表专注时间记录
type FocusSession struct {
	ID        int64     `json:"time_id"`    // 专注会话的唯一标识ID
	TodoID    int64     `json:"todo_id"`    // 关联的待办事项ID
	StartTime time.Time `json:"start_time"` // 专注开始时间
	EndTime   time.Time `json:"end_time"`   // 专注结束时间，未结束时为零值
	BreakTime int       `json:"break_time"` // 休息时间，单位：分钟
	Duration  int       `json:"duration"`   // 实际专注时长，单位：分钟，不包括休息时间
	Mode      int       `json:"mode"`       // 专注模式: 0=番茄工作法(25分钟), 1=自定义专注模式
}

// FocusSessionRepository 提供对FocusSession表的操作
type FocusSessionRepository struct {
	db Database
}

// NewFocusSessionRepository 创建一个新的FocusSessionRepository
func NewFocusSessionRepository(db Database) *FocusSessionRepository {
	return &FocusSessionRepository{
		db: db,
	}
}

// Create 创建新的专注会话
func (r *FocusSessionRepository) Create(session *FocusSession) error {
	logger.WithField("todo_id", session.TodoID).Debug("创建新的专注会话")

	var endTimeStr interface{} = nil
	if !session.EndTime.IsZero() {
		endTimeStr = session.EndTime.Format(time.RFC3339)
	}

	result, err := r.db.Exec(`
		INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		session.TodoID,
		session.StartTime.Format(time.RFC3339),
		endTimeStr,
		session.BreakTime,
		session.Duration,
		session.Mode,
	)

	if err != nil {
		logger.WithError(err).WithField("todo_id", session.TodoID).Error("插入专注会话失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_INSERT_FAILED", "创建专注会话失败", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		logger.WithError(err).Error("获取插入ID失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_LAST_INSERT_ID_FAILED", "获取专注会话ID失败", err)
	}

	session.ID = id
	logger.WithField("id", id).Debug("专注会话创建成功")
	return nil
}

// GetByTodoID 获取指定待办事项的所有专注会话
func (r *FocusSessionRepository) GetByTodoID(todoID int64) ([]FocusSession, error) {
	logger.WithField("todo_id", todoID).Debug("获取指定待办事项的所有专注会话")

	rows, err := r.db.Query(`
		SELECT time_id, todo_id, start_time, end_time, break_time, duration, mode
		FROM focus_sessions
		WHERE todo_id = ?
		ORDER BY start_time DESC
	`, todoID)

	if err != nil {
		logger.WithError(err).WithField("todo_id", todoID).Error("查询专注会话失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_QUERY_FAILED", "查询专注会话失败", err)
	}
	defer rows.Close()

	var sessions []FocusSession
	for rows.Next() {
		var session FocusSession
		var startTime, endTime string

		err := rows.Scan(
			&session.ID,
			&session.TodoID,
			&startTime,
			&endTime,
			&session.BreakTime,
			&session.Duration,
			&session.Mode,
		)

		if err != nil {
			logger.WithError(err).WithField("todo_id", todoID).Error("扫描专注会话行失败")
			return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_SCAN_FAILED", "扫描专注会话数据失败", err)
		}

		session.StartTime, _ = time.Parse(time.RFC3339, startTime)
		session.EndTime, _ = time.Parse(time.RFC3339, endTime)
		sessions = append(sessions, session)
	}

	if err = rows.Err(); err != nil {
		logger.WithError(err).WithField("todo_id", todoID).Error("遍历专注会话结果集失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_ITERATION_FAILED", "遍历专注会话数据失败", err)
	}

	logger.WithFields(map[string]interface{}{
		"todo_id": todoID,
		"count":   len(sessions),
	}).Debug("成功获取专注会话列表")

	return sessions, nil
}

// StartSession 开始一个专注会话
func (r *FocusSessionRepository) StartSession(todoID int64, mode int) (*FocusSession, error) {
	logger.WithFields(map[string]interface{}{
		"todo_id": todoID,
		"mode":    mode,
	}).Debug("开始专注会话")

	now := time.Now()

	session := &FocusSession{
		TodoID:    todoID,
		StartTime: now,
		EndTime:   time.Time{}, // 空时间，表示尚未结束
		BreakTime: 0,
		Duration:  0,
		Mode:      mode,
	}

	result, err := r.db.Exec(`
		INSERT INTO focus_sessions (todo_id, start_time, mode)
		VALUES (?, ?, ?)
	`,
		session.TodoID,
		session.StartTime.Format(time.RFC3339),
		session.Mode,
	)

	if err != nil {
		logger.WithError(err).WithField("todo_id", todoID).Error("创建专注会话失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_INSERT_FAILED", "开始专注会话失败", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		logger.WithError(err).Error("获取专注会话ID失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_LAST_INSERT_ID_FAILED", "获取专注会话ID失败", err)
	}

	session.ID = id
	logger.WithField("id", id).Debug("专注会话开始成功")
	return session, nil
}

// CompleteSession 完成一个专注会话
func (r *FocusSessionRepository) CompleteSession(sessionID int64, breakTime int) error {
	logger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"break_time": breakTime,
	}).Debug("完成专注会话")

	now := time.Now()

	// 先获取开始时间
	var startTimeStr string
	err := r.db.QueryRow(`
		SELECT start_time FROM focus_sessions WHERE time_id = ?
	`, sessionID).Scan(&startTimeStr)

	if err != nil {
		if err == sql.ErrNoRows {
			logger.WithField("session_id", sessionID).Warn("专注会话不存在")
			return errors.Wrap(errors.ErrorTypeNotFound, "SESSION_NOT_FOUND", "专注会话不存在", err)
		}
		logger.WithError(err).WithField("session_id", sessionID).Error("查询专注会话开始时间失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_QUERY_FAILED", "查询专注会话失败", err)
	}

	startTime, err := parseTime(startTimeStr)
	if err != nil {
		logger.WithError(err).WithField("start_time_str", startTimeStr).Error("解析开始时间失败")
		return errors.Wrap(errors.ErrorTypeInternal, "TIME_PARSE_FAILED", "解析专注会话开始时间失败", err)
	}

	// 计算持续时间（分钟）
	duration := int(now.Sub(startTime).Minutes()) - breakTime
	if duration < 0 {
		duration = 0
	}

	// 更新会话
	_, err = r.db.Exec(`
		UPDATE focus_sessions
		SET end_time = ?, break_time = ?, duration = ?
		WHERE time_id = ?
	`,
		now.Format(time.RFC3339),
		breakTime,
		duration,
		sessionID,
	)

	if err != nil {
		logger.WithError(err).WithField("session_id", sessionID).Error("更新专注会话失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_UPDATE_FAILED", "完成专注会话失败", err)
	}

	logger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"duration":   duration,
	}).Debug("专注会话完成成功")

	return nil
}

// GetUnfinishedSession 获取待办事项的未完成会话
func (r *FocusSessionRepository) GetUnfinishedSession(todoID int64) (*FocusSession, error) {
	logger.WithField("todo_id", todoID).Debug("获取未完成的专注会话")

	var session FocusSession
	var startTime string

	err := r.db.QueryRow(`
		SELECT time_id, todo_id, start_time, mode
		FROM focus_sessions
		WHERE todo_id = ? AND end_time IS NULL
		LIMIT 1
	`, todoID).Scan(&session.ID, &session.TodoID, &startTime, &session.Mode)

	if err != nil {
		if err == sql.ErrNoRows {
			// 没有找到未完成的会话，这不是错误
			logger.WithField("todo_id", todoID).Debug("没有找到未完成的专注会话")
			return nil, nil
		}
		logger.WithError(err).WithField("todo_id", todoID).Error("查询未完成专注会话失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_QUERY_FAILED", "查询未完成专注会话失败", err)
	}

	session.StartTime, err = time.Parse(time.RFC3339, startTime)
	if err != nil {
		logger.WithError(err).WithField("start_time_str", startTime).Warn("解析专注会话开始时间失败")
	}

	logger.WithFields(map[string]interface{}{
		"todo_id":    todoID,
		"session_id": session.ID,
	}).Debug("找到未完成的专注会话")

	return &session, nil
}
