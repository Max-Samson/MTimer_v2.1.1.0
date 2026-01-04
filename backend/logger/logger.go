package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"runtime"
	"strings"
	"time"
)

// Level 日志级别
type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
)

// String 返回日志级别的字符串表示
func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	case LevelFatal:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// Logger 日志接口
type Logger interface {
	Debug(format string, args ...interface{})
	Info(format string, args ...interface{})
	Warn(format string, args ...interface{})
	Error(format string, args ...interface{})
	Fatal(format string, args ...interface{})
	WithField(key string, value interface{}) Logger
	WithFields(fields map[string]interface{}) Logger
	WithError(err error) Logger
}

// AppLogger 应用日志实现
type AppLogger struct {
	level      Level
	logger     *log.Logger
	fields     map[string]interface{}
	showCaller bool
}

// Config 日志配置
type Config struct {
	Level      Level
	Output     io.Writer
	ShowCaller bool
	Prefix     string
}

// New 创建新的日志实例
func New(config Config) Logger {
	if config.Output == nil {
		config.Output = os.Stdout
	}

	return &AppLogger{
		level:      config.Level,
		logger:     log.New(config.Output, config.Prefix, log.LstdFlags),
		fields:     make(map[string]interface{}),
		showCaller: config.ShowCaller,
	}
}

// NewDefault 创建默认配置的日志实例
func NewDefault() Logger {
	return New(Config{
		Level:      LevelInfo,
		Output:     os.Stdout,
		ShowCaller: true,
		Prefix:     "[MTimer] ",
	})
}

// log 内部日志方法
func (l *AppLogger) log(level Level, format string, args ...interface{}) {
	if level < l.level {
		return
	}

	var builder strings.Builder

	// 添加时间戳
	builder.WriteString(time.Now().Format("2006-01-02 15:04:05"))

	// 添加级别
	builder.WriteString(fmt.Sprintf(" [%s]", level.String()))

	// 添加调用者信息
	if l.showCaller {
		if pc, file, line, ok := runtime.Caller(2); ok {
			funcName := runtime.FuncForPC(pc).Name()
			// 简化函数名
			if lastDot := strings.LastIndex(funcName, "."); lastDot >= 0 {
				funcName = funcName[lastDot+1:]
			}
			// 简化文件路径
			if lastSlash := strings.LastIndex(file, "/"); lastSlash >= 0 {
				file = file[lastSlash+1:]
			}
			builder.WriteString(fmt.Sprintf(" [%s:%d:%s]", file, line, funcName))
		}
	}

	// 添加字段
	if len(l.fields) > 0 {
		builder.WriteString(" [")
		first := true
		for k, v := range l.fields {
			if !first {
				builder.WriteString(" ")
			}
			builder.WriteString(fmt.Sprintf("%s=%v", k, v))
			first = false
		}
		builder.WriteString("]")
	}

	// 添加消息
	builder.WriteString(" ")
	builder.WriteString(fmt.Sprintf(format, args...))

	// 输出日志
	l.logger.Println(builder.String())
}

// Debug 记录调试日志
func (l *AppLogger) Debug(format string, args ...interface{}) {
	l.log(LevelDebug, format, args...)
}

// Info 记录信息日志
func (l *AppLogger) Info(format string, args ...interface{}) {
	l.log(LevelInfo, format, args...)
}

// Warn 记录警告日志
func (l *AppLogger) Warn(format string, args ...interface{}) {
	l.log(LevelWarn, format, args...)
}

// Error 记录错误日志
func (l *AppLogger) Error(format string, args ...interface{}) {
	l.log(LevelError, format, args...)
}

// Fatal 记录致命错误日志并退出程序
func (l *AppLogger) Fatal(format string, args ...interface{}) {
	l.log(LevelFatal, format, args...)
	os.Exit(1)
}

// WithField 添加单个字段
func (l *AppLogger) WithField(key string, value interface{}) Logger {
	newFields := make(map[string]interface{})
	for k, v := range l.fields {
		newFields[k] = v
	}
	newFields[key] = value

	return &AppLogger{
		level:      l.level,
		logger:     l.logger,
		fields:     newFields,
		showCaller: l.showCaller,
	}
}

// WithFields 添加多个字段
func (l *AppLogger) WithFields(fields map[string]interface{}) Logger {
	newFields := make(map[string]interface{})
	for k, v := range l.fields {
		newFields[k] = v
	}
	for k, v := range fields {
		newFields[k] = v
	}

	return &AppLogger{
		level:      l.level,
		logger:     l.logger,
		fields:     newFields,
		showCaller: l.showCaller,
	}
}

// WithError 添加错误字段
func (l *AppLogger) WithError(err error) Logger {
	if err == nil {
		return l
	}
	return l.WithField("error", err.Error())
}

// 全局日志实例
var defaultLogger Logger

// init 初始化默认日志实例
func init() {
	defaultLogger = NewDefault()
}

// SetDefault 设置默认日志实例
func SetDefault(logger Logger) {
	defaultLogger = logger
}

// GetDefault 获取默认日志实例
func GetDefault() Logger {
	return defaultLogger
}

// 便捷方法
func Debug(format string, args ...interface{}) {
	defaultLogger.Debug(format, args...)
}

func Info(format string, args ...interface{}) {
	defaultLogger.Info(format, args...)
}

func Warn(format string, args ...interface{}) {
	defaultLogger.Warn(format, args...)
}

func Error(format string, args ...interface{}) {
	defaultLogger.Error(format, args...)
}

func Fatal(format string, args ...interface{}) {
	defaultLogger.Fatal(format, args...)
}

func WithField(key string, value interface{}) Logger {
	return defaultLogger.WithField(key, value)
}

func WithFields(fields map[string]interface{}) Logger {
	return defaultLogger.WithFields(fields)
}

func WithError(err error) Logger {
	return defaultLogger.WithError(err)
}
