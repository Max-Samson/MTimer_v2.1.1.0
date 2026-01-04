package models

import (
	"database/sql"
	"time"

	"MTimer/backend/errors"
	"MTimer/backend/logger"
)

// Todo 表示待办事项
type Todo struct {
	ID                 int64      `json:"id"`                  // 待办事项的唯一标识ID
	Name               string     `json:"name"`                // 待办事项名称
	Mode               int        `json:"mode"`                // 专注模式: 0=番茄工作法, 1=自定义专注模式
	Status             string     `json:"status"`              // 状态: pending=待处理, inProgress=进行中, completed=已完成
	CreatedAt          time.Time  `json:"created_at"`          // 创建时间
	UpdatedAt          time.Time  `json:"updated_at"`          // 最后更新时间
	EstimatedPomodoros int        `json:"estimated_pomodoros"` // 预计需要的番茄钟数量
	CustomSettings     string     `json:"custom_settings"`     // 自定义设置，JSON格式字符串
	CompletedAt        *time.Time `json:"completed_at"`        // 任务完成时间，未完成时为nil
}

// TodoRepository 提供对Todo表的操作
type TodoRepository struct {
	db Database
}

// NewTodoRepository 创建一个新的TodoRepository
func NewTodoRepository(db Database) *TodoRepository {
	return &TodoRepository{
		db: db,
	}
}

// GetAll 获取所有待办事项
func (r *TodoRepository) GetAll() ([]*Todo, error) {
	logger.Debug("获取所有待办事项")

	rows, err := r.db.Query(`
		SELECT todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings, completed_at
		FROM todos
		ORDER BY updated_at DESC
	`)
	if err != nil {
		logger.WithError(err).Error("查询所有待办事项失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_QUERY_FAILED", "查询待办事项失败", err)
	}
	defer rows.Close()

	var todos []*Todo
	for rows.Next() {
		var todo Todo
		var createdAt, updatedAt string
		var completedAt sql.NullString
		var customSettings sql.NullString

		err := rows.Scan(
			&todo.ID,
			&todo.Name,
			&todo.Mode,
			&todo.Status,
			&createdAt,
			&updatedAt,
			&todo.EstimatedPomodoros,
			&customSettings,
			&completedAt,
		)
		if err != nil {
			logger.WithError(err).Error("扫描待办事项行失败")
			return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_SCAN_FAILED", "扫描待办事项数据失败", err)
		}

		// 处理可能的日期解析错误
		todo.CreatedAt, err = time.Parse(time.RFC3339, createdAt)
		if err != nil {
			logger.WithError(err).WithField("raw_value", createdAt).Warn("解析创建时间失败，使用当前时间")
			todo.CreatedAt = time.Now()
		}

		todo.UpdatedAt, err = time.Parse(time.RFC3339, updatedAt)
		if err != nil {
			logger.WithError(err).WithField("raw_value", updatedAt).Warn("解析更新时间失败，使用当前时间")
			todo.UpdatedAt = time.Now()
		}

		// 处理完成时间
		if completedAt.Valid {
			parsedTime, err := time.Parse(time.RFC3339, completedAt.String)
			if err != nil {
				logger.WithError(err).WithField("raw_value", completedAt.String).Warn("解析完成时间失败")
			} else {
				todo.CompletedAt = &parsedTime
			}
		}

		// 处理可能为NULL的customSettings
		if customSettings.Valid {
			todo.CustomSettings = customSettings.String
		} else {
			todo.CustomSettings = ""
		}

		todos = append(todos, &todo)
	}

	// 检查迭代过程中是否有错误
	if err = rows.Err(); err != nil {
		logger.WithError(err).Error("遍历待办事项结果集失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_ITERATION_FAILED", "遍历待办事项数据失败", err)
	}

	logger.WithField("count", len(todos)).Debug("成功获取待办事项列表")
	return todos, nil
}

// Create 创建新的待办事项
func (r *TodoRepository) Create(todo *Todo) error {
	logger.WithField("name", todo.Name).Debug("创建新的待办事项")

	now := time.Now()
	todo.CreatedAt = now
	todo.UpdatedAt = now

	result, err := r.db.Exec(`
		INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, todo.Name, todo.Mode, todo.Status, now.Format(time.RFC3339), now.Format(time.RFC3339),
		todo.EstimatedPomodoros, todo.CustomSettings)

	if err != nil {
		logger.WithError(err).WithField("name", todo.Name).Error("插入待办事项失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_INSERT_FAILED", "创建待办事项失败", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		logger.WithError(err).Error("获取插入ID失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_LAST_INSERT_ID_FAILED", "获取待办事项ID失败", err)
	}

	todo.ID = id
	logger.WithField("id", id).Debug("待办事项创建成功")
	return nil
}

// Update 更新已存在的待办事项
func (r *TodoRepository) Update(todo *Todo) error {
	logger.WithField("id", todo.ID).WithField("name", todo.Name).Debug("更新待办事项")

	// 更新更新时间
	todo.UpdatedAt = time.Now()

	_, err := r.db.Exec(`
		UPDATE todos
		SET name = ?, mode = ?, status = ?, updated_at = ?, estimated_pomodoros = ?, custom_settings = ?
		WHERE todo_id = ?
	`, todo.Name, todo.Mode, todo.Status, todo.UpdatedAt.Format(time.RFC3339),
		todo.EstimatedPomodoros, todo.CustomSettings, todo.ID)

	if err != nil {
		logger.WithError(err).WithField("id", todo.ID).Error("更新待办事项失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_UPDATE_FAILED", "更新待办事项失败", err)
	}

	logger.WithField("id", todo.ID).Debug("待办事项更新成功")
	return nil
}

// UpdateStatus 更新待办事项状态
func (r *TodoRepository) UpdateStatus(id int64, status string) error {
	logger.WithFields(map[string]interface{}{
		"id":     id,
		"status": status,
	}).Debug("更新待办事项状态")

	now := time.Now()

	var err error
	// 如果任务标记为已完成，设置completed_at时间
	if status == "completed" {
		_, err = r.db.Exec(`
			UPDATE todos
			SET status = ?, updated_at = ?, completed_at = ?
			WHERE todo_id = ?
		`, status, now.Format(time.RFC3339), now.Format(time.RFC3339), id)
	} else {
		// 如果任务状态不是已完成，则清除completed_at
		_, err = r.db.Exec(`
			UPDATE todos
			SET status = ?, updated_at = ?, completed_at = NULL
			WHERE todo_id = ?
		`, status, now.Format(time.RFC3339), id)
	}

	if err != nil {
		logger.WithError(err).WithFields(map[string]interface{}{
			"id":     id,
			"status": status,
		}).Error("更新待办事项状态失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_UPDATE_STATUS_FAILED", "更新待办事项状态失败", err)
	}

	logger.WithFields(map[string]interface{}{
		"id":     id,
		"status": status,
	}).Debug("待办事项状态更新成功")

	return nil
}

// Delete 删除待办事项
func (r *TodoRepository) Delete(id int64) error {
	logger.WithField("id", id).Debug("删除待办事项")

	_, err := r.db.Exec(`DELETE FROM todos WHERE todo_id = ?`, id)
	if err != nil {
		logger.WithError(err).WithField("id", id).Error("删除待办事项失败")
		return errors.Wrap(errors.ErrorTypeInternal, "DATABASE_DELETE_FAILED", "删除待办事项失败", err)
	}

	logger.WithField("id", id).Debug("待办事项删除成功")
	return nil
}

// GetByID 根据ID获取待办事项
func (r *TodoRepository) GetByID(id int64) (*Todo, error) {
	logger.WithField("id", id).Debug("根据ID获取待办事项")

	var todo Todo
	var createdAt, updatedAt string
	var completedAt sql.NullString
	var customSettings sql.NullString

	err := r.db.QueryRow(`
		SELECT todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings, completed_at
		FROM todos
		WHERE todo_id = ?
	`, id).Scan(
		&todo.ID,
		&todo.Name,
		&todo.Mode,
		&todo.Status,
		&createdAt,
		&updatedAt,
		&todo.EstimatedPomodoros,
		&customSettings,
		&completedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			logger.WithField("id", id).Warn("待办事项不存在")
			return nil, errors.Wrap(errors.ErrorTypeNotFound, "TODO_NOT_FOUND", "待办事项不存在", err)
		}
		logger.WithError(err).WithField("id", id).Error("查询待办事项失败")
		return nil, errors.Wrap(errors.ErrorTypeInternal, "DATABASE_QUERY_FAILED", "查询待办事项失败", err)
	}

	// 解析时间
	todo.CreatedAt, err = time.Parse(time.RFC3339, createdAt)
	if err != nil {
		logger.WithError(err).WithField("raw_value", createdAt).Warn("解析创建时间失败，使用当前时间")
		todo.CreatedAt = time.Now()
	}

	todo.UpdatedAt, err = time.Parse(time.RFC3339, updatedAt)
	if err != nil {
		logger.WithError(err).WithField("raw_value", updatedAt).Warn("解析更新时间失败，使用当前时间")
		todo.UpdatedAt = time.Now()
	}

	// 处理完成时间
	if completedAt.Valid {
		parsedTime, err := time.Parse(time.RFC3339, completedAt.String)
		if err != nil {
			logger.WithError(err).WithField("raw_value", completedAt.String).Warn("解析完成时间失败")
		} else {
			todo.CompletedAt = &parsedTime
		}
	}

	// 处理可能为NULL的customSettings
	if customSettings.Valid {
		todo.CustomSettings = customSettings.String
	} else {
		todo.CustomSettings = ""
	}

	logger.WithField("id", id).Debug("成功获取待办事项")
	return &todo, nil
}
