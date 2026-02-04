# 测试数据使用说明

## 📋 概述

`test_data.sql` 脚本用于生成 MTimer 应用的测试数据，便于测试图表导出功能和其他统计功能。

## 📊 生成的数据

### 数据量统计

| 数据类型 | 数量 | 说明 |
|---------|------|------|
| 任务 (todos) | 55个 | 50个已完成，3个进行中，2个待办 |
| 专注会话 (focus_sessions) | 200+个 | 最近30天的专注记录 |
| 每日统计 (daily_stats) | 30条 | 每天的汇总数据 |
| 事件统计 (event_stats) | 100+条 | 每个任务的每日统计 |

### 时间范围

- **总时间跨度**: 最近30天
- **密集数据期**: 最近7天（每天6-10个番茄钟）
- **稳定数据期**: 8-30天前（每天5个番茄钟）

### 数据特点

✅ **真实性** - 模拟真实的工作场景  
✅ **完整性** - 包含任务的完整生命周期  
✅ **多样性** - 不同类型和状态的任务  
✅ **连续性** - 30天连续的数据记录  

## 🚀 使用方法

### 方法一：命令行执行（推荐）

```bash
# 1. 进入项目目录
cd /Users/apple/Desktop/MTimer

# 2. 找到数据库文件位置
# 通常在以下位置之一：
# - ./mtimer.db (开发环境)
# - ~/Library/Application Support/MTimer/mtimer.db (macOS)

# 3. 执行SQL脚本
sqlite3 mtimer.db < backend/database/test_data.sql

# 4. 验证数据
sqlite3 mtimer.db "SELECT COUNT(*) FROM todos;"
sqlite3 mtimer.db "SELECT COUNT(*) FROM focus_sessions;"
```

### 方法二：使用 SQLite 客户端

1. **打开数据库**
   - 使用 DB Browser for SQLite 或其他客户端
   - 打开 `mtimer.db` 文件

2. **执行脚本**
   - 复制 `test_data.sql` 的内容
   - 在 SQL 编辑器中粘贴并执行

3. **验证数据**
   - 查看各表的记录数
   - 检查数据是否正确生成

### 方法三：在应用中执行（开发环境）

```go
// 在 Go 代码中执行
import (
    "io/ioutil"
    "database/sql"
)

func LoadTestData(db *sql.DB) error {
    sqlBytes, err := ioutil.ReadFile("backend/database/test_data.sql")
    if err != nil {
        return err
    }
    
    _, err = db.Exec(string(sqlBytes))
    return err
}
```

## 🔄 重新生成数据

如果需要清空现有数据并重新生成：

```sql
-- 1. 清空所有数据
DELETE FROM event_stats;
DELETE FROM daily_stats;
DELETE FROM focus_sessions;
DELETE FROM todos;

-- 2. 重置自增ID（可选）
DELETE FROM sqlite_sequence WHERE name IN ('todos', 'focus_sessions', 'daily_stats', 'event_stats');

-- 3. 重新执行 test_data.sql
```

或使用命令行：

```bash
# 清空并重新生成
sqlite3 mtimer.db "DELETE FROM event_stats; DELETE FROM daily_stats; DELETE FROM focus_sessions; DELETE FROM todos;"
sqlite3 mtimer.db < backend/database/test_data.sql
```

## 📈 数据验证

### 验证 SQL 查询

```sql
-- 1. 查看任务统计
SELECT 
    status,
    COUNT(*) as count
FROM todos
GROUP BY status;

-- 2. 查看最近7天的专注数据
SELECT 
    date,
    pomodoro_count,
    total_focus_minutes,
    tomato_harvests
FROM daily_stats
WHERE date >= date('now', '-7 days')
ORDER BY date DESC;

-- 3. 查看每日专注会话数
SELECT 
    date(start_time) as date,
    COUNT(*) as session_count,
    SUM(duration) as total_minutes
FROM focus_sessions
GROUP BY date(start_time)
ORDER BY date DESC
LIMIT 7;

-- 4. 查看任务完成率
SELECT 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
FROM todos;
```

### 验证命令

```bash
# 快速验证数据量
sqlite3 mtimer.db "SELECT '任务数', COUNT(*) FROM todos UNION ALL SELECT '专注会话', COUNT(*) FROM focus_sessions UNION ALL SELECT '每日统计', COUNT(*) FROM daily_stats;"
```

## 🎯 测试场景

### 1. 图表导出测试

生成的数据适合测试以下图表：

- ✅ **周趋势图** - 最近7天有完整数据
- ✅ **番茄统计图** - 30天的番茄钟记录
- ✅ **时间分布图** - 不同时间段的专注记录
- ✅ **完成率图** - 任务完成情况
- ✅ **工作量趋势图** - 每日工作量变化

### 2. 统计功能测试

- 每日小结
- 本周趋势
- 月度统计
- 任务完成率
- 专注时长分析

### 3. 性能测试

- 200+ 条专注会话记录
- 适合测试查询性能
- 适合测试图表渲染性能

## 🐛 常见问题

### Q1: 执行脚本后没有数据？

**A:** 检查以下几点：
1. 数据库文件路径是否正确
2. 是否有写入权限
3. 查看是否有错误提示
4. 使用验证 SQL 检查数据

### Q2: 数据重复了？

**A:** 脚本可能执行了多次，解决方法：
```sql
-- 清空数据后重新执行
DELETE FROM event_stats;
DELETE FROM daily_stats;
DELETE FROM focus_sessions;
DELETE FROM todos;
```

### Q3: 时间数据不准确？

**A:** 脚本使用相对时间（`datetime('now', '-N days')`），确保：
1. 系统时间正确
2. SQLite 版本支持日期函数
3. 时区设置正确

### Q4: 如何自定义数据量？

**A:** 修改 `test_data.sql` 中的数据：
- 调整任务数量：修改 INSERT INTO todos 部分
- 调整专注会话：修改 focus_sessions 的生成逻辑
- 调整时间范围：修改 `-N days` 参数

## 📝 数据结构说明

### todos 表

```sql
todo_id              -- 任务ID（主键）
name                 -- 任务名称
mode                 -- 模式（1=番茄钟）
status               -- 状态（pending/in_progress/completed）
created_at           -- 创建时间
updated_at           -- 更新时间
estimated_pomodoros  -- 预估番茄数
custom_settings      -- 自定义设置
completed_at         -- 完成时间
```

### focus_sessions 表

```sql
time_id     -- 会话ID（主键）
todo_id     -- 关联的任务ID
start_time  -- 开始时间
end_time    -- 结束时间
break_time  -- 休息时间（分钟）
duration    -- 专注时长（分钟）
mode        -- 模式（1=番茄钟）
date        -- 日期（自动生成）
```

### daily_stats 表

```sql
stat_id              -- 统计ID（主键）
date                 -- 日期
pomodoro_count       -- 番茄钟数量
custom_count         -- 自定义计时数量
total_focus_sessions -- 总专注会话数
pomodoro_minutes     -- 番茄钟分钟数
custom_minutes       -- 自定义计时分钟数
total_focus_minutes  -- 总专注分钟数
total_break_minutes  -- 总休息分钟数
tomato_harvests      -- 番茄收成数
time_ranges          -- 时间段分布（JSON）
```

### event_stats 表

```sql
stat_id         -- 统计ID（主键）
event_id        -- 事件ID（任务ID）
date            -- 日期
focus_count     -- 专注次数
total_focus_time -- 总专注时间
mode            -- 模式
completed       -- 是否完成（0/1）
```

## 🔧 高级用法

### 生成特定日期范围的数据

```sql
-- 生成最近60天的数据（修改脚本中的天数）
-- 将所有 '-N days' 中的 N 调整为更大的值
```

### 生成更密集的数据

```sql
-- 增加每天的番茄钟数量
-- 在 focus_sessions 的 INSERT 部分添加更多记录
```

### 生成不同模式的数据

```sql
-- 添加自定义计时模式的数据
-- 将 mode = 1 改为 mode = 2
```

## 📚 参考资料

- [SQLite 日期和时间函数](https://www.sqlite.org/lang_datefunc.html)
- [MTimer 数据库设计文档](./db.go)
- [图表导出功能文档](../../frontend/src/components/stats/README.md)

## ✅ 检查清单

使用测试数据前，请确认：

- [ ] 数据库文件路径正确
- [ ] 有写入权限
- [ ] SQLite 版本 >= 3.8.0
- [ ] 已备份现有数据（如有）
- [ ] 理解数据结构
- [ ] 知道如何清空数据

---

**创建日期**: 2026-02-03  
**适用版本**: MTimer v1.0.0  
**数据量**: 55个任务，200+个专注会话，30天统计数据
