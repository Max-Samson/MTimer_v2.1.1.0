package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"MTimer/backend/controllers/types"
)

// AIController 处理AI相关的请求
type AIController struct {
	apiKey    string
	apiURL    string
	modelName string
}

// NewAIController 创建一个新的AIController
func NewAIController() *AIController {
	// 从环境变量获取API密钥
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		log.Println("警告: 未设置DEEPSEEK_API_KEY环境变量，AI功能将使用模拟数据")
	}

	return &AIController{
		apiKey:    apiKey,
		apiURL:    "https://api.deepseek.com/v1/chat/completions",
		modelName: "deepseek-chat",
	}
}

// CallDeepSeekAPI 调用DeepSeek API
func (c *AIController) CallDeepSeekAPI(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	// 如果API密钥未设置，则返回模拟数据
	if c.apiKey == "" {
		return c.getMockResponse(req)
	}

	// 构建请求体
	requestBody := map[string]interface{}{
		"model":    c.modelName,
		"messages": req.Messages,
	}

	// 将请求体转换为JSON
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求体失败: %w", err)
	}

	// 创建HTTP请求
	httpReq, err := http.NewRequest("POST", c.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建HTTP请求失败: %w", err)
	}

	// 设置请求头
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	// 发送请求
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("发送HTTP请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应体失败: %w", err)
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API请求失败，状态码: %d，响应: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var apiResp map[string]interface{}
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("解析API响应失败: %w", err)
	}

	// 提取消息内容
	choices, ok := apiResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		return nil, errors.New("API响应中未找到choices字段")
	}

	firstChoice, ok := choices[0].(map[string]interface{})
	if !ok {
		return nil, errors.New("API响应中的choice格式不正确")
	}

	message, ok := firstChoice["message"].(map[string]interface{})
	if !ok {
		return nil, errors.New("API响应中未找到message字段")
	}

	content, ok := message["content"].(string)
	if !ok {
		return nil, errors.New("API响应中未找到content字段")
	}

	// 返回处理后的响应
	return &types.DeepSeekAPIResponse{
		Content: content,
		Role:    "assistant",
	}, nil
}

// getMockResponse 获取模拟响应（用于开发测试）
func (c *AIController) getMockResponse(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	// 获取用户最后一条消息
	if len(req.Messages) == 0 {
		return nil, errors.New("请求消息列表为空")
	}

	lastMsg := req.Messages[len(req.Messages)-1]
	userMsg := ""
	if lastMsg.Role == "user" {
		userMsg = lastMsg.Content
	}

	// 判断是否包含任务相关的关键词
	if strings.Contains(userMsg, "任务") || strings.Contains(userMsg, "安排") || strings.Contains(userMsg, "计划") {
		// 返回带有任务计划的模拟响应
		content := "根据你的需求，我为你安排了以下番茄工作法计划：\n\n" +
			"```json\n" +
			"[\n" +
			"  {\n" +
			"    \"name\": \"写论文\",\n" +
			"    \"mode\": \"pomodoro\",\n" +
			"    \"estimatedPomodoros\": 3\n" +
			"  },\n" +
			"  {\n" +
			"    \"name\": \"回复邮件\",\n" +
			"    \"mode\": \"pomodoro\",\n" +
			"    \"estimatedPomodoros\": 1\n" +
			"  },\n" +
			"  {\n" +
			"    \"name\": \"学习Vue\",\n" +
			"    \"mode\": \"custom\",\n" +
			"    \"targetTime\": 45\n" +
			"  }\n" +
			"]\n" +
			"```\n\n" +
			"你可以点击上方的\"应用此计划\"按钮，我会帮你创建这些任务。如果需要调整，请告诉我具体的修改建议。"

		return &types.DeepSeekAPIResponse{
			Role:    "assistant",
			Content: content,
		}, nil
	} else if strings.Contains(strings.ToLower(userMsg), "hello") || strings.Contains(userMsg, "你好") {
		// 返回问候响应
		return &types.DeepSeekAPIResponse{
			Role:    "assistant",
			Content: "你好！我是你的AI时间专注助手。我可以帮你规划基于番茄工作法的时间计划。请告诉我你今天需要完成哪些任务，我会为你创建合理的专注时间安排。",
		}, nil
	} else {
		// 返回通用响应
		return &types.DeepSeekAPIResponse{
			Role:    "assistant",
			Content: "我可以帮你规划基于番茄工作法的时间计划。请告诉我你需要完成哪些任务，我会为你创建合理的专注时间安排。例如：\"我今天需要写论文、回复邮件和学习Vue\"",
		}, nil
	}
}
