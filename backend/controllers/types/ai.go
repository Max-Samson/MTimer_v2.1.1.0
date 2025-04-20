package types

// DeepSeekMessage 表示聊天消息结构
type DeepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// DeepSeekAPIRequest 表示调用DeepSeek API的请求
type DeepSeekAPIRequest struct {
	Messages []DeepSeekMessage `json:"messages"`
	Model    string            `json:"model,omitempty"`
}

// DeepSeekAPIResponse 表示DeepSeek API的响应
type DeepSeekAPIResponse struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
