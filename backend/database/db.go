package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/mattn/go-sqlite3"
)

// DB 是应用程序使用的数据库连接
var DB *sql.DB

// getExecutableDir 获取可执行文件所在目录
func getExecutableDir() string {
	// 获取可执行文件路径
	execPath, err := os.Executable()
	if err != nil {
		log.Printf("获取可执行文件路径失败: %v，将使用当前目录", err)
		return "."
	}

	// 返回可执行文件所在目录
	return filepath.Dir(execPath)
}

// getUserDataDir 返回适用于当前操作系统的用户数据目录
// 此方法保留但不再使用，仅作为备用方案
func getUserDataDir() string {
	var dataDir string

	// 根据不同操作系统获取用户数据目录
	switch runtime.GOOS {
	case "windows":
		// Windows: %APPDATA%\MTimer
		dataDir = filepath.Join(os.Getenv("APPDATA"), "MTimer")
	case "darwin":
		// macOS: ~/Library/Application Support/MTimer
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("获取用户主目录失败，使用当前目录: %v", err)
			return "storage" // 降级为当前目录下的storage
		}
		dataDir = filepath.Join(homeDir, "Library", "Application Support", "MTimer")
	case "linux":
		// Linux: ~/.config/MTimer
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("获取用户主目录失败，使用当前目录: %v", err)
			return "storage" // 降级为当前目录下的storage
		}
		dataDir = filepath.Join(homeDir, ".config", "MTimer")
	default:
		// 其他系统使用当前目录下的storage文件夹
		dataDir = "storage"
	}

	return dataDir
}

// InitDatabase 初始化数据库连接和表结构
func InitDatabase() error {
	// 获取可执行文件所在目录
	execDir := getExecutableDir()

	// 数据库文件路径 - 直接存放在exe所在目录
	dbPath := filepath.Join(execDir, "mtimer.db")
	log.Printf("数据库路径: %s", dbPath)

	// 检查是否有权限写入该目录
	testFile := filepath.Join(execDir, "test_write_permission.tmp")
	err := os.WriteFile(testFile, []byte("test"), 0644)
	if err != nil {
		log.Printf("警告: 无法写入可执行文件目录: %v", err)
		log.Printf("将使用用户数据目录作为备选")

		// 使用备选方案 - 用户数据目录
		dataDir := getUserDataDir()

		// 确保用户数据目录存在
		if _, err := os.Stat(dataDir); os.IsNotExist(err) {
			err = os.MkdirAll(dataDir, 0755)
			if err != nil {
				log.Printf("创建用户数据目录失败: %v，将使用当前目录的storage文件夹", err)
				dataDir = "storage"
				if _, err := os.Stat(dataDir); os.IsNotExist(err) {
					err = os.MkdirAll(dataDir, 0755)
					if err != nil {
						return fmt.Errorf("创建数据目录失败: %w", err)
					}
				}
			}
		}

		// 更新数据库路径为用户数据目录
		dbPath = filepath.Join(dataDir, "mtimer.db")
		log.Printf("已更改数据库路径: %s", dbPath)
	} else {
		// 清理测试文件
		os.Remove(testFile)
	}

	// 连接数据库，启用外键支持
	DB, err = sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("打开数据库失败: %w", err)
	}

	// 设置连接池参数
	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	// 测试连接
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("数据库连接测试失败: %w", err)
	}

	// 启用外键约束
	_, err = DB.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return fmt.Errorf("启用外键约束失败: %w", err)
	}

	// 创建表
	if err := createTables(); err != nil {
		return fmt.Errorf("创建表失败: %w", err)
	}

	log.Println("数据库初始化成功")
	return nil
}

// CloseDatabase 关闭数据库连接
func CloseDatabase() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// createTables 创建所有需要的表
func createTables() error {
	// 创建todos表
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS todos (
			todo_id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			mode INTEGER NOT NULL,
			status TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			estimated_pomodoros INTEGER DEFAULT 1,
			custom_settings TEXT DEFAULT NULL
		);
	`)
	if err != nil {
		return err
	}

	// 创建focus_sessions表
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS focus_sessions (
			time_id INTEGER PRIMARY KEY AUTOINCREMENT,
			todo_id INTEGER NOT NULL,
			start_time DATETIME NOT NULL,
			end_time DATETIME,
			break_time INTEGER DEFAULT 0,
			duration INTEGER DEFAULT 0,
			mode INTEGER NOT NULL,
			FOREIGN KEY (todo_id) REFERENCES todos (todo_id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		return err
	}

	// 创建daily_stats表
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS daily_stats (
			stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL UNIQUE,
			pomodoro_count INTEGER DEFAULT 0,
			custom_count INTEGER DEFAULT 0,
			total_focus_sessions INTEGER DEFAULT 0,
			total_focus_minutes INTEGER DEFAULT 0,
			total_break_minutes INTEGER DEFAULT 0,
			tomato_harvests INTEGER DEFAULT 0,
			time_ranges TEXT DEFAULT '[]'
		);
	`)

	return err
}
