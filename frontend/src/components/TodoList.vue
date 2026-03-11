<script setup lang="ts">
import type { TimerMode } from '../stores/timerStore'
import type { TimerSettings, Todo, TodoStatus } from '../stores/todoStore'
import { CaretDown, CaretUp, Checkmark, CheckmarkOutline, Edit, PlayFilled, Search, Time, TrashCan } from '@vicons/carbon'
import {
  NButton,
  NButtonGroup,
  NCard,
  NDivider,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NRadio,
  NRadioGroup,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NTimeline,
  NTimelineItem,
  useMessage,
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import { useTimerStore, useTodoStore } from '../stores'

// 使用Pinia store
const todoStore = useTodoStore()
const timerStore = useTimerStore()

// 使用storeToRefs保持响应性
const { todos, currentTodo, dailyCompletedTodos, monthlyCompletedTodos } = storeToRefs(todoStore)
const { time, isRunning, currentMode, customWorkTime, customShortBreakTime, customLongBreakTime } = storeToRefs(timerStore)
const newTodo = ref('')
const completedCount = ref(0)
const searchKeyword = ref('') // 搜索输入框的值
const activeSearchKeyword = ref('') // 实际用于过滤的搜索关键词

// 编辑相关状态
const showEditModal = ref(false)
const editingTodo = ref<Todo | null>(null)
const editForm = ref({
  name: '',
  mode: 'pomodoro',
  estimatedPomodoros: 1,
})

// 番茄钟设置相关状态
const showTimerSettingsModal = ref(false)
const settingTodo = ref<Todo | null>(null)
const estimatedPomodoros = ref(1)
const useTargetTime = ref(false)
const estimatedTimeText = ref('') // 用于显示预估耗时的文本
const targetTime = ref<number | undefined>() // 用于设置目标时间

// 添加待办事项模态框相关状态
const showAddTodoModal = ref(false)
const newTodoText = ref('')
const newTodoPomodoros = ref(1)
const newTodoUseTargetTime = ref(false)
const showCustomSettingsModal = ref(false)

// 待办列表展开/收缩状态
const expandedTodos = ref<Record<number, boolean>>({})
// 当前选中的标签
const activeTab = ref<string>('all')

const timerSettingsForm = ref({
  workTime: 25,
  breakTime: 5,
  longBreakTime: 15,
  autoStartBreaks: true,
  autoStartPomodoros: true,
})

// 初始化message服务
const message = useMessage()

// 初始化数据
async function initData() {
  try {
    await todoStore.loadTodos()

    // 初始按照创建时间倒序排列（最新的在上面）
    todos.value.sort((a, b) => b.createdAt - a.createdAt)

    // 确保所有待办事项都有正确的模式
    todos.value.forEach((todo) => {
      if (!todo.mode || (todo.mode !== 'pomodoro' && todo.mode !== 'custom')) {
        console.warn(`修正待办事项(ID: ${todo.id})的模式值为默认的pomodoro`, todo.mode)
        todo.mode = 'pomodoro' // 默认设为番茄模式
      }
    })

    // 更新待办项计数
    updateCompletedCount()

    console.log('待办事项初始化完成，总数:', todos.value.length)
  }
  catch (error: any) {
    console.error('获取待办事项失败:', error)
    message.error('获取待办事项失败')
  }
}

// 触发搜索
function triggerSearch() {
  activeSearchKeyword.value = searchKeyword.value.trim()
}

// 监听搜索框的变化,如果清空了输入框,则自动清除搜索结果
watch(searchKeyword, (newValue) => {
  if (!newValue.trim()) {
    activeSearchKeyword.value = ''
  }
})

// 添加新待办事项
function addTodo() {
  if (newTodo.value.trim()) {
    // 输入有内容，则先填入到模态框中
    newTodoText.value = newTodo.value.trim()

    // 根据当前模式决定显示哪个设置窗口
    if (currentMode.value === 'pomodoro') {
      // 番茄工作法模式 - 显示番茄数设置窗口
      showAddTodoModal.value = true
    }
    else {
      // 自定义专注模式 - 显示自定义时间设置窗口
      showCustomSettingsModal.value = true
    }

    // 清空输入框
    newTodo.value = ''
  }
}

// 通过模态框添加待办事项（带详细设置）
function addTodoWithSettings() {
  if (newTodoText.value.trim()) {
    // 根据当前模式创建计时器设置
    const timerSettings: TimerSettings = {
      workTime: currentMode.value === 'pomodoro' ? 25 : customWorkTime.value,
      shortBreakTime: currentMode.value === 'pomodoro' ? 5 : customShortBreakTime.value,
      longBreakTime: currentMode.value === 'pomodoro' ? 15 : customLongBreakTime.value,
      isCustom: currentMode.value === 'custom',
    }

    // 计算目标时间（根据当前模式）
    let targetTime: number | undefined
    if (newTodoUseTargetTime.value) {
      // 番茄模式固定25分钟，自定义模式使用用户设置的时间
      const workMinutes = currentMode.value === 'pomodoro' ? 25 : customWorkTime.value
      targetTime = newTodoPomodoros.value * workMinutes
    }

    // 保存当前进行中的任务ID和状态
    const currentTaskId = currentTodo.value?.id
    const isTimerRunning = isRunning.value

    // 添加待办事项，并传入当前模式
    const createTodoRequest = {
      name: newTodoText.value.trim(),
      mode: currentMode.value,
      estimatedPomodoros: newTodoPomodoros.value,
    }

    // 创建新待办事项
    todoStore.addTodo(createTodoRequest).then((success) => {
      if (success) {
        // 强制更新UI
        nextTick(() => {
          // 重置表单
          newTodoText.value = ''
          newTodoPomodoros.value = 1
          newTodoUseTargetTime.value = false

          // 关闭所有模态框
          showAddTodoModal.value = false
          showCustomSettingsModal.value = false

          // 智能刷新待办事项，保持当前进行中的任务状态
          if (currentTaskId && isTimerRunning) {
            // 有任务正在进行中，使用智能刷新
            todoStore.loadTodosWithoutApplying().then((todos) => {
              // 处理新加载的数据，保持当前任务的进行中状态
              const processedTodos = todos.map(todo =>
                todo.id === currentTaskId ? { ...todo, status: 'inProgress' } : todo,
              )

              // 更新状态，保持当前任务状态不变
              todoStore.updateTodosKeepingCurrentTask(processedTodos, currentTaskId)

              // 触发计时器设置更新
              timerStore.loadSettings()

              console.log('新任务创建成功，进行中的任务状态已保留')
            })
          }
          else {
            // 没有任务正在进行中，可以安全地完全刷新
            todoStore.loadTodos().then(() => {
              // 切换到"全部"标签以显示新创建的任务
              activeTab.value = 'all'

              // 触发计时器设置更新
              timerStore.loadSettings()

              console.log('新任务创建成功，UI已完全刷新')
            })
          }
        })
      }
    })
  }
}

// 删除待办事项
function removeTodo(id: number) {
  // 保存当前进行中的任务ID和状态
  const currentTaskId = currentTodo.value?.id
  const isTimerRunning = isRunning.value

  // 检查是否删除的是当前进行中的任务
  const isDeletingCurrentTask = id === currentTaskId

  todoStore.removeTodo(id).then((success) => {
    if (success) {
      // 删除成功后，强制刷新UI
      nextTick(() => {
        // 如果删除的是当前进行中的任务，则普通刷新即可
        if (isDeletingCurrentTask) {
          todoStore.loadTodos().then(() => {
            // 刷新计时器状态
            timerStore.loadSettings()
            console.log('删除了进行中的任务，UI已完全刷新')
          })
        }
        else if (currentTaskId && isTimerRunning) {
          // 删除的不是进行中的任务，保持当前任务的状态
          todoStore.loadTodosWithoutApplying().then((todos) => {
            // 处理新加载的数据，保持当前任务的进行中状态
            const processedTodos = todos.map(todo =>
              todo.id === currentTaskId ? { ...todo, status: 'inProgress' } : todo,
            )

            // 更新状态但保持当前任务状态
            todoStore.updateTodosKeepingCurrentTask(processedTodos, currentTaskId)
            console.log('删除任务成功，保留了进行中任务的状态')
          })
        }
        else {
          // 没有任务正在进行中，可以安全地完全刷新
          todoStore.loadTodos().then(() => {
            // 刷新计时器状态
            timerStore.loadSettings()
            console.log('待办事项删除后UI已刷新')
          })
        }
      })
    }
  })
}

// 切换待办事项完成状态
function toggleTodo(id: number) {
  todoStore.toggleTodo(id).then((success) => {
    if (success) {
      // 强制更新UI
      nextTick(() => {
        // 重新刷新待办列表
        todoStore.loadTodos().then(() => {
          console.log('待办事项状态切换后UI已刷新')
        })
      })
    }
  })
}

// 打开编辑模态框
function openEditModal(todo: Todo) {
  console.log('打开编辑模态框', todo)
  editingTodo.value = todo
  editForm.value = {
    name: todo.name || todo.text || '',
    mode: todo.mode,
    estimatedPomodoros: todo.estimatedPomodoros,
  }
  showEditModal.value = true
}

// 保存编辑
async function saveEdit() {
  if (!editingTodo.value) {
    console.error('没有待编辑的待办事项')
    return
  }

  // 更新待办事项设置（名称、专注模式和预计专注次数）
  const todo = {
    todo_id: editingTodo.value.id,
    name: editForm.value.name,
    mode: editForm.value.mode,
    estimatedPomodoros: editForm.value.estimatedPomodoros,
    // 如果是自定义模式，确保保留自定义设置
    customSettings: editForm.value.mode === 'custom' && editingTodo.value.customSettings
      ? {
          workTime: editingTodo.value.customSettings.workTime,
          shortBreakTime: editingTodo.value.customSettings.shortBreakTime,
          longBreakTime: editingTodo.value.customSettings.longBreakTime,
        }
      : undefined,
  }

  // 调用store方法保存更改
  await todoStore.updateTodoSettings(todo)

  // 关闭编辑模态框
  showEditModal.value = false
}

// 更新已完成数量
function updateCompletedCount() {
  completedCount.value = todos.value.filter(todo => todo.completed).length
}

// 清除所有已完成的待办事项
function clearCompleted() {
  todoStore.clearCompleted()
}

// 打开番茄钟设置模态框
function openTimerSettingsModal(todo: Todo) {
  settingTodo.value = todo
  currentMode.value = todo.mode || 'pomodoro'

  // 从待办事项加载自定义设置
  if (todo.customSettings) {
    customWorkTime.value = todo.customSettings.workTime || 20
    customShortBreakTime.value = todo.customSettings.shortBreakTime || 5
    customLongBreakTime.value = todo.customSettings.longBreakTime || 10
  }

  // 根据待办事项的estimatedPomodoros设置预估番茄钟数量
  estimatedPomodoros.value = todo.estimatedPomodoros || 1
  // 设置目标时间（如果有）
  targetTime.value = todo.targetTime
  // 根据是否有targetTime设置使用目标时间的开关
  useTargetTime.value = !!todo.targetTime

  console.log(`打开专注设置 - 待办事项ID: ${todo.id}, 名称: ${todo.name || todo.text || '未命名任务'}`)

  showTimerSettingsModal.value = true
}

// 保存番茄钟设置
async function saveTimerSettings() {
  if (settingTodo.value) {
    const todoId = settingTodo.value.id

    // 保存任务的专注模式 (取自当前选择的模式)
    const todoMode = currentMode.value

    console.log(`保存前 - 待办事项ID: ${todoId}, 原模式: ${settingTodo.value.mode}, 新模式: ${todoMode}`)

    // 检查是否需要显示确认对话框：
    // 1. 待办事项正在进行中
    // 2. 用户尝试改变专注模式（原模式与新模式不同）
    const isInProgress = settingTodo.value.status === 'inProgress'
    const modeChanged = settingTodo.value.mode !== todoMode

    // 是否继续进行更新
    let shouldContinue = true

    if (isInProgress && modeChanged) {
      // 待办事项正在进行中且用户尝试改变专注模式，显示确认对话框
      shouldContinue = confirm(`待办事项"${settingTodo.value.name || settingTodo.value.text}"正在进行中，是否确认更改其专注模式？`)
    }

    if (!shouldContinue) {
      // 用户取消更改，关闭模态框
      showTimerSettingsModal.value = false
      return
    }

    console.log(`保存专注设置，待办事项ID: ${todoId}, 新模式: ${todoMode}, 原模式: ${settingTodo.value.mode}`)

    try {
      // 创建更新请求对象
      const todoToUpdate: any = {
        todo_id: todoId,
        name: settingTodo.value.name || settingTodo.value.text || '',
        mode: todoMode,
        estimatedPomodoros: estimatedPomodoros.value,
      }

      // 如果是自定义模式，添加自定义设置
      if (todoMode === 'custom') {
        todoToUpdate.customSettings = {
          workTime: customWorkTime.value,
          shortBreakTime: customShortBreakTime.value,
          longBreakTime: customLongBreakTime.value,
        }

        console.log('添加自定义专注设置:', todoToUpdate.customSettings)
      }

      // 直接更新本地待办事项列表，确保UI立即响应
      const todoIndex = todos.value.findIndex(t => t.id === todoId)
      if (todoIndex !== -1) {
        // 保存旧模式，用于处理后续UI更新判断
        const oldMode = todos.value[todoIndex].mode

        // 先更新模式和番茄数量
        todos.value[todoIndex].mode = todoMode as 'pomodoro' | 'custom'
        todos.value[todoIndex].estimatedPomodoros = estimatedPomodoros.value

        // 更新目标时间（如果启用了）
        if (useTargetTime.value) {
          const workMinutes = todoMode === 'pomodoro' ? 25 : customWorkTime.value
          todos.value[todoIndex].targetTime = estimatedPomodoros.value * workMinutes
        }
        else {
          todos.value[todoIndex].targetTime = undefined
        }

        // 如果是自定义模式，确保customSettings存在并更新
        if (todoMode === 'custom') {
          // 初始化customSettings对象（如果不存在）
          if (!todos.value[todoIndex].customSettings) {
            todos.value[todoIndex].customSettings = {
              workTime: customWorkTime.value,
              shortBreakTime: customShortBreakTime.value,
              longBreakTime: customLongBreakTime.value,
            }
          }
          else {
            // 更新自定义设置
            todos.value[todoIndex].customSettings.workTime = customWorkTime.value
            todos.value[todoIndex].customSettings.shortBreakTime = customShortBreakTime.value
            todos.value[todoIndex].customSettings.longBreakTime = customLongBreakTime.value
          }
        }

        // 如果待办事项正在进行中，立即更新计时器设置
        if (isInProgress && todos.value[todoIndex].id === todoStore.currentTodo?.id) {
          if (oldMode !== todoMode || todoMode === 'custom') {
            // 重置计时器，使用新的模式和设置
            timerStore.setTodoTimer(
              todos.value[todoIndex].id,
              todos.value[todoIndex].mode,
              todos.value[todoIndex].customSettings,
            )
            console.log(`待办事项正在进行中，已立即应用新的专注模式: ${todos.value[todoIndex].mode}`)
          }
        }
      }

      // 关闭模态框
      showTimerSettingsModal.value = false
      message.success(`成功将专注模式切换为${todoMode === 'pomodoro' ? '番茄专注' : '自定义专注'}`)

      // 异步与后端同步，不阻塞UI响应
      todoStore.updateTodoSettings(todoToUpdate)
        .then((success) => {
          if (!success) {
            console.warn('后端保存专注设置失败，但UI已更新')
            message.warning('设置已在本地更新，但同步到服务器时出现问题')
          }
        })
        .catch((error) => {
          console.error('更新专注设置时发生错误:', error)
        })
    }
    catch (error) {
      console.error('更新专注设置失败:', error)
      message.error('更新专注设置失败')
      showTimerSettingsModal.value = false
    }
  }
}

// 开始番茄钟
function startTodoTimer(todo: Todo) {
  // 检查是否有其他任务正在进行中
  const otherInProgressTodo = todos.value.find(t => t.id !== todo.id && t.status === 'inProgress')

  if (otherInProgressTodo && isRunning.value) {
    // 如果有其他任务正在进行，显示确认对话框
    if (confirm(`当前已有任务"${otherInProgressTodo.name || otherInProgressTodo.text || '未命名任务'}"正在专注中。\n切换到"${todo.name || todo.text || '未命名任务'}"将暂停当前任务，是否继续？`)) {
      // 用户确认切换任务
      startNewTimer(todo)
    }
  }
  else {
    // 没有其他任务正在进行，直接开始
    startNewTimer(todo)
  }
}

// 实际开始计时器的辅助方法
async function startNewTimer(todo: Todo) {
  // 先启动专注会话，这里使用待办事项自己的模式，而不是全局模式
  await todoStore.startFocusSession(todo.id, todo.mode)

  console.log(`开始新计时器 - 待办事项ID:${todo.id}, 模式:${todo.mode}, 自定义设置:`, todo.customSettings)

  // 使用待办事项自身的模式和自定义设置设置计时器
  timerStore.setTodoTimer(todo.id, todo.mode, todo.customSettings)

  // 如果没有运行，则自动开始
  if (!isRunning.value) {
    timerStore.startTimer()
  }

  // 切换到"进行中"标签页显示
  activeTab.value = 'inProgress'
}

// 获取状态徽章类型
function getStatusType(status: TodoStatus) {
  switch (status) {
    case 'completed': return 'success'
    case 'inProgress': return 'info'
    case 'paused': return 'warning'
    default: return 'default'
  }
}

// 获取状态文本
function getStatusText(status: TodoStatus) {
  switch (status) {
    case 'completed': return '已完成'
    case 'inProgress': return '进行中'
    case 'paused': return '已暂停'
    default: return '待办'
  }
}

// 格式化时间（秒转为分钟）
function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}分钟`
}

// 格式化秒数为时分秒格式
function formatTimeHMS(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  let result = ''
  if (hours > 0) {
    result += `${hours}小时`
  }
  if (minutes > 0 || hours > 0) {
    result += `${minutes}分钟`
  }
  if (secs > 0 || (hours === 0 && minutes === 0)) {
    result += `${secs}秒`
  }

  return result
}

// 处理待办事项自动完成时的动画效果
function showTaskCompletedNotification(todo: Todo) {
  // 显示任务完成通知
  message.success(() => h('div', {}, [
    h('p', {
      style: 'font-weight: bold; font-size: 14px; margin-bottom: 5px;',
    }, '🎉 待办事项已完成'),
    h('p', {
      style: 'font-size: 13px;',
    }, `"${todo.name || todo.text || '未命名任务'}" 已完成所有预计专注次数!`),
  ]), {
    duration: 3000,
  })

  // 自动切换到已完成标签
  setTimeout(() => {
    activeTab.value = 'completed'
  }, 500)
}

// 监听todos变化，更新已完成数量和检查有没有自动完成的任务
watch(todos, (newTodos, oldTodos) => {
  updateCompletedCount()

  // 检查是否有新完成的任务
  if (oldTodos && newTodos.length === oldTodos.length) {
    newTodos.forEach((newTodo) => {
      const oldTodo = oldTodos.find(t => t.id === newTodo.id)
      if (oldTodo && !oldTodo.completed && newTodo.completed) {
        // 找到了一个新完成的任务，显示通知
        showTaskCompletedNotification(newTodo as Todo)
      }
    })
  }
}, { deep: true })

// 组件挂载时加载待办事项
onMounted(() => {
  initData()
  updateCompletedCount()
})

// 监听模态框状态变化
watch([showEditModal, showTimerSettingsModal], ([newEditModal, newTimerModal]) => {
  if (!newEditModal) {
    // 重置编辑表单数据
    editForm.value = {
      name: '',
      mode: 'pomodoro',
      estimatedPomodoros: 1,
    }
    // 清除当前编辑项
    editingTodo.value = null
    console.log('编辑模态框已关闭，状态已重置')
  }
  if (!newTimerModal) {
    // 重置计时设置表单
    timerSettingsForm.value = {
      workTime: 25,
      breakTime: 5,
      longBreakTime: 15,
      autoStartBreaks: true,
      autoStartPomodoros: true,
    }
    // 清除当前设置项
    settingTodo.value = null
    console.log('专注设置模态框已关闭，状态已重置')
  }
})

// 格式化日期，添加显示友好的相对时间
function formatDate(timestamp: number | null): string {
  if (!timestamp)
    return '未完成'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  // 添加友好的相对时间
  let relativeTime = ''
  if (diffDays > 0) {
    relativeTime = diffDays === 1 ? '1天前' : `${diffDays}天前`
  }
  else if (diffHours > 0) {
    relativeTime = diffHours === 1 ? '1小时前' : `${diffHours}小时前`
  }
  else if (diffMins > 0) {
    relativeTime = diffMins === 1 ? '1分钟前' : `${diffMins}分钟前`
  }
  else {
    relativeTime = '刚刚'
  }

  // 完整时间格式
  const fullDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  return `${fullDate} (${relativeTime})`
}

// 获取时间线项目类型
function getTimelineItemType(todo: Todo) {
  return todo.completed ? 'success' : 'default'
}

// 切换待办事项展开/收缩状态
function toggleExpand(id: number) {
  expandedTodos.value[id] = !expandedTodos.value[id]
}

// 按状态过滤待办事项
const filteredTodos = computed(() => {
  let result
  switch (activeTab.value) {
    case 'pending':
      result = todos.value.filter(todo => todo.status === 'pending')
      break
    case 'inProgress':
      result = todos.value.filter(todo => todo.status === 'inProgress')
      break
    case 'completed':
      result = todos.value.filter(todo => todo.completed)
      break
    default:
      result = [...todos.value]
  }

  // 如果有搜索关键词,进行搜索过滤
  if (activeSearchKeyword.value) {
    const keyword = activeSearchKeyword.value.toLowerCase()
    result = result.filter((todo) => {
      const name = (todo.name || todo.text || '').toLowerCase()
      return name.includes(keyword)
    })
  }

  // 按照创建时间倒序排列，最新创建的显示在前面
  return result.sort((a, b) => b.createdAt - a.createdAt)
})

// 统计各状态下的待办数量
const todoCountsByStatus = computed(() => {
  const pending = todos.value.filter(todo => todo.status === 'pending').length
  const inProgress = todos.value.filter(todo => todo.status === 'inProgress').length
  const completed = todos.value.filter(todo => todo.completed).length
  const total = todos.value.length

  return { pending, inProgress, completed, total }
})

// 在组件中添加默认设置函数
function getTimerSettings(mode: 'pomodoro' | 'custom') {
  // 从timerStore中获取设置或使用默认值
  const timerStore = useTimerStore()
  return {
    workTime: mode === 'pomodoro' ? timerStore.workTime : timerStore.customWorkTime,
    shortBreakTime: mode === 'pomodoro' ? timerStore.shortBreakTime : timerStore.customShortBreakTime,
    longBreakTime: mode === 'pomodoro' ? timerStore.longBreakTime : timerStore.customLongBreakTime,
    isCustom: mode === 'custom',
  }
}

// 处理模式变化的逻辑
function handleModeChange(newMode: string) {
  console.log(`切换专注模式为: ${newMode}`)

  // 立即更新计时器模式
  timerStore.forceUpdateTimerMode(newMode as TimerMode)

  // 更新当前模式值
  currentMode.value = newMode as TimerMode

  // 如果切换到自定义模式，从当前待办事项加载自定义设置
  if (newMode === 'custom' && settingTodo.value) {
    // 从待办事项加载自定义设置（如果有）
    if (settingTodo.value.customSettings) {
      customWorkTime.value = settingTodo.value.customSettings.workTime
      customShortBreakTime.value = settingTodo.value.customSettings.shortBreakTime
      customLongBreakTime.value = settingTodo.value.customSettings.longBreakTime
      console.log(`已从待办事项加载自定义设置:`, settingTodo.value.customSettings)
    }
    else {
      // 使用默认设置
      customWorkTime.value = timerStore.customWorkTime
      customShortBreakTime.value = timerStore.customShortBreakTime
      customLongBreakTime.value = timerStore.customLongBreakTime
      console.log(`待办事项无自定义设置，使用默认设置:`, {
        workTime: customWorkTime.value,
        shortBreakTime: customShortBreakTime.value,
        longBreakTime: customLongBreakTime.value,
      })
    }
  }

  // 如果待办事项正在进行中，显示提示消息
  if (settingTodo.value && settingTodo.value.status === 'inProgress') {
    message.info('待办事项正在进行中，更改专注模式将在保存后生效')
  }

  // 使用nextTick确保UI立即更新
  nextTick(() => {
    // 更新预估时间显示
    updateEstimatedTimeDisplay()
  })
}

// 更新预估耗时显示
function updateEstimatedTimeDisplay() {
  let timeText = ''
  let timeInMinutes = 0

  // 根据当前模式和待办事项的估计番茄数计算总时间
  if (currentMode.value === 'pomodoro') {
    // 使用番茄工作法模式（25分钟一个番茄）
    timeInMinutes = estimatedPomodoros.value * 25
    timeText = `约${timeInMinutes}分钟`
  }
  else if (currentMode.value === 'custom') {
    // 根据自定义工作时间计算
    let workTime = customWorkTime.value

    // 确保有有效的工作时间
    if (!workTime || workTime <= 0) {
      workTime = 20 // 默认值
    }

    timeInMinutes = estimatedPomodoros.value * workTime
    timeText = `约${timeInMinutes}分钟`
  }

  // 更新显示文本
  estimatedTimeText.value = timeText

  // 如果勾选了设置目标时间选项，同步更新
  if (useTargetTime.value) {
    targetTime.value = timeInMinutes
  }

  console.log(`已更新预估时间: ${timeText}, 模式: ${currentMode.value}, 自定义工作时间: ${customWorkTime.value}分钟`)
}
</script>

<template>
  <div class="todo-list">
    <NCard class="todo-card">
      <template #header>
        <div class="todo-header">
          <div class="todo-header-title">
            <h2>待办事项</h2>
            <NTag type="primary" size="small" class="todo-count">
              总计: {{ todoCountsByStatus.total }}
            </NTag>
          </div>
          <NButtonGroup v-if="completedCount > 0">
            <NPopconfirm @positive-click="clearCompleted">
              <template #trigger>
                <NButton type="error">
                  <template #icon>
                    <NIcon>
                      <TrashCan />
                    </NIcon>
                  </template>
                  清除已完成
                </NButton>
              </template>
              是否确认清除所有已完成的待办事项？
            </NPopconfirm>
          </NButtonGroup>
        </div>
      </template>

      <!-- 搜索和添加待办事项输入框 -->
      <div class="todo-input-row">
        <!-- 添加待办事项 -->
        <div class="add-todo">
          <NInput
            v-model:value="newTodo" type="text" placeholder="添加新的待办事项..." class="todo-input"
            @keyup.enter="addTodo"
          />
          <NButton circle class="add-btn" :disabled="!newTodo.trim()" @click="addTodo">
            <template #icon>
              <NIcon>
                <Checkmark />
              </NIcon>
            </template>
          </NButton>
        </div>

         <!-- 搜索待办事项 -->
        <div class="search-todo">
          <NInput
            v-model:value="searchKeyword"
            type="text"
            placeholder="搜索待办事项..."
            class="search-input"
            @keyup.enter="triggerSearch"
          />
          <NButton circle class="search-btn" :disabled="!searchKeyword.trim()" @click="triggerSearch">
            <template #icon>
              <NIcon>
                <Search />
              </NIcon>
            </template>
          </NButton>
        </div>
      </div>

      <!-- 待办事项状态分类标签页 -->
      <NTabs v-model:value="activeTab" type="line" class="todo-tabs">
        <NTabPane name="all" tab="全部">
          <NTag round size="small" class="tab-count" type="default">
            {{ todoCountsByStatus.total }}
          </NTag>
        </NTabPane>
        <NTabPane name="pending" tab="待处理">
          <NTag round size="small" class="tab-count" type="default">
            {{ todoCountsByStatus.pending }}
          </NTag>
        </NTabPane>
        <NTabPane name="inProgress" tab="进行中">
          <NTag round size="small" class="tab-count" type="info">
            {{ todoCountsByStatus.inProgress }}
          </NTag>
        </NTabPane>
        <NTabPane name="completed" tab="已完成">
          <NTag round size="small" class="tab-count" type="success">
            {{ todoCountsByStatus.completed }}
          </NTag>
        </NTabPane>
      </NTabs>

      <div class="todo-items">
        <NEmpty v-if="filteredTodos.length === 0" description="暂无待办事项" />

        <!-- 使用时间线组件替换列表 -->
        <NTimeline v-else class="compact-timeline">
          <NTimelineItem
            v-for="todo in filteredTodos" :key="todo.id" :type="getTimelineItemType(todo)"
            :title="todo.name || todo.text || '未命名任务'" :class="{ 'completed-timeline-item': todo.completed }"
            class="todo-timeline-item"
          >
            <template #icon>
              <div class="timeline-icon" :class="{ completed: todo.completed }">
                <NIcon v-if="todo.completed">
                  <Checkmark />
                </NIcon>
              </div>
            </template>
            <!-- Todo项内容 -->
            <div :class="{ 'completed-todo': todo.completed }" class="todo-item">
              <!-- 紧凑显示的基本信息 -->
              <div class="todo-summary">
                <NTag :type="getStatusType(todo.status)" size="small" class="status-tag">
                  {{ getStatusText(todo.status) }}
                </NTag>
                <div class="pomodoro-count-compact">
                  <span v-if="todo.mode === 'pomodoro'" class="mode-icon">🍅</span>
                  <span v-else-if="todo.mode === 'custom'" class="mode-icon">⏱️</span>
                  <span v-else class="mode-icon">🍅</span>
                  <span class="tomato-progress">
                    <span class="completed-count" :class="{ 'highlight-count': todo.completedPomodoros > 0 }">{{ todo.completedPomodoros }}</span>
                    /{{ todo.estimatedPomodoros }}
                  </span>
                  <!-- 添加完成进度指示器 -->
                  <div
                    v-if="todo.completedPomodoros > 0"
                    class="progress-indicator"
                    :style="{ width: `${Math.min(100, (todo.completedPomodoros / todo.estimatedPomodoros) * 100)}%` }"
                  />
                </div>

                <!-- 开始番茄钟按钮 -->
                <NButton
                  circle size="small" :type="currentTodo?.id === todo.id ? 'primary' : 'default'"
                  class="timer-btn-compact" :disabled="todo.completed" @click="startTodoTimer(todo)"
                >
                  <template #icon>
                    <NIcon>
                      <PlayFilled />
                    </NIcon>
                  </template>
                </NButton>

                <!-- 展开/收缩按钮 -->
                <NButton text class="expand-btn" @click="toggleExpand(todo.id)">
                  <NIcon>
                    <template v-if="expandedTodos[todo.id]">
                      <CaretUp />
                    </template>
                    <template v-else>
                      <CaretDown />
                    </template>
                  </NIcon>
                  {{ expandedTodos[todo.id] ? '收起' : '展开' }}
                </NButton>
              </div>

              <!-- 可展开的详细信息 -->
              <div v-if="expandedTodos[todo.id]" class="todo-detail">
                <div class="todo-info">
                  <!-- 时间戳信息 -->
                  <div class="timestamps">
                    <NTag type="info" size="small" class="timestamp-tag">
                      创建于: {{ formatDate(todo.createdAt) }}
                    </NTag>
                    <NTag
                      v-if="todo.completed && todo.completedAt" type="success" size="small"
                      class="timestamp-tag"
                    >
                      完成于: {{ formatDate(todo.completedAt) }}
                    </NTag>
                  </div>

                  <!-- 番茄钟信息 -->
                  <div class="pomodoro-info">
                    <span v-if="todo.totalFocusTime > 0" class="focus-time">
                      累计专注: <strong>{{ formatTimeHMS(todo.totalFocusTime) }}</strong>
                    </span>

                    <span v-if="todo.targetTime" class="target-time">
                      目标时长: <strong>{{ todo.targetTime }}分钟</strong>
                    </span>

                    <!-- 显示创建模式的标签 -->
                    <NTag
                      size="small" :type="todo.mode === 'pomodoro' ? 'error' : 'success'"
                      class="mode-tag"
                    >
                      {{ todo.mode === 'pomodoro' ? '番茄专注' : '自定义专注' }}
                    </NTag>

                    <!-- 如果正在专注此任务，显示当前状态 -->
                    <span v-if="currentTodo?.id === todo.id && isRunning" class="current-focus">
                      <NTag type="warning" size="small">
                        <NIcon size="14"><Time /></NIcon>
                        <span style="margin-left: 4px;">当前正在专注</span>
                      </NTag>
                    </span>
                  </div>
                </div>

                <div class="todo-actions">
                  <NSpace>
                    <!-- 番茄钟设置按钮 -->
                    <NButton
                      circle size="small" class="settings-btn"
                      :class="{ 'pomodoro-mode-btn': todo.mode === 'pomodoro', 'custom-mode-btn': todo.mode === 'custom' }"
                      @click="openTimerSettingsModal(todo)"
                    >
                      <template #icon>
                        <NIcon>
                          <Time />
                        </NIcon>
                      </template>
                    </NButton>

                    <!-- 编辑按钮 -->
                    <NButton circle size="small" class="edit-btn" @click="openEditModal(todo)">
                      <template #icon>
                        <NIcon>
                          <Edit />
                        </NIcon>
                      </template>
                    </NButton>

                    <!-- 删除按钮 -->
                    <NPopconfirm trigger="click" @positive-click="removeTodo(todo.id)">
                      <template #trigger>
                        <NButton circle size="small" class="delete-btn">
                          <template #icon>
                            <NIcon>
                              <TrashCan />
                            </NIcon>
                          </template>
                        </NButton>
                      </template>
                      确定删除这个待办事项吗？
                    </NPopconfirm>
                  </NSpace>
                </div>
              </div>
            </div>
          </NTimelineItem>
        </NTimeline>
      </div>

      <NDivider v-if="completedCount > 0" />

      <div v-if="completedCount > 0" class="todo-footer">
        <NPopconfirm trigger="click" @positive-click="clearCompleted">
          <template #trigger>
            <NButton size="small">
              清除已完成 ({{ completedCount }})
            </NButton>
          </template>
          确定清除所有已完成的待办事项吗？
        </NPopconfirm>
      </div>
    </NCard>
  </div>

  <!-- 编辑待办事项模态框 -->
  <NModal v-model:show="showEditModal" preset="card" title="编辑待办事项" style="width: 400px;">
    <NForm>
      <NFormItem label="待办事项内容">
        <NInput v-model:value="editForm.name" type="text" placeholder="编辑待办事项内容..." />
      </NFormItem>

      <NFormItem label="选择专注模式">
        <NRadioGroup v-model:value="editForm.mode" size="medium">
          <NSpace>
            <NRadio value="pomodoro">
              <NSpace align="center">
                <span class="mode-icon">🍅</span>
                <span>番茄工作法</span>
              </NSpace>
            </NRadio>
            <NRadio value="custom">
              <NSpace align="center">
                <span class="mode-icon">⏱️</span>
                <span>自定义专注</span>
              </NSpace>
            </NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItem>

      <NFormItem :label="editForm.mode === 'pomodoro' ? '预计需要的番茄数' : '预计需要的专注次数'">
        <NInputNumber v-model:value="editForm.estimatedPomodoros" :min="1" :max="10" />
        <span v-if="editForm.mode === 'pomodoro'" class="form-tip">（每个番茄 = 25分钟专注时间）</span>
        <span v-else class="form-tip">（每次 = {{ customWorkTime }}分钟专注时间）</span>
      </NFormItem>

      <div style="display: flex; justify-content: flex-end;">
        <NButton type="primary" :disabled="!editForm.name.trim()" @click="saveEdit">
          <template #icon>
            <NIcon>
              <CheckmarkOutline />
            </NIcon>
          </template>
          保存
        </NButton>
      </div>
    </NForm>
  </NModal>

  <!-- 番茄钟设置模态框 -->
  <NModal v-model:show="showTimerSettingsModal" preset="card" title="专注设置" style="width: 500px;">
    <NForm>
      <NFormItem label="选择专注模式">
        <NRadioGroup v-model:value="currentMode" size="medium" @update:value="handleModeChange">
          <NSpace>
            <NRadio value="pomodoro">
              <NSpace align="center">
                <span class="mode-icon">🍅</span>
                <span>番茄工作法</span>
              </NSpace>
            </NRadio>
            <NRadio value="custom">
              <NSpace align="center">
                <span class="mode-icon">⏱️</span>
                <span>自定义专注</span>
              </NSpace>
            </NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItem>

      <template v-if="currentMode === 'pomodoro'">
        <!-- 番茄工作法介绍 -->
        <div class="pomodoro-info-box">
          <h3>番茄工作法 <span class="tomato-emoji">🍅</span></h3>
          <p>每个番茄钟包含：</p>
          <ul>
            <li><span class="highlight">专注工作：</span> 25分钟</li>
            <li><span class="highlight">短休息：</span> 5分钟</li>
            <li><span class="highlight">长休息：</span> 每完成4个番茄钟后，休息15分钟</li>
          </ul>
        </div>
      </template>

      <template v-else>
        <!-- 自定义专注模式设置 -->
        <div class="custom-info-box">
          <h3>自定义专注 <span class="timer-emoji">⏱️</span></h3>
          <p>根据个人需求自由设置专注和休息时间:</p>
        </div>

        <NFormItem label="专注时长 (分钟)">
          <NInputNumber v-model:value="customWorkTime" :min="1" :max="120" />
          <span class="form-tip">（建议设置在15-60分钟之间）</span>
        </NFormItem>

        <NFormItem label="短休息时长 (分钟)">
          <NInputNumber v-model:value="customShortBreakTime" :min="1" :max="30" />
          <span class="form-tip">（建议设置在3-10分钟之间）</span>
        </NFormItem>

        <NFormItem label="长休息时长 (分钟)">
          <NInputNumber v-model:value="customLongBreakTime" :min="5" :max="60" />
          <span class="form-tip">（每4个专注周期后的休息时间）</span>
        </NFormItem>
      </template>

      <NDivider />

      <NFormItem label="预计需要的专注次数">
        <NInputNumber v-model:value="estimatedPomodoros" :min="1" :max="10" />
        <span class="form-tip">
          （每次 = {{ currentMode === 'pomodoro' ? 25 : customWorkTime }}分钟专注时间）
        </span>
      </NFormItem>

      <NFormItem label="自动完成设置">
        <NSwitch v-model:value="useTargetTime" />
        <span class="form-tip">（达到目标专注次数后自动完成任务）</span>
      </NFormItem>

      <div style="display: flex; justify-content: flex-end;">
        <NSpace>
          <NButton @click="showTimerSettingsModal = false">
            取消
          </NButton>
          <NButton type="primary" @click="saveTimerSettings">
            保存设置
          </NButton>
        </NSpace>
      </div>
    </NForm>
  </NModal>

  <!-- 添加新待办事项模态框 -->
  <NModal v-model:show="showAddTodoModal" preset="card" title="设置专注番茄数" style="width: 500px;">
    <NForm>
      <NFormItem label="待办事项内容">
        <NInput v-model:value="newTodoText" type="text" placeholder="输入待办事项内容..." disabled />
      </NFormItem>

      <!-- 番茄工作法介绍 -->
      <div class="pomodoro-info-box">
        <h3>番茄工作法 <span class="tomato-emoji">🍅</span></h3>
        <p>每个番茄钟包含：</p>
        <ul>
          <li><span class="highlight">专注工作：</span> 25分钟</li>
          <li><span class="highlight">短休息：</span> 5分钟</li>
          <li><span class="highlight">长休息：</span> 每完成4个番茄钟后，休息15分钟</li>
        </ul>
      </div>

      <NFormItem label="预计需要的番茄数">
        <NInputNumber v-model:value="newTodoPomodoros" :min="1" :max="10" />
        <span class="form-tip">（每个番茄 = 25分钟专注时间）</span>
      </NFormItem>

      <NFormItem>
        <NSpace vertical>
          <div class="pomodoro-calculation">
            <span>总计专注时间：<span class="total-time">{{ newTodoPomodoros * 25 }}</span> 分钟</span>
          </div>
        </NSpace>
      </NFormItem>

      <NFormItem label="自动完成设置">
        <NSwitch v-model:value="newTodoUseTargetTime" />
        <span class="form-tip">（达到目标番茄数后自动完成任务）</span>
      </NFormItem>

      <div style="display: flex; justify-content: flex-end;">
        <NButton type="primary" :disabled="!newTodoText.trim()" @click="addTodoWithSettings">
          确认添加
        </NButton>
      </div>
    </NForm>
  </NModal>

  <!-- 自定义专注模式设置模态框 -->
  <NModal v-model:show="showCustomSettingsModal" preset="card" title="自定义专注模式设置" style="width: 500px;">
    <NForm>
      <NFormItem label="待办事项内容">
        <NInput v-model:value="newTodoText" type="text" placeholder="输入待办事项内容..." disabled />
      </NFormItem>

      <!-- 自定义专注模式介绍 -->
      <div class="custom-info-box">
        <h3>自定义专注模式 <span class="timer-emoji">⏱️</span></h3>
        <p>根据个人需求自由设置专注和休息时间：</p>
      </div>

      <NFormItem label="专注时长 (分钟)">
        <NInputNumber v-model:value="customWorkTime" :min="1" :max="120" />
        <span class="form-tip">（建议设置在15-60分钟之间）</span>
      </NFormItem>

      <NFormItem label="短休息时长 (分钟)">
        <NInputNumber v-model:value="customShortBreakTime" :min="1" :max="30" />
        <span class="form-tip">（建议设置在3-10分钟之间）</span>
      </NFormItem>

      <NFormItem label="长休息时长 (分钟)">
        <NInputNumber v-model:value="customLongBreakTime" :min="5" :max="60" />
        <span class="form-tip">（每4个专注周期后的休息时间）</span>
      </NFormItem>

      <NDivider />

      <NFormItem label="预计需要的专注次数">
        <NInputNumber v-model:value="newTodoPomodoros" :min="1" :max="10" />
        <span class="form-tip">（每次 = {{ customWorkTime }}分钟专注时间）</span>
      </NFormItem>

      <NFormItem>
        <NSpace vertical>
          <div class="pomodoro-calculation">
            <span>总计专注时间：<span class="total-time">{{ newTodoPomodoros * customWorkTime }}</span> 分钟</span>
          </div>
        </NSpace>
      </NFormItem>

      <NFormItem label="自动完成设置">
        <NSwitch v-model:value="newTodoUseTargetTime" />
        <span class="form-tip">（达到目标专注时间后自动完成任务）</span>
      </NFormItem>

      <div style="display: flex; justify-content: flex-end;">
        <NSpace>
          <NButton @click="showCustomSettingsModal = false">
            取消
          </NButton>
          <NButton type="primary" :disabled="!newTodoText.trim()" @click="addTodoWithSettings">
            确认添加
          </NButton>
        </NSpace>
      </div>
    </NForm>
  </NModal>
</template>

<style scoped>
.todo-list {
  height: 100%;
  padding: 1rem;
}

.todo-card {
  height: 100%;
  border-radius: 12px;
  background-color: var(--card-bg-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.todo-header h2 {
  font-size: 1.5rem;
  color: #333;
  transition: color var(--transition-time) ease;
}

.todo-stats {
  font-size: 14px;
  transition: color var(--transition-time) ease;
}

.todo-input-row {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-todo {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  flex-grow: 1;
  font-size: 0.95rem;
  transition: all var(--transition-time) ease;
}

.search-btn {
  transition: all 0.3s ease;
  background-color: #2196f3;
  color: white;
  flex-shrink: 0;
}

.search-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background-color: #1976d2;
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-todo {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.todo-input {
  flex-grow: 1;
  font-size: 1rem;
  transition: all var(--transition-time) ease;
}

.add-btn {
  transition: all 0.3s ease;
  background-color: #4caf50;
  color: white;
  flex-shrink: 0;
}

.add-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background-color: #45a049;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.todo-items {
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 4px;
}

.todo-info {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-tag {
  align-self: flex-start;
  font-size: 0.85rem;
  transition: all 0.3s ease;
}

.pomodoro-info {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.95rem;
  color: #333;
  align-items: center;
}

.pomodoro-count {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.05rem;
  background-color: rgba(255, 99, 71, 0.08);
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 99, 71, 0.2);
}

.mode-icon {
  font-size: 1.6rem;
}

.mode-tag {
  font-size: 0.8rem;
  padding: 2px 6px;
}

.tomato-icon {
  font-size: 1.6rem;
}

.tomato-progress {
  display: flex;
  align-items: center;
  gap: 2px;
}

.completed {
  color: #ff6347;
}

.separator {
  margin: 0 2px;
}

.total {
  color: #555;
}

.focus-time,
.target-time {
  color: #555;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 4px 10px;
  border-radius: 6px;
}

.focus-time strong,
.target-time strong {
  color: #333;
}

.todo-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.timer-btn,
.settings-btn,
.delete-btn,
.edit-btn {
  opacity: 0.8;
  transition: all 0.3s ease;
}

.timer-btn:hover,
.settings-btn:hover,
.delete-btn:hover,
.edit-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.todo-footer {
  display: flex;
  justify-content: flex-end;
}

.todo-items::-webkit-scrollbar {
  width: 6px;
}

.todo-items::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.todo-items::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.todo-items::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 时间线相关样式 */
.compact-timeline {
  margin-top: 12px;
}

.todo-timeline-item {
  padding: 12px 16px;
  margin-bottom: 10px;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background-color: rgb(251, 251, 251);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.todo-timeline-item:hover {
  background-color: rgb(250, 250, 250);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.todo-timeline-item :deep(.n-timeline-item-content) {
  min-height: auto;
  margin-top: -2px;
}

.todo-timeline-item :deep(.n-timeline-item-content-title) {
  font-size: 15px;
  line-height: 1.4;
  margin-bottom: 10px;
  font-weight: 500;
  color: #333;
}

.completed-timeline-item {
  background-color: rgba(76, 175, 80, 0.05);
}

.completed-timeline-item :deep(.n-timeline-item-content-title) {
  text-decoration: line-through;
  color: #4caf50;
}

.pomodoro-info-box {
  background-color: rgba(255, 99, 71, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 99, 71, 0.3);
  box-shadow: 0 2px 8px rgba(255, 99, 71, 0.1);
}

.pomodoro-info-box h3 {
  margin-top: 0;
  color: #ff6347;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tomato-emoji {
  font-size: 1.6rem;
}

.pomodoro-info-box p {
  font-size: 1.05rem;
  margin-bottom: 8px;
  color: #444;
}

.pomodoro-info-box ul {
  padding-left: 20px;
  font-size: 1.05rem;
  margin-bottom: 0;
}

.pomodoro-info-box li {
  margin-bottom: 8px;
  line-height: 1.4;
}

.highlight {
  font-weight: 600;
  color: #ff6347;
}

.pomodoro-calculation {
  font-weight: bold;
  color: #444;
  margin-top: 8px;
  font-size: 1.1rem;
  background-color: rgba(255, 99, 71, 0.05);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
}

.total-time {
  color: #ff6347;
  font-size: 1.2rem;
}

.form-tip {
  font-size: 0.9rem;
  color: #666;
  margin-left: 8px;
}

.completed-timestamp {
  margin-top: 6px;
  margin-bottom: 8px;
}

.completed-timestamp :deep(.n-tag) {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 4px 10px;
  background-color: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

/* 创建时间标签样式 */
.creation-timestamp {
  margin-top: 6px;
  margin-bottom: 8px;
}

.creation-timestamp :deep(.n-tag) {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 4px 10px;
  background-color: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.2);
}

/* 对创建时间和完成时间的时间戳格式添加样式 */
:deep(.n-tag .n-tag__content) {
  display: inline-block;
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.custom-info-box {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 4px solid #18a058;
}

.custom-info-box h3 {
  margin-top: 0;
  color: #18a058;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timer-emoji {
  font-size: 1.2em;
}

.pomodoro-mode-btn {
  position: relative;
  overflow: visible;
}

.pomodoro-mode-btn::after {
  content: '🍅';
  position: absolute;
  font-size: 10px;
  bottom: -3px;
  right: -3px;
  background: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid #ff6347;
}

.custom-mode-btn {
  position: relative;
  overflow: visible;
}

.custom-mode-btn::after {
  content: '⏱️';
  position: absolute;
  font-size: 10px;
  bottom: -3px;
  right: -3px;
  background: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid #18a058;
}

/* 标签页样式 */
.todo-tabs {
  margin-top: 12px;
}

.tab-count {
  transition: all 0.3s ease;
  margin-left: 5px;
  transform: scale(1);
}

.tab-count:hover {
  transform: scale(1.1);
}

/* 进行中的标签特殊动画 */
.n-tabs-tab.n-tabs-tab--active[data-name='inProgress'] .tab-count {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 暗色模式下的待办项样式优化 */
:root[data-theme='dark'] .todo-timeline-item {
  color: var(--text-dark);
  background-color: rgba(30, 38, 52, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:root[data-theme='dark'] .todo-timeline-item:hover {
  background-color: rgba(35, 42, 55, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

:root[data-theme='dark'] .todo-timeline-item :deep(.n-timeline-item-content-title) {
  color: var(--text-dark);
}

:root[data-theme='dark'] .completed-timeline-item {
  background-color: rgba(76, 175, 80, 0.15);
}

:root[data-theme='dark'] .completed-timeline-item :deep(.n-timeline-item-content-title) {
  color: #5dbe63;
}

:root[data-theme='dark'] .todo-summary {
  background-color: rgba(35, 42, 55, 0.6);
  border-radius: 8px;
  padding: 8px 12px;
  margin: -4px -8px 4px -8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: var(--shadow-dark);
  transition: all 0.3s ease;
}

:root[data-theme='dark'] .todo-summary:hover {
  background-color: rgba(40, 48, 60, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:root[data-theme='dark'] .todo-detail {
  background-color: rgba(28, 35, 45, 0.7);
  border-radius: 8px;
  padding: 12px;
  margin: 4px -8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* 时间线项样式优化 */
:root[data-theme='dark'] .n-timeline .n-timeline-item-content {
  color: #bbb;
}

:root[data-theme='dark'] .n-timeline .n-timeline-item-line {
  border-color: rgba(255, 255, 255, 0.15);
}

:root[data-theme='dark'] .timeline-icon {
  background-color: rgba(40, 48, 60, 0.8) !important;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

:root[data-theme='dark'] .timeline-icon.completed {
  background-color: var(--primary-dark) !important;
  box-shadow: 0 0 10px rgba(255, 99, 71, 0.5);
}

:root[data-theme='dark'] .n-timeline-item-line {
  border-color: rgba(255, 255, 255, 0.15);
}

/* 标签样式优化 */
:root[data-theme='dark']
  .n-tag:not(.n-tag--primary-type):not(.n-tag--info-type):not(.n-tag--success-type):not(.n-tag--warning-type):not(
    .n-tag--error-type
  ) {
  background-color: rgba(40, 48, 60, 0.8);
  color: var(--text-dark);
}

:root[data-theme='dark'] .n-tag--error-type {
  background-color: rgba(255, 99, 71, 0.25) !important;
  border: 1px solid rgba(255, 99, 71, 0.3) !important;
}

:root[data-theme='dark'] .n-tag--success-type {
  background-color: rgba(76, 175, 80, 0.25) !important;
  border: 1px solid rgba(76, 175, 80, 0.3) !important;
}

:root[data-theme='dark'] .n-tag--info-type {
  background-color: rgba(64, 158, 255, 0.25) !important;
  border: 1px solid rgba(64, 158, 255, 0.3) !important;
}

:root[data-theme='dark'] .n-tag--warning-type {
  background-color: rgba(255, 152, 0, 0.25) !important;
  border: 1px solid rgba(255, 152, 0, 0.3) !important;
}

/* 待办项信息样式 */
:root[data-theme='dark'] .focus-time,
:root[data-theme='dark'] .target-time {
  color: #aaa;
  background-color: rgba(255, 255, 255, 0.08);
}

:root[data-theme='dark'] .focus-time strong,
:root[data-theme='dark'] .target-time strong {
  color: #ddd;
}

:root[data-theme='dark'] .timestamp-tag {
  opacity: 0.8;
}

/* 模态框样式优化 */
:root[data-theme='dark'] .n-modal {
  background-color: rgba(25, 30, 40, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

:root[data-theme='dark'] .n-modal-header,
:root[data-theme='dark'] .n-modal-footer {
  border-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme='dark'] .n-card-header,
:root[data-theme='dark'] .n-drawer-header,
:root[data-theme='dark'] .n-popover-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

:root[data-theme='dark'] .n-form-item-label {
  color: #ccc;
}

:root[data-theme='dark'] .form-tip {
  color: #999;
}

/* 标签页样式 */
:root[data-theme='dark'] .n-tabs-tab {
  color: #aaa;
}

:root[data-theme='dark'] .n-tabs-tab:hover {
  color: #fff;
}

:root[data-theme='dark'] .n-tabs-tab.n-tabs-tab--active {
  color: var(--primary-dark);
}

:root[data-theme='dark'] .n-tabs-nav__bar {
  background-color: var(--primary-dark) !important;
}

/* 定制UI元素的悬浮效果 */
:root[data-theme='dark'] .n-button:not(.n-button--disabled):hover,
:root[data-theme='dark'] .timer-btn-compact:not(.n-button--disabled):hover,
:root[data-theme='dark'] .edit-btn:not(.n-button--disabled):hover,
:root[data-theme='dark'] .delete-btn:not(.n-button--disabled):hover {
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
}

:root[data-theme='dark'] .timer-btn-compact[type='primary'] {
  box-shadow: 0 0 10px rgba(24, 160, 88, 0.4);
}

:root[data-theme='dark'] .timer-btn-compact[type='primary']:hover {
  box-shadow: 0 0 15px rgba(24, 160, 88, 0.6);
}

/* 信息卡片样式 */
:root[data-theme='dark'] .pomodoro-info-box,
:root[data-theme='dark'] .custom-info-box {
  background-color: rgba(35, 42, 55, 0.7);
  box-shadow: var(--shadow-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #ccc;
}

:root[data-theme='dark'] .pomodoro-info-box h3,
:root[data-theme='dark'] .custom-info-box h3 {
  color: var(--primary-dark);
}

:root[data-theme='dark'] .highlight {
  color: #ddd;
}

/* 番茄数量样式 */
:root[data-theme='dark'] .pomodoro-count,
:root[data-theme='dark'] .pomodoro-count-compact {
  background-color: rgba(255, 99, 71, 0.15);
  border: 1px solid rgba(255, 99, 71, 0.25);
}

:root[data-theme='dark'] .pomodoro-calculation .total-time {
  color: var(--primary-dark);
}

:root[data-theme='dark'] .custom-mode-btn::after,
:root[data-theme='dark'] .pomodoro-mode-btn::after {
  background-color: rgba(30, 38, 52, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
}

:root[data-theme='dark'] .pomodoro-info {
  color: #aaa;
}

:root[data-theme='dark'] .pomodoro-calculation {
  background-color: rgba(255, 99, 71, 0.1);
  color: #bbb;
}

.todo-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.todo-count {
  height: 22px;
  line-height: 22px;
}

/* 强化状态标签的视觉效果 */
.status-tag {
  font-weight: 500;
  font-size: 11px;
  padding: 0 8px;
  height: 22px;
  line-height: 22px;
}

/* 添加开始按钮的紧凑模式样式 */
.timer-btn-compact {
  font-size: 12px;
  height: 28px;
  width: 28px;
  margin-left: 4px;
  opacity: 0.9;
  transition: all 0.3s ease;
  background-color: #f2f2f2;
  border: 1px solid #e0e0e0;
}

.timer-btn-compact:hover {
  opacity: 1;
  transform: scale(1.08);
  background-color: #4caf50;
  color: white;
}

/* 当前正在进行的任务按钮高亮 */
.timer-btn-compact[type='primary'] {
  background-color: #18a058;
  color: white;
  border: 1px solid #18a058;
  box-shadow: 0 2px 6px rgba(24, 160, 88, 0.2);
}

.todo-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 36px;
  /* 增加最小高度 */
}

.todo-detail {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.expand-btn {
  margin-left: auto;
  font-size: 12px;
  display: flex;
  align-items: center;
  color: #888;
}

.expand-btn:hover {
  color: #333;
}

.pomodoro-count-compact {
  display: flex;
  align-items: center;
  position: relative;
  background-color: rgba(240, 240, 240, 0.5);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #eee;
  transition: all 0.3s ease;
  overflow: hidden;
}

:root[data-theme='dark'] .pomodoro-count-compact {
  background-color: rgba(70, 70, 70, 0.3);
  border-color: #444;
}

.tomato-progress {
  display: flex;
  align-items: center;
  color: #555;
  font-size: 0.9rem;
  font-weight: 600;
  margin-left: 4px;
}

:root[data-theme='dark'] .tomato-progress {
  color: #ddd;
}

.completed-count {
  transition: all 0.3s ease;
  padding: 0 2px;
}

.highlight-count {
  color: #ff6347;
  font-weight: bold;
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.progress-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: #ff6347;
  transition: width 0.5s ease-out;
  z-index: 0;
}

:root[data-theme='dark'] .progress-indicator {
  background-color: #ff8c7a;
  box-shadow: 0 0 5px rgba(255, 99, 71, 0.5);
}

.mode-icon {
  font-size: 1rem;
  margin-right: 2px;
}

/* 添加更多样式 */
.todo-item {
  transition: all 0.2s ease;
}

.todo-item:hover .pomodoro-count-compact {
  background-color: rgba(255, 240, 235, 0.6);
  border-color: #ffded5;
}

:root[data-theme='dark'] .todo-item:hover .pomodoro-count-compact {
  background-color: rgba(90, 80, 75, 0.4);
  border-color: #555;
}

.timestamps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.timestamp-tag {
  font-size: 12px !important;
}

/* 添加到现有样式底部 */
.n-radio-group :deep(.n-radio) {
  margin-right: 16px;
  transition: all 0.3s ease;
}

.n-radio-group :deep(.n-radio-input:checked + .n-radio__label) {
  font-weight: bold;
}

.n-radio-group :deep(.n-radio:has(.n-radio-input:checked) .n-radio__dot) {
  box-shadow: 0 0 5px rgba(24, 160, 88, 0.5);
}

.mode-icon {
  font-size: 1.6rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  margin-right: 4px;
  transition: all 0.3s ease;
}

.n-radio-group :deep(.n-radio-input:checked + .n-radio__label .mode-icon) {
  transform: scale(1.2);
}

/* 专注模式切换样式 */
.n-radio-group {
  margin-bottom: 16px;
  padding: 8px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.02);
}

.n-radio-group :deep(.n-radio) {
  margin-right: 16px;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.n-radio-group :deep(.n-radio:has(.n-radio-input:checked)) {
  background-color: rgba(24, 160, 88, 0.1);
  box-shadow: 0 0 5px rgba(24, 160, 88, 0.2);
}

.n-radio-group :deep(.n-radio-input:checked + .n-radio__label) {
  font-weight: bold;
}

.mode-icon {
  font-size: 1.6rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  margin-right: 4px;
  transition: all 0.3s ease;
}

.n-radio-group :deep(.n-radio-input:checked + .n-radio__label .mode-icon) {
  transform: scale(1.2);
}

/* 模式介绍框样式 */
.pomodoro-info-box,
.custom-info-box {
  margin: 12px 0;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.pomodoro-info-box {
  background-color: rgba(255, 99, 71, 0.08);
  border: 1px solid rgba(255, 99, 71, 0.2);
}

.custom-info-box {
  background-color: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.tomato-emoji,
.timer-emoji {
  font-size: 1.6rem;
  vertical-align: middle;
}

.highlight {
  font-weight: bold;
  color: #ff6347;
}

/* 设置项样式 */
.form-tip {
  margin-left: 8px;
  font-size: 0.85rem;
  color: #888;
}

.n-form-item {
  margin-bottom: 16px;
}

/* 已完成的待办事项样式 */
.completed-todo {
  position: relative;
  opacity: 0.85;
  transition: all 0.3s ease;
}

/* 添加已完成任务的横线划去效果 */
.completed-todo .todo-summary {
  position: relative;
}

.completed-todo .todo-summary::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #52c41a; /* 使用成功绿色 */
  z-index: 1;
  transform: scaleX(0);
  animation: strikethrough 0.5s ease-out forwards;
}

@keyframes strikethrough {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* 增强已完成的时间线项目样式 */
.completed-timeline-item {
  transition: all 0.3s ease;
}

/* 自定义已完成状态下的时间线图标 */
.timeline-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.timeline-icon.completed {
  background-color: #52c41a;
  color: white;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
  animation: pop 0.5s ease-out;
}

@keyframes pop {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 已完成待办事项卡片样式 */
.todo-timeline-item.completed-timeline-item {
  background-color: rgba(82, 196, 26, 0.05);
  border-radius: 8px;
  padding: 5px;
  border-left: 3px solid #52c41a;
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 待办事项完成时的动画 */
.todo-item {
  transition: all 0.5s ease-out;
}

.completed-todo {
  animation: completeTask 0.8s ease forwards;
}

@keyframes completeTask {
  0% {
    background-color: transparent;
  }
  30% {
    background-color: rgba(82, 196, 26, 0.2);
  }
  100% {
    background-color: rgba(82, 196, 26, 0.05);
  }
}

/* 待办项文本内容 */
.todo-summary {
  position: relative;
  padding: 10px 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

:root[data-theme='dark'] .todo-summary {
  background-color: rgba(40, 44, 52, 0.2);
}

/* 自动完成的待办项标记 */
.auto-completed-tag {
  position: absolute;
  right: 10px;
  top: -8px;
  transform: rotate(5deg);
  z-index: 2;
  animation: popIn 0.5s ease forwards;
}

@keyframes popIn {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.2) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(5deg);
    opacity: 1;
  }
}
</style>
