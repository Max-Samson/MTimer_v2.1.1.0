package interfaces

// TransactionManager 事务管理接口
type TransactionManager interface {
	ExecuteInTransaction(fn func() error) error
}

// Database 数据库连接接口
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
