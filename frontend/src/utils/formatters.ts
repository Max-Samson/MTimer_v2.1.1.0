/**
 * 格式化分钟数为更易读的时间格式
 * @param minutes 分钟数
 * @returns 格式化后的时间字符串，如"2小时30分钟"或"45分钟"
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0)
    return '0分钟'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return hours > 0
    ? `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`
    : `${mins}分钟`
}

/**
 * 格式化日期为月/日格式
 * @param dateStr 日期字符串，格式为"YYYY-MM-DD"
 * @returns 格式化后的日期字符串，如"3月15日"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr)
    return ''

  const date = new Date(dateStr)
  if (isNaN(date.getTime()))
    return '无效日期'

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 格式化日期为月/日简短格式
 * @param dateStr 日期字符串，格式为"YYYY-MM-DD"
 * @returns 格式化后的日期字符串，如"3/15"
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr)
    return ''

  const dateParts = dateStr.split('-')
  if (dateParts.length >= 3) {
    return `${Number.parseInt(dateParts[1])}/${Number.parseInt(dateParts[2])}`
  }
  return dateStr.substring(5).replace('-', '/')
}
