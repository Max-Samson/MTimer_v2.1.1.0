package di

import (
	"database/sql"

	"MTimer/backend/errors"
	"MTimer/backend/logger"
)

// Database 数据库接口别名
type Database interface {
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
	Exec(query string, args ...interface{}) (Result, error)
	Begin() (Tx, error)
	Close() error
	Ping() error
}

// Rows 查询结果集接口别名
type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
	Err() error
}

// Row 单行查询结果接口别名
type Row interface {
	Scan(dest ...interface{}) error
}

// Result 执行结果接口别名
type Result interface {
	LastInsertId() (int64, error)
	RowsAffected() (int64, error)
}

// Tx 事务接口别名
type Tx interface {
	Exec(query string, args ...interface{}) (Result, error)
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
	Commit() error
	Rollback() error
}

// TransactionManager 事务管理器接口别名
type TransactionManager interface {
	ExecuteInTransaction(fn func() error) error
}

// TransactionManager 事务管理器实现
type transactionManager struct {
	db Database
}

// NewTransactionManager 创建事务管理器
func NewTransactionManager(db Database) TransactionManager {
	return &transactionManager{
		db: db,
	}
}

// ExecuteInTransaction 在事务中执行函数
func (tm *transactionManager) ExecuteInTransaction(fn func() error) error {
	tx, err := tm.db.Begin()
	if err != nil {
		logger.Error("开始事务失败: %v", err)
		return errors.Wrap(errors.ErrorTypeInternal, "TRANSACTION_START_FAILED", "开始事务失败", err)
	}

	// 确保事务会被正确关闭
	defer func() {
		if p := recover(); p != nil {
			// 如果发生panic，回滚事务
			if rbErr := tx.Rollback(); rbErr != nil {
				logger.Error("事务回滚失败: %v", rbErr)
			}
			panic(p) // 重新抛出panic
		}
	}()

	// 执行业务逻辑
	err = fn()

	if err != nil {
		// 业务逻辑执行失败，回滚事务
		if rbErr := tx.Rollback(); rbErr != nil {
			logger.Error("事务回滚失败: %v", rbErr)
			return errors.Wrap(errors.ErrorTypeInternal, "TRANSACTION_ROLLBACK_FAILED", "事务回滚失败", rbErr)
		}
		logger.Warn("事务执行失败，已回滚: %v", err)
		return err
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		logger.Error("事务提交失败: %v", err)
		return errors.Wrap(errors.ErrorTypeInternal, "TRANSACTION_COMMIT_FAILED", "事务提交失败", err)
	}

	logger.Debug("事务执行成功")
	return nil
}

// TxContext 事务上下文，用于在事务中执行数据库操作
type TxContext struct {
	tx Tx
}

// NewTxContext 创建事务上下文
func NewTxContext(tx Tx) *TxContext {
	return &TxContext{tx: tx}
}

// GetDB 获取数据库连接（优先使用事务）
func (tc *TxContext) GetDB(db Database) interface{} {
	if tc.tx != nil {
		return tc.tx
	}
	return db
}

// TransactionScope 事务作用域
type TransactionScope struct {
	manager TransactionManager
}

// NewTransactionScope 创建事务作用域
func NewTransactionScope(manager TransactionManager) *TransactionScope {
	return &TransactionScope{
		manager: manager,
	}
}

// Execute 执行事务操作
func (ts *TransactionScope) Execute(fn func() error) error {
	return ts.manager.ExecuteInTransaction(fn)
}

// WithTransaction 高阶函数，为函数包装事务
func WithTransaction(manager TransactionManager, fn func() error) error {
	return manager.ExecuteInTransaction(fn)
}

// 数据库适配器，将sql.DB适配为interfaces.Database
type sqlDBAdapter struct {
	db *sql.DB
}

func (s *sqlDBAdapter) Query(query string, args ...interface{}) (Rows, error) {
	return s.db.Query(query, args...)
}

func (s *sqlDBAdapter) QueryRow(query string, args ...interface{}) Row {
	return s.db.QueryRow(query, args...)
}

func (s *sqlDBAdapter) Exec(query string, args ...interface{}) (Result, error) {
	return s.db.Exec(query, args...)
}

func (s *sqlDBAdapter) Begin() (Tx, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	return &sqlTxAdapter{tx: tx}, nil
}

func (s *sqlDBAdapter) Close() error {
	return s.db.Close()
}

func (s *sqlDBAdapter) Ping() error {
	return s.db.Ping()
}

// 事务适配器
type sqlTxAdapter struct {
	tx *sql.Tx
}

func (s *sqlTxAdapter) Query(query string, args ...interface{}) (Rows, error) {
	return s.tx.Query(query, args...)
}

func (s *sqlTxAdapter) QueryRow(query string, args ...interface{}) Row {
	return s.tx.QueryRow(query, args...)
}

func (s *sqlTxAdapter) Exec(query string, args ...interface{}) (Result, error) {
	return s.tx.Exec(query, args...)
}

func (s *sqlTxAdapter) Commit() error {
	return s.tx.Commit()
}

func (s *sqlTxAdapter) Rollback() error {
	return s.tx.Rollback()
}

// NewDatabaseAdapter 创建数据库适配器
func NewDatabaseAdapter(db *sql.DB) Database {
	return &sqlDBAdapter{db: db}
}

// NewDatabaseAdapterFromInterface 从Database接口创建适配器
func NewDatabaseAdapterFromInterface(db Database) Database {
	return &databaseAdapter{db: db}
}

// databaseAdapter 将Database接口适配为Database接口（用于类型转换）
type databaseAdapter struct {
	db Database
}

func (d *databaseAdapter) Query(query string, args ...interface{}) (Rows, error) {
	return d.db.Query(query, args...)
}

func (d *databaseAdapter) QueryRow(query string, args ...interface{}) Row {
	return d.db.QueryRow(query, args...)
}

func (d *databaseAdapter) Exec(query string, args ...interface{}) (Result, error) {
	return d.db.Exec(query, args...)
}

func (d *databaseAdapter) Begin() (Tx, error) {
	return d.db.Begin()
}

func (d *databaseAdapter) Close() error {
	return d.db.Close()
}

func (d *databaseAdapter) Ping() error {
	return d.db.Ping()
}
