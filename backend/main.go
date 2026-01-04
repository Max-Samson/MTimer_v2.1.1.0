package main

import (
	"context"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"

	"MTimer/backend/controllers"
	"MTimer/backend/di"
	"MTimer/backend/logger"
	"MTimer/backend/models"
)

// 注意：在独立的backend/main.go中，我们不需要embed前端资源
// 主程序的main.go会处理这部分

func main() {
	// 初始化日志
	appLogger := logger.NewDefault()
	logger.SetDefault(appLogger)

	log.Println("开始初始化后端应用...")

	// 初始化数据库连接
	err := models.InitDatabase()
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer models.CloseDatabase()

	// 初始化依赖注入容器
	container := di.New()

	// 注册数据库适配器
	container.Provide(func() di.Database {
		return di.NewDatabaseAdapter(models.GetSQLDB())
	})

	// 创建Repository实例
	todoRepo := models.NewTodoRepository(models.GetDB())
	focusSessionRepo := models.NewFocusSessionRepository(models.GetDB())
	dailyStatRepo := models.NewDailyStatRepository(models.GetDB())
	eventStatRepo := models.NewEventStatRepository(models.GetDB())

	// 注册事务管理器
	container.Provide(func(db di.Database) di.TransactionManager {
		return di.NewTransactionManager(db)
	})

	// 注册Repository
	container.Provide(func() *models.TodoRepository { return todoRepo })
	container.Provide(func() *models.FocusSessionRepository { return focusSessionRepo })
	container.Provide(func() *models.DailyStatRepository { return dailyStatRepo })
	container.Provide(func() *models.EventStatRepository { return eventStatRepo })

	// 初始化应用
	app, err := NewApp(container)
	if err != nil {
		log.Fatalf("初始化应用失败: %v", err)
	}

	// 创建应用程序
	err = wails.Run(&options.App{
		Title:            "MTimer",
		Width:            800,
		Height:           600,
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.OnShutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatalf("运行应用程序失败: %v", err)
	}
}

// App struct
type App struct {
	todoController *controllers.TodoController
	statController *controllers.StatsController
	aiController   *controllers.AIController
}

// NewApp creates a new App application struct
func NewApp(container *di.Container) (*App, error) {
	// 从容器中解析依赖
	todoController := container.MustResolve((*controllers.TodoController)(nil)).(*controllers.TodoController)
	statController := container.MustResolve((*controllers.StatsController)(nil)).(*controllers.StatsController)

	return &App{
		todoController: todoController,
		statController: statController,
		aiController:   &controllers.AIController{},
	}, nil
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	log.Println("应用启动成功")
}

// OnShutdown is called when the app is closing
func (a *App) OnShutdown(ctx context.Context) {
	log.Println("应用正在关闭...")

	// 使用上下文检查是否有取消信号
	select {
	case <-ctx.Done():
		log.Println("关闭过程被取消")
	default:
		// 继续关闭流程
	}

	log.Println("应用关闭完成")
}
