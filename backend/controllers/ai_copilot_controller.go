package controllers

import (
	"log"
	"time"

	"MTimer/backend/controllers/types"
	"MTimer/backend/models"
)

// AICopilotController AI 副驾驶控制器
// 提供 AI 需要的行为特征数据导出接口
type AICopilotController struct {
	behaviorRepo *models.BehaviorFeatureRepository
}

// NewAICopilotController 创建 AI 副驾驶控制器
func NewAICopilotController(db models.Database) *AICopilotController {
	return &AICopilotController{
		behaviorRepo: models.NewBehaviorFeatureRepository(db),
	}
}

// GetBehaviorFeatures 获取行为特征（JSON 格式）
// 返回结构化的行为特征数据，供 AI 分析使用
func (c *AICopilotController) GetBehaviorFeatures(date string) (*types.BehaviorFeatureResponse, error) {
	log.Printf("[AICopilot] 获取行为特征, 日期: %s", date)

	// 如果未指定日期，使用今天
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	feature, err := c.behaviorRepo.GetBehaviorFeatures(date)
	if err != nil {
		log.Printf("[AICopilot] 获取行为特征失败: %v", err)
		return nil, err
	}

	// 转换为响应格式
	response := &types.BehaviorFeatureResponse{
		Date:               feature.Date,
		TotalFocusMinutes:  feature.TotalFocusMinutes,
		PomodoroRatio:      feature.PomodoroRatio,
		SessionCount:       feature.SessionCount,
		AvgSessionLength:   feature.AvgSessionLength,
		FirstFocusTime:     feature.FirstFocusTime,
		LastFocusTime:      feature.LastFocusTime,
		PeakHours:          feature.PeakHours,
		TaskDiversity:      feature.TaskDiversity,
		CompletedTasks:     feature.CompletedTasks,
		BreakRatio:         feature.BreakRatio,
		ComparedToAvg:      feature.ComparedToAvg,
		ComparedToAvgRatio: feature.ComparedToAvgRatio,
		StreakDays:         feature.StreakDays,
		BestHour:           feature.BestHour,
	}

	log.Printf("[AICopilot] 行为特征获取成功, 专注时长: %d分钟", response.TotalFocusMinutes)
	return response, nil
}

// ExportForAI 导出 AI 友好的文本格式
// 返回一个易于 AI 理解的文本报告，可以直接作为 AI Prompt 的一部分
func (c *AICopilotController) ExportForAI(date string) (string, error) {
	log.Printf("[AICopilot] 导出 AI 格式数据, 日期: %s", date)

	// 如果未指定日期，使用今天
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	output, err := c.behaviorRepo.ExportForAI(date)
	if err != nil {
		log.Printf("[AICopilot] 导出失败: %v", err)
		return "", err
	}

	log.Printf("[AICopilot] 导出成功, 数据长度: %d 字符", len(output))
	return output, nil
}
