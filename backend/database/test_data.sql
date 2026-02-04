-- ============================================================================
-- MTimer 测试数据脚本 (优化版)
-- 用于生成图表导出、统计展示的全面测试数据
-- ============================================================================
-- 创建日期: 2026-02-03
-- 数据范围: 最近30天的完整数据
-- 包含: 任务(todos)、专注会话(focus_sessions)、每日统计(daily_stats)、事件统计(event_stats)
-- 模式说明: mode=1 (番茄模式/pomodoro), mode=2 (自定义模式/custom)
-- ============================================================================

-- 清空现有数据
DELETE FROM event_stats;
DELETE FROM daily_stats;
DELETE FROM focus_sessions;
DELETE FROM todos;

-- ============================================================================
-- 1. 插入任务数据 (todos)
-- ============================================================================

-- 已完成的任务（涵盖过去30天）
INSERT INTO todos (todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings, completed_at) VALUES
-- 番茄模式任务 (mode=1)
(1, '完成项目需求文档', 1, 'completed', datetime('now', '-30 days'), datetime('now', '-29 days'), 4, NULL, datetime('now', '-29 days')),
(2, '设计数据库架构', 1, 'completed', datetime('now', '-29 days'), datetime('now', '-28 days'), 6, NULL, datetime('now', '-28 days')),
(3, '实现用户登录功能', 1, 'completed', datetime('now', '-28 days'), datetime('now', '-27 days'), 8, NULL, datetime('now', '-27 days')),
(4, '编写单元测试', 1, 'completed', datetime('now', '-27 days'), datetime('now', '-26 days'), 5, NULL, datetime('now', '-26 days')),
(5, '优化数据库查询', 1, 'completed', datetime('now', '-26 days'), datetime('now', '-25 days'), 4, NULL, datetime('now', '-25 days')),
(6, '前端页面开发', 1, 'completed', datetime('now', '-25 days'), datetime('now', '-24 days'), 10, NULL, datetime('now', '-24 days')),
(7, '集成第三方API', 1, 'completed', datetime('now', '-24 days'), datetime('now', '-23 days'), 6, NULL, datetime('now', '-23 days')),
(8, '修复已知Bug', 1, 'completed', datetime('now', '-23 days'), datetime('now', '-22 days'), 4, NULL, datetime('now', '-22 days')),
(9, '编写API文档', 1, 'completed', datetime('now', '-22 days'), datetime('now', '-21 days'), 5, NULL, datetime('now', '-21 days')),
(10, '代码审查', 1, 'completed', datetime('now', '-21 days'), datetime('now', '-20 days'), 3, NULL, datetime('now', '-20 days')),
-- 最近一周的任务
(11, '性能优化-核心模块', 1, 'completed', datetime('now', '-7 days'), datetime('now', '-6 days'), 7, NULL, datetime('now', '-6 days')),
(12, '部署生产环境', 1, 'completed', datetime('now', '-6 days'), datetime('now', '-5 days'), 4, NULL, datetime('now', '-5 days')),
(13, '用户反馈处理', 1, 'completed', datetime('now', '-5 days'), datetime('now', '-4 days'), 5, NULL, datetime('now', '-4 days')),
(14, '版本发布准备', 1, 'completed', datetime('now', '-4 days'), datetime('now', '-3 days'), 3, NULL, datetime('now', '-3 days')),
(15, '编写更新日志', 1, 'completed', datetime('now', '-3 days'), datetime('now', '-2 days'), 2, NULL, datetime('now', '-2 days')),
(16, '昨日核心开发', 1, 'completed', datetime('now', '-1 days'), datetime('now', '-1 days', '+8 hours'), 6, NULL, datetime('now', '-1 days', '+8 hours')),

-- 自定义模式任务 (mode=2)
(20, '深度阅读：高性能MySQL', 2, 'completed', datetime('now', '-30 days'), datetime('now', '-25 days'), 1, '{"duration": 60}', datetime('now', '-25 days')),
(21, '英语听力练习', 2, 'completed', datetime('now', '-25 days'), datetime('now', '-20 days'), 1, '{"duration": 45}', datetime('now', '-20 days')),
(22, '技术博客撰写', 2, 'completed', datetime('now', '-20 days'), datetime('now', '-15 days'), 1, '{"duration": 90}', datetime('now', '-15 days')),
(23, '每周工作总结', 2, 'completed', datetime('now', '-15 days'), datetime('now', '-7 days'), 1, '{"duration": 30}', datetime('now', '-7 days')),
(24, '昨日深度工作', 2, 'completed', datetime('now', '-1 days'), datetime('now', '-1 days', '+10 hours'), 1, '{"duration": 120}', datetime('now', '-1 days', '+10 hours')),
(25, '今日快速回顾', 2, 'completed', datetime('now'), datetime('now', '+1 hours'), 1, '{"duration": 15}', datetime('now', '+1 hours'));

-- 插入一些正在进行和待办的任务
INSERT INTO todos (todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings) VALUES
(30, '开发新图表组件', 1, 'in_progress', datetime('now', '-2 days'), datetime('now'), 10, NULL),
(31, '研究WebAssembly', 2, 'in_progress', datetime('now', '-1 days'), datetime('now'), 1, '{"duration": 120}'),
(32, '重构导出模块', 1, 'pending', datetime('now'), datetime('now'), 8, NULL),
(33, '系统架构升级', 2, 'pending', datetime('now'), datetime('now'), 1, '{"duration": 180}');

-- ============================================================================
-- 2. 插入专注会话数据 (focus_sessions)
-- ============================================================================

-- --- 2.1 昨天的数据 (特别指定) ---
-- 使用 date('now', '-1 days') 确保日期正确
INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode) VALUES
(16, datetime(date('now', '-1 days'), '+09:00:00'), datetime(date('now', '-1 days'), '+09:25:00'), 5, 25, 1),
(16, datetime(date('now', '-1 days'), '+10:00:00'), datetime(date('now', '-1 days'), '+10:25:00'), 5, 25, 1),
(16, datetime(date('now', '-1 days'), '+11:00:00'), datetime(date('now', '-1 days'), '+11:25:00'), 15, 25, 1),
(16, datetime(date('now', '-1 days'), '+14:00:00'), datetime(date('now', '-1 days'), '+14:25:00'), 5, 25, 1),
(16, datetime(date('now', '-1 days'), '+15:00:00'), datetime(date('now', '-1 days'), '+15:25:00'), 5, 25, 1),
(16, datetime(date('now', '-1 days'), '+16:00:00'), datetime(date('now', '-1 days'), '+16:25:00'), 5, 25, 1),
-- 昨天的自定义会话
(24, datetime(date('now', '-1 days'), '+19:00:00'), datetime(date('now', '-1 days'), '+21:00:00'), 10, 120, 2);

-- --- 2.2 今天的数据 ---
INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode) VALUES
(30, datetime(date('now'), '+09:00:00'), datetime(date('now'), '+09:25:00'), 5, 25, 1),
(30, datetime(date('now'), '+10:00:00'), datetime(date('now'), '+10:25:00'), 5, 25, 1),
(25, datetime(date('now'), '+11:00:00'), datetime(date('now'), '+11:15:00'), 0, 15, 2);

-- --- 2.3 最近一周的数据 (2-7天前) ---
INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
SELECT 
    (CASE WHEN session % 3 = 0 THEN 23 ELSE 10 + (day_offset % 5) END) as todo_id,
    datetime(date('now', '-' || day_offset || ' days'), '+' || printf('%02d', 9 + session * 2) || ':00:00') as start_time,
    datetime(date('now', '-' || day_offset || ' days'), '+' || printf('%02d', 9 + session * 2) || ':' || (CASE WHEN session % 3 = 0 THEN '45' ELSE '25' END) || ':00') as end_time,
    5 as break_time,
    (CASE WHEN session % 3 = 0 THEN 45 ELSE 25 END) as duration,
    (CASE WHEN session % 3 = 0 THEN 2 ELSE 1 END) as mode
FROM (
    SELECT 2 as day_offset, 0 as session UNION ALL SELECT 2, 1 UNION ALL SELECT 2, 2 UNION ALL SELECT 2, 3 UNION ALL
    SELECT 3, 0 UNION ALL SELECT 3, 1 UNION ALL SELECT 3, 2 UNION ALL SELECT 3, 3 UNION ALL
    SELECT 4, 0 UNION ALL SELECT 4, 1 UNION ALL SELECT 4, 2 UNION ALL SELECT 4, 3 UNION ALL SELECT 4, 4 UNION ALL
    SELECT 5, 0 UNION ALL SELECT 5, 1 UNION ALL SELECT 5, 2 UNION ALL SELECT 5, 3 UNION ALL
    SELECT 6, 0 UNION ALL SELECT 6, 1 UNION ALL SELECT 6, 2 UNION ALL SELECT 6, 3 UNION ALL SELECT 6, 4 UNION ALL
    SELECT 7, 0 UNION ALL SELECT 7, 1 UNION ALL SELECT 7, 2 UNION ALL SELECT 7, 3
);

-- --- 2.4 8-30天前的数据 ---
INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
SELECT 
    (CASE WHEN day_offset % 5 = 0 THEN 20 + (day_offset % 3) ELSE 1 + (day_offset % 9) END) as todo_id,
    datetime(date('now', '-' || day_offset || ' days'), '+' || printf('%02d', 10 + session * 2) || ':00:00') as start_time,
    datetime(date('now', '-' || day_offset || ' days'), '+' || printf('%02d', 10 + session * 2) || ':' || (CASE WHEN day_offset % 5 = 0 THEN '59' ELSE '25' END) || ':00') as end_time,
    10 as break_time,
    (CASE WHEN day_offset % 5 = 0 THEN 60 ELSE 25 END) as duration,
    (CASE WHEN day_offset % 5 = 0 THEN 2 ELSE 1 END) as mode
FROM (
    SELECT d.day_offset, s.session
    FROM (
        SELECT 8 as day_offset UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION 
        SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION 
        SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION 
        SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION 
        SELECT 28 UNION SELECT 29 UNION SELECT 30
    ) d
    CROSS JOIN (
        SELECT 0 as session UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
    ) s
);

-- ============================================================================
-- 3. 生成每日统计数据 (daily_stats)
-- ============================================================================
-- 根据 focus_sessions 聚合计算
INSERT INTO daily_stats (date, pomodoro_count, custom_count, total_focus_sessions, pomodoro_minutes, custom_minutes, total_focus_minutes, total_break_minutes, tomato_harvests, time_ranges)
SELECT 
    date(start_time) as date,
    SUM(CASE WHEN mode = 1 THEN 1 ELSE 0 END) as pomodoro_count,
    SUM(CASE WHEN mode = 2 THEN 1 ELSE 0 END) as custom_count,
    COUNT(*) as total_focus_sessions,
    SUM(CASE WHEN mode = 1 THEN duration ELSE 0 END) as pomodoro_minutes,
    SUM(CASE WHEN mode = 2 THEN duration ELSE 0 END) as custom_minutes,
    SUM(duration) as total_focus_minutes,
    SUM(break_time) as total_break_minutes,
    SUM(CASE WHEN mode = 1 THEN 1 ELSE 0 END) as tomato_harvests,
    '[]' as time_ranges
FROM focus_sessions
GROUP BY date(start_time)
ORDER BY date;

-- ============================================================================
-- 4. 生成事件统计数据 (event_stats)
-- ============================================================================
-- 为每个任务生成每日的事件统计
INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
SELECT 
    fs.todo_id as event_id,
    date(fs.start_time) as date,
    COUNT(*) as focus_count,
    SUM(fs.duration) as total_focus_time,
    fs.mode,
    CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END as completed
FROM focus_sessions fs
JOIN todos t ON fs.todo_id = t.todo_id
GROUP BY fs.todo_id, date(fs.start_time), fs.mode, t.status
ORDER BY date, event_id;

-- ============================================================================
-- 5. 验证与总结
-- ============================================================================
SELECT '=== 数据统计概览 ===' as info;
SELECT '任务总数: ' || COUNT(*) FROM todos;
SELECT '专注会话总数: ' || COUNT(*) FROM focus_sessions;
SELECT '番茄模式会话: ' || COUNT(*) FROM focus_sessions WHERE mode = 1;
SELECT '自定义模式会话: ' || COUNT(*) FROM focus_sessions WHERE mode = 2;
SELECT '覆盖天数: ' || COUNT(DISTINCT date) FROM daily_stats;

SELECT '=== 最近7天(包含昨日/今日)详情 ===' as info;
SELECT 
    date,
    pomodoro_count as '番茄数',
    custom_count as '自定义数',
    total_focus_minutes as '总专注时长(分)'
FROM daily_stats
WHERE date >= date('now', '-7 days')
ORDER BY date DESC;
