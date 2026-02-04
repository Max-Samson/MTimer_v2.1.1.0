package main

import (
	"context"
	"encoding/base64"
	"log"
	"os"
	"time"

	"MTimer/backend/controllers"
	"MTimer/backend/controllers/types"
	"MTimer/backend/di"
	"MTimer/backend/models"
	"MTimer/backend/utils"
	
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx                context.Context
	todoController     *controllers.TodoController
	statController     *controllers.StatsController
	aiController       *controllers.AIController
	aiCopilotController *controllers.AICopilotController
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	log.Println("开始初始化应用...")

	// 加载.env文件
	if err := utils.LoadEnvFromFile(".env"); err != nil {
		log.Printf("加载.env文件失败: %v", err)
	}

	// 初始化数据库
	err := models.InitDatabase()
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// 初始化依赖注入容器和组件
	container := di.New()

	// 注册数据库适配器
	dbAdapter := di.NewDatabaseAdapter(models.GetSQLDB())
	container.Provide(dbAdapter)

	// 创建Repository实例
	todoRepo := models.NewTodoRepository(models.GetDB())
	focusSessionRepo := models.NewFocusSessionRepository(models.GetDB())
	dailyStatRepo := models.NewDailyStatRepository(models.GetDB())
	eventStatRepo := models.NewEventStatRepository(models.GetDB())

	// 注册事务管理器
	txManager := di.NewTransactionManager(dbAdapter)
	container.Provide(txManager)

	// 注册Repository
	container.Provide(todoRepo)
	container.Provide(focusSessionRepo)
	container.Provide(dailyStatRepo)
	container.Provide(eventStatRepo)

	// 手动创建控制器（因为它们需要多个依赖）
	a.todoController = controllers.NewTodoController(
		todoRepo,
		focusSessionRepo,
		dailyStatRepo,
		eventStatRepo,
		txManager,
	)
	a.statController = controllers.NewStatsController(
		dailyStatRepo,
		focusSessionRepo,
		eventStatRepo,
	)
	a.aiController = controllers.NewAIController()
	a.aiCopilotController = controllers.NewAICopilotController(models.GetDB())

	log.Println("应用启动成功")

	// 启动后自动修复历史统计数据
	go a.repairHistoricalStats()
}

// OnShutdown is called when the app is closing
func (a *App) OnShutdown(ctx context.Context) {
	log.Println("应用正在关闭...")
	// 使用保存的上下文检查是否有取消信号
	select {
	case <-ctx.Done():
		log.Println("关闭过程被取消")
	default:
		// 继续关闭流程
	}

	// 关闭数据库连接
	if err := models.CloseDatabase(); err != nil {
		log.Printf("关闭数据库连接出错: %v", err)
	}
	log.Println("数据库连接已关闭")
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return "Hello " + name + "! Welcome to MTimer!"
}

// 待办事项相关API
func (a *App) GetAllTodos() ([]types.TodoItem, error) {
	log.Println("获取所有待办事项")
	return a.todoController.GetAllTodos()
}

func (a *App) CreateTodo(req types.CreateTodoRequest) (types.CreateTodoResponse, error) {
	log.Printf("创建待办事项: %s, 模式: %s", req.Name, req.Mode)
	return a.todoController.CreateTodo(req)
}

// UpdateTodo 更新待办事项
func (a *App) UpdateTodo(req types.UpdateTodoRequest) (types.BasicResponse, error) {
	log.Printf("更新待办事项, ID: %d, 名称: %s, 模式: %s", req.TodoID, req.Name, req.Mode)

	// 检查是否有自定义设置
	if req.CustomSettings != nil {
		log.Printf("待办事项自定义设置: 工作时间=%d分钟, 短休息=%d分钟, 长休息=%d分钟",
			req.CustomSettings.WorkTime,
			req.CustomSettings.ShortBreakTime,
			req.CustomSettings.LongBreakTime)
	}

	return a.todoController.UpdateTodo(req)
}

// UpdateTodoStatus 更新待办事项状态
func (a *App) UpdateTodoStatus(req types.UpdateTodoStatusRequest) (types.BasicResponse, error) {
	log.Printf("更新待办事项状态, ID: %d, 状态: %s", req.TodoID, req.Status)
	return a.todoController.UpdateTodoStatus(req)
}

func (a *App) DeleteTodo(id int64) (types.BasicResponse, error) {
	log.Printf("删除待办事项, ID: %d", id)
	return a.todoController.DeleteTodo(id)
}

// 专注会话相关API
func (a *App) StartFocusSession(req types.StartFocusSessionRequest) (types.StartFocusSessionResponse, error) {
	log.Printf("开始专注会话, 待办事项ID: %d, 模式: %d", req.TodoID, req.Mode)
	return a.todoController.StartFocusSession(req)
}

func (a *App) CompleteFocusSession(req types.CompleteFocusSessionRequest) (types.BasicResponse, error) {
	log.Printf("完成专注会话, 会话ID: %d, 休息时间: %d分钟, 标记完成: %v", req.SessionID, req.BreakTime, req.MarkAsCompleted)
	return a.todoController.CompleteFocusSession(req)
}

// 统计数据相关API
func (a *App) GetStats(req types.GetStatsRequest) ([]*types.StatResponse, error) {
	log.Printf("获取统计数据, 开始日期: %s, 结束日期: %s", req.StartDate, req.EndDate)
	return a.statController.GetStats(req)
}

func (a *App) UpdateStats(date string) (types.BasicResponse, error) {
	return a.statController.UpdateStats(date)
}

func (a *App) GetStatsSummary() (*types.StatSummary, error) {
	log.Println("获取统计摘要")
	return a.statController.GetSummary()
}

// GetDailySummary 获取昨日小结数据
func (a *App) GetDailySummary() (*types.DailySummaryResponse, error) {
	log.Println("获取昨日小结数据")
	return a.statController.GetDailySummary()
}

// GetEventStats 获取事件统计数据
func (a *App) GetEventStats(req types.GetStatsRequest) (*types.EventStatsResponse, error) {
	log.Println("获取事件统计数据:", req)
	// 调用统计控制器获取事件统计数据
	return a.statController.GetEventStats(req)
}

// GetPomodoroStats 获取番茄统计数据
func (a *App) GetPomodoroStats(req types.GetStatsRequest) (*types.PomodoroStatsResponse, error) {
	log.Printf("获取番茄统计数据, 开始日期: %s, 结束日期: %s", req.StartDate, req.EndDate)
	return a.statController.GetPomodoroStats(req)
}

// CallDeepSeekAPI 调用DeepSeek API
func (a *App) CallDeepSeekAPI(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	log.Printf("调用DeepSeek API, 消息数量: %d", len(req.Messages))
	return a.aiController.CallDeepSeekAPI(req)
}

// AI Copilot 相关API - 提供 AI 需要的行为特征数据

// GetBehaviorFeatures 获取行为特征（JSON 格式）
// 返回结构化的行为特征数据，可直接用于 AI 分析
func (a *App) GetBehaviorFeatures(date string) (*types.BehaviorFeatureResponse, error) {
	log.Printf("获取行为特征, 日期: %s", date)
	return a.aiCopilotController.GetBehaviorFeatures(date)
}

// ExportForAI 导出 AI 友好的文本格式
// 返回易于 AI 理解的文本报告，可直接作为 AI Prompt 的一部分
func (a *App) ExportForAI(date string) (string, error) {
	log.Printf("导出 AI 格式数据, 日期: %s", date)
	return a.aiCopilotController.ExportForAI(date)
}

// SaveImageFile 保存图片文件（用于导出图表）
// 接收 base64 编码的图片数据和建议的文件名
// 返回保存的文件路径
func (a *App) SaveImageFile(base64Data string, suggestedFilename string) (string, error) {
	log.Printf("保存图片文件: %s", suggestedFilename)
	
	// 使用 Wails 运行时打开保存文件对话框
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: suggestedFilename,
		Title:           "保存图片",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "PNG 图片 (*.png)",
				Pattern:     "*.png",
			},
		},
	})
	
	if err != nil {
		log.Printf("打开保存对话框失败: %v", err)
		return "", err
	}
	
	// 用户取消了保存
	if filePath == "" {
		log.Println("用户取消了保存操作")
		return "", nil
	}
	
	// 解码 base64 数据
	// 移除 data:image/png;base64, 前缀
	const prefix = "data:image/png;base64,"
	if len(base64Data) > len(prefix) && base64Data[:len(prefix)] == prefix {
		base64Data = base64Data[len(prefix):]
	}
	
	// 解码
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		log.Printf("解码 base64 数据失败: %v", err)
		return "", err
	}
	
	// 写入文件
	err = os.WriteFile(filePath, imageData, 0644)
	if err != nil {
		log.Printf("写入文件失败: %v", err)
		return "", err
	}
	
	log.Printf("图片已成功保存到: %s", filePath)
	return filePath, nil
}

// repairHistoricalStats 修复历史统计数据
// 在应用启动时自动运行，重新计算最近30天的统计数据
func (a *App) repairHistoricalStats() {
	// 等待一秒，确保应用完全启动
	time.Sleep(time.Second)

	log.Println("开始修复历史统计数据...")

	// 获取最近30天的日期范围
	today := time.Now()
	daysToRepair := 30 // 修复最近30天的数据

	repairCount := 0
	for i := 0; i < daysToRepair; i++ {
		date := today.AddDate(0, 0, -i).Format("2006-01-02")

		// 调用更新统计数据
		_, err := a.statController.UpdateStats(date)
		if err != nil {
			log.Printf("修复 %s 的统计数据失败: %v", date, err)
		} else {
			repairCount++
		}
	}

	log.Printf("历史统计数据修复完成，共修复 %d 天的数据", repairCount)
}
