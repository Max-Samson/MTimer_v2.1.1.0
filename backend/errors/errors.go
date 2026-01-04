package errors

import (
	"fmt"
	"net/http"
)

// ErrorType 定义错误类型
type ErrorType string

const (
	ErrorTypeValidation   ErrorType = "VALIDATION_ERROR" // 参数验证错误
	ErrorTypeNotFound     ErrorType = "NOT_FOUND"        // 资源不存在
	ErrorTypeConflict     ErrorType = "CONFLICT"         // 资源冲突
	ErrorTypeInternal     ErrorType = "INTERNAL_ERROR"   // 内部错误
	ErrorTypeUnauthorized ErrorType = "UNAUTHORIZED"     // 未授权
	ErrorTypeForbidden    ErrorType = "FORBIDDEN"        // 禁止访问
	ErrorTypeTimeout      ErrorType = "TIMEOUT"          // 超时
	ErrorTypeExternal     ErrorType = "EXTERNAL_ERROR"   // 外部服务错误
)

// AppError 应用级错误结构体
type AppError struct {
	Type    ErrorType `json:"type"`
	Code    string    `json:"code"`
	Message string    `json:"message"`
	Cause   error     `json:"-"` // 不序列化到JSON
}

// Error 实现error接口
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Type, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Type, e.Message)
}

// Unwrap 实现errors包的Unwrap方法，用于错误链
func (e *AppError) Unwrap() error {
	return e.Cause
}

// New 创建一个新的AppError
func New(errorType ErrorType, code, message string) *AppError {
	return &AppError{
		Type:    errorType,
		Code:    code,
		Message: message,
	}
}

// Wrap 用AppError包装现有错误
func Wrap(errorType ErrorType, code, message string, cause error) *AppError {
	return &AppError{
		Type:    errorType,
		Code:    code,
		Message: message,
		Cause:   cause,
	}
}

// ToAppError 将任意error转换为AppError
func ToAppError(err error) *AppError {
	if err == nil {
		return nil
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr
	}

	// 根据错误类型智能判断
	return Wrap(ErrorTypeInternal, "INTERNAL_ERROR", "系统内部错误", err)
}

// ToHTTPStatus 将AppError转换为HTTP状态码
func (e *AppError) ToHTTPStatus() int {
	switch e.Type {
	case ErrorTypeValidation:
		return http.StatusBadRequest
	case ErrorTypeNotFound:
		return http.StatusNotFound
	case ErrorTypeConflict:
		return http.StatusConflict
	case ErrorTypeUnauthorized:
		return http.StatusUnauthorized
	case ErrorTypeForbidden:
		return http.StatusForbidden
	case ErrorTypeTimeout:
		return http.StatusRequestTimeout
	case ErrorTypeExternal:
		return http.StatusBadGateway
	case ErrorTypeInternal:
		fallthrough
	default:
		return http.StatusInternalServerError
	}
}

// 预定义的常见错误
var (
	// 验证错误
	ErrInvalidInput         = New(ErrorTypeValidation, "INVALID_INPUT", "输入参数无效")
	ErrMissingRequiredField = New(ErrorTypeValidation, "MISSING_REQUIRED_FIELD", "必填字段缺失")

	// 资源错误
	ErrTodoNotFound    = New(ErrorTypeNotFound, "TODO_NOT_FOUND", "待办事项不存在")
	ErrSessionNotFound = New(ErrorTypeNotFound, "SESSION_NOT_FOUND", "专注会话不存在")

	// 业务逻辑错误
	ErrSessionAlreadyExists    = New(ErrorTypeConflict, "SESSION_ALREADY_EXISTS", "已存在进行中的专注会话")
	ErrInvalidStatusTransition = New(ErrorTypeValidation, "INVALID_STATUS_TRANSITION", "无效的状态转换")

	// 数据库错误
	ErrDatabaseConnection = New(ErrorTypeInternal, "DATABASE_CONNECTION_ERROR", "数据库连接失败")
	ErrDatabaseOperation  = New(ErrorTypeInternal, "DATABASE_OPERATION_ERROR", "数据库操作失败")

	// AI服务错误
	ErrAIUnavailable   = New(ErrorTypeExternal, "AI_UNAVAILABLE", "AI服务不可用")
	ErrAIRequestFailed = New(ErrorTypeExternal, "AI_REQUEST_FAILED", "AI请求失败")
)
