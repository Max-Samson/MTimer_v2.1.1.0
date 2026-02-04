#!/bin/bash

# ============================================================================
# MTimer 测试数据加载脚本
# ============================================================================
# 用途: 快速加载测试数据到 SQLite 数据库
# 使用: ./load_test_data.sh [--clean]
# 选项: --clean  清空现有数据后再加载
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_header() {
    echo ""
    echo "=============================================="
    echo "  MTimer 测试数据加载工具"
    echo "=============================================="
    echo ""
}

# 查找数据库文件
find_database() {
    local db_paths=(
        "./mtimer.db"
        "../mtimer.db"
        "../../mtimer.db"
        "$HOME/Library/Application Support/MTimer/mtimer.db"
        "./storage/mtimer.db"
    )
    
    for path in "${db_paths[@]}"; do
        if [ -f "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    return 1
}

# 检查 SQLite 是否安装
check_sqlite() {
    if ! command -v sqlite3 &> /dev/null; then
        print_error "sqlite3 未安装"
        echo ""
        echo "请先安装 SQLite:"
        echo "  macOS:   brew install sqlite3"
        echo "  Ubuntu:  sudo apt-get install sqlite3"
        echo "  CentOS:  sudo yum install sqlite"
        exit 1
    fi
    
    print_success "sqlite3 已安装: $(sqlite3 --version)"
}

# 清空现有数据
clean_data() {
    local db_path=$1
    
    print_warning "正在清空现有数据..."
    
    sqlite3 "$db_path" <<EOF
DELETE FROM event_stats;
DELETE FROM daily_stats;
DELETE FROM focus_sessions;
DELETE FROM todos;
DELETE FROM sqlite_sequence WHERE name IN ('todos', 'focus_sessions', 'daily_stats', 'event_stats');
EOF
    
    print_success "数据已清空"
}

# 加载测试数据
load_data() {
    local db_path=$1
    local sql_file="./test_data.sql"
    
    # 检查 SQL 文件是否存在
    if [ ! -f "$sql_file" ]; then
        print_error "找不到 test_data.sql 文件"
        echo "请确保在 backend/database 目录下执行此脚本"
        exit 1
    fi
    
    print_info "正在加载测试数据..."
    
    # 执行 SQL 脚本
    if sqlite3 "$db_path" < "$sql_file"; then
        print_success "测试数据加载成功"
    else
        print_error "加载测试数据失败"
        exit 1
    fi
}

# 验证数据
verify_data() {
    local db_path=$1
    
    print_info "正在验证数据..."
    echo ""
    
    # 查询数据统计
    sqlite3 "$db_path" <<EOF
.mode column
.headers on
.width 20 10

SELECT '任务总数' as 指标, COUNT(*) as 数量 FROM todos
UNION ALL
SELECT '已完成任务', COUNT(*) FROM todos WHERE status = 'completed'
UNION ALL
SELECT '进行中任务', COUNT(*) FROM todos WHERE status = 'in_progress'
UNION ALL
SELECT '待办任务', COUNT(*) FROM todos WHERE status = 'pending'
UNION ALL
SELECT '专注会话总数', COUNT(*) FROM focus_sessions
UNION ALL
SELECT '每日统计记录', COUNT(*) FROM daily_stats
UNION ALL
SELECT '事件统计记录', COUNT(*) FROM event_stats;
EOF
    
    echo ""
    print_success "数据验证完成"
}

# 显示最近7天统计
show_recent_stats() {
    local db_path=$1
    
    echo ""
    print_info "最近7天统计数据:"
    echo ""
    
    sqlite3 "$db_path" <<EOF
.mode column
.headers on
.width 12 10 12 12

SELECT 
    date as 日期,
    pomodoro_count as 番茄数,
    total_focus_minutes as 专注分钟,
    tomato_harvests as 番茄收成
FROM daily_stats
WHERE date >= date('now', '-7 days')
ORDER BY date DESC;
EOF
    
    echo ""
}

# 主函数
main() {
    print_header
    
    # 解析命令行参数
    local clean_mode=false
    if [ "$1" = "--clean" ]; then
        clean_mode=true
    fi
    
    # 检查 SQLite
    check_sqlite
    
    # 查找数据库文件
    print_info "正在查找数据库文件..."
    local db_path
    if db_path=$(find_database); then
        print_success "找到数据库: $db_path"
    else
        print_error "找不到数据库文件"
        echo ""
        echo "请确保数据库文件存在于以下位置之一:"
        echo "  - ./mtimer.db"
        echo "  - ~/Library/Application Support/MTimer/mtimer.db"
        echo ""
        echo "或者先运行应用程序以创建数据库"
        exit 1
    fi
    
    # 备份提示
    echo ""
    print_warning "注意: 此操作将修改数据库"
    if [ "$clean_mode" = true ]; then
        print_warning "将清空所有现有数据！"
    fi
    
    read -p "是否继续? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "操作已取消"
        exit 0
    fi
    
    echo ""
    
    # 清空数据（如果指定）
    if [ "$clean_mode" = true ]; then
        clean_data "$db_path"
        echo ""
    fi
    
    # 加载测试数据
    load_data "$db_path"
    echo ""
    
    # 验证数据
    verify_data "$db_path"
    
    # 显示最近统计
    show_recent_stats "$db_path"
    
    # 完成提示
    echo ""
    echo "=============================================="
    print_success "所有操作已完成！"
    echo "=============================================="
    echo ""
    echo "下一步:"
    echo "  1. 启动应用: wails dev"
    echo "  2. 进入统计页面"
    echo "  3. 测试图表导出功能"
    echo ""
}

# 执行主函数
main "$@"
