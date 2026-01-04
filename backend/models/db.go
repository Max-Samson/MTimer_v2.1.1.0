package models

import (
	"database/sql"

	"MTimer/backend/database"
	"MTimer/backend/di"
)

// Database 数据库接口（直接定义，避免包循环依赖）
type Database interface {
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
	Exec(query string, args ...interface{}) (Result, error)
	Begin() (Tx, error)
	Close() error
	Ping() error
}

// Rows 查询结果集接口
type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
	Err() error
}

// Row 单行查询结果接口
type Row interface {
	Scan(dest ...interface{}) error
}

// Result 执行结果接口
type Result interface {
	LastInsertId() (int64, error)
	RowsAffected() (int64, error)
}

// Tx 事务接口
type Tx interface {
	Exec(query string, args ...interface{}) (Result, error)
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
	Commit() error
	Rollback() error
}

// DB 是从database包导入的数据库连接
var DB *sql.DB

// dbAdapter 数据库适配器
var dbAdapter Database

// InitDatabase 初始化模型层的数据库连接
func InitDatabase() error {
	// 初始化数据库连接
	if err := database.InitDatabase(); err != nil {
		return err
	}

	// 获取数据库连接实例
	DB = database.DB
	// 使用适配器转换接口类型
	diDB := di.NewDatabaseAdapter(DB)
	dbAdapter = &databaseAdapter{db: diDB}
	return nil
}

// CloseDatabase 关闭数据库连接
func CloseDatabase() error {
	return database.CloseDatabase()
}

// GetDB 获取数据库适配器
func GetDB() Database {
	if dbAdapter == nil {
		panic("database not initialized")
	}
	return dbAdapter
}

// GetSQLDB 获取原始sql.DB连接
func GetSQLDB() *sql.DB {
	if DB == nil {
		panic("database not initialized")
	}
	return DB
}

// sqlRowsAdapter sql.Rows适配器
type sqlRowsAdapter struct {
	rows *sql.Rows
}

func (s *sqlRowsAdapter) Next() bool {
	return s.rows.Next()
}

func (s *sqlRowsAdapter) Scan(dest ...interface{}) error {
	return s.rows.Scan(dest...)
}

func (s *sqlRowsAdapter) Close() error {
	return s.rows.Close()
}

func (s *sqlRowsAdapter) Err() error {
	return s.rows.Err()
}

// sqlRowAdapter sql.Row适配器
type sqlRowAdapter struct {
	row *sql.Row
}

func (s *sqlRowAdapter) Scan(dest ...interface{}) error {
	return s.row.Scan(dest...)
}

// sqlResultAdapter sql.Result适配器
type sqlResultAdapter struct {
	result sql.Result
}

func (s *sqlResultAdapter) LastInsertId() (int64, error) {
	return s.result.LastInsertId()
}

func (s *sqlResultAdapter) RowsAffected() (int64, error) {
	return s.result.RowsAffected()
}

// NewRowsAdapter 创建Rows适配器
func NewRowsAdapter(rows *sql.Rows) Rows {
	return &sqlRowsAdapter{rows: rows}
}

// NewRowAdapter 创建Row适配器
func NewRowAdapter(row *sql.Row) Row {
	return &sqlRowAdapter{row: row}
}

// NewResultAdapter 创建Result适配器
func NewResultAdapter(result sql.Result) Result {
	return &sqlResultAdapter{result: result}
}

// databaseAdapter 将di.Database适配为models.Database
type databaseAdapter struct {
	db di.Database
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
	tx, err := d.db.Begin()
	if err != nil {
		return nil, err
	}
	return &txAdapter{tx: tx}, nil
}

func (d *databaseAdapter) Close() error {
	return d.db.Close()
}

func (d *databaseAdapter) Ping() error {
	return d.db.Ping()
}

// txAdapter 将di.Tx适配为models.Tx
type txAdapter struct {
	tx di.Tx
}

func (t *txAdapter) Exec(query string, args ...interface{}) (Result, error) {
	return t.tx.Exec(query, args...)
}

func (t *txAdapter) Query(query string, args ...interface{}) (Rows, error) {
	return t.tx.Query(query, args...)
}

func (t *txAdapter) QueryRow(query string, args ...interface{}) Row {
	return t.tx.QueryRow(query, args...)
}

func (t *txAdapter) Commit() error {
	return t.tx.Commit()
}

func (t *txAdapter) Rollback() error {
	return t.tx.Rollback()
}

// WithTx 在事务上下文中执行数据库操作
func WithTx(tx Tx, fn func(db interface{}) error) error {
	if tx == nil {
		return fn(GetDB())
	}
	return fn(tx)
}
