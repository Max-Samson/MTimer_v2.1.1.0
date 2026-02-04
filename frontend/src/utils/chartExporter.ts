/**
 * 图表导出工具类
 * 用于将多个 ECharts 图表导出为单张图片
 */
import * as echarts from 'echarts/core'
import { SaveImageFile } from '../../wailsjs/go/main/App'

/**
 * 单个图表的导出配置
 */
export interface ChartExportConfig {
  /** 图表容器的 DOM 元素引用 */
  chartRef: HTMLElement | null
  /** 图表标题（可选） */
  title?: string
  /** 图表宽度（默认使用画布宽度减去边距） */
  width?: number
  /** 图表高度（默认 300px） */
  height?: number
  /** 是否跳过此图表（当图表未初始化或无数据时） */
  skip?: boolean
}

/**
 * 导出选项配置
 */
export interface ExportOptions {
  /** 要导出的图表配置数组 */
  charts: ChartExportConfig[]
  /** 导出文件名（默认：统计报告.png） */
  filename?: string
  /** 画布背景色（默认：#ffffff） */
  backgroundColor?: string
  /** 画布内边距（默认：60px） */
  padding?: number
  /** 标题字体大小（默认：24px） */
  titleFontSize?: number
  /** 画布宽度（默认：1600px，适合高分辨率显示） */
  canvasWidth?: number
  /** 图表导出的像素比率（默认：2，用于高清显示） */
  pixelRatio?: number
  /** 是否添加时间戳水印（默认：true） */
  addWatermark?: boolean
  /** 主标题（显示在最顶部） */
  mainTitle?: string
  /** 主标题字体大小（默认：36px） */
  mainTitleFontSize?: number
}

/**
 * 图表导出器类
 */
export class ChartExporter {
  /**
   * 导出多个图表为一张图片
   * @param options 导出选项配置
   * @returns Promise<void>
   */
  static async exportMultipleCharts(options: ExportOptions): Promise<void> {
    const {
      charts,
      filename = '统计报告.png',
      backgroundColor = '#ffffff',
      padding = 60,
      titleFontSize = 24,
      canvasWidth = 1600,
      pixelRatio = 2,
      addWatermark = true,
      mainTitle = '专注统计报告',
      mainTitleFontSize = 36,
    } = options

    // 过滤掉需要跳过的图表
    const validCharts = charts.filter(chart => !chart.skip && chart.chartRef)

    if (validCharts.length === 0) {
      throw new Error('没有可导出的图表')
    }

    // 计算画布总高度
    let totalHeight = padding * 2 // 上下边距

    // 主标题高度（增加更多空间）
    if (mainTitle) {
      totalHeight += mainTitleFontSize + padding * 1.5
    }

    // 为每个图表预留空间（优化高度计算）
    validCharts.forEach((chart) => {
      if (chart.title) {
        totalHeight += titleFontSize + 30 // 标题高度 + 更大间距
      }
      // 使用更合理的默认高度，保持 16:9 的宽高比
      const defaultHeight = Math.round((canvasWidth - padding * 2) * 0.5) // 约为宽度的一半
      totalHeight += (chart.height || defaultHeight) + padding * 0.8
    })

    // 水印高度
    if (addWatermark) {
      totalHeight += 40
    }

    // 创建最终画布
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvasWidth * pixelRatio
    finalCanvas.height = totalHeight * pixelRatio
    finalCanvas.style.width = `${canvasWidth}px`
    finalCanvas.style.height = `${totalHeight}px`

    const ctx = finalCanvas.getContext('2d')!
    // 缩放上下文以支持高 DPI
    ctx.scale(pixelRatio, pixelRatio)

    // 设置背景
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvasWidth, totalHeight)

    let yOffset = padding

    // 绘制主标题（使用更好的字体渲染）
    if (mainTitle) {
      ctx.font = `bold ${mainTitleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif`
      ctx.fillStyle = '#1a1a1a'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      // 添加文字阴影，增强可读性
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 1
      
      ctx.fillText(mainTitle, canvasWidth / 2, yOffset)
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      yOffset += mainTitleFontSize + padding * 1.5
    }

    // 依次绘制每个图表
    for (const chartConfig of validCharts) {
      // 绘制图表标题
      if (chartConfig.title) {
        ctx.font = `600 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif`
        ctx.fillStyle = '#2c3e50'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(chartConfig.title, padding, yOffset)
        yOffset += titleFontSize + 30
      }

      // 获取图表实例并导出
      if (chartConfig.chartRef) {
        const chartInstance = echarts.getInstanceByDom(chartConfig.chartRef)
        
        if (chartInstance) {
          // 计算合理的图表尺寸
          const chartWidth = chartConfig.width || (canvasWidth - padding * 2)
          const defaultHeight = Math.round(chartWidth * 0.5) // 保持 2:1 的宽高比
          const chartHeight = chartConfig.height || defaultHeight

          // 导出图表为 DataURL（使用更高的像素比率）
          const chartDataURL = chartInstance.getDataURL({
            type: 'png',
            pixelRatio: pixelRatio * 1.5, // 提高图表清晰度
            backgroundColor: '#ffffff',
          })

          // 加载图片并绘制到画布
          const img = await this.loadImage(chartDataURL)

          // 使用更好的图像平滑算法
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // 绘制图表
          ctx.drawImage(img, padding, yOffset, chartWidth, chartHeight)
          yOffset += chartHeight + padding * 0.8
        }
      }
    }

    // 添加水印（使用更大更清晰的字体）
    if (addWatermark) {
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      ctx.fillText(`生成时间: ${timestamp}`, canvasWidth - padding, totalHeight - 20)
    }

    // 使用 Wails 原生文件保存对话框
    const dataURL = finalCanvas.toDataURL('image/png', 1.0)
    const savedPath = await SaveImageFile(dataURL, filename)
    
    if (!savedPath) {
      throw new Error('用户取消了保存操作')
    }
  }

  /**
   * 加载图片
   * @param url 图片 URL
   * @returns Promise<HTMLImageElement>
   */
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = url
    })
  }

  /**
   * 导出单个图表
   * @param chartRef 图表容器 DOM 元素
   * @param filename 文件名
   * @param pixelRatio 像素比率
   */
  static async exportSingleChart(
    chartRef: HTMLElement | null,
    filename: string = '图表.png',
    pixelRatio: number = 2,
  ): Promise<void> {
    if (!chartRef) {
      throw new Error('图表容器不存在')
    }

    const chartInstance = echarts.getInstanceByDom(chartRef)
    if (!chartInstance) {
      throw new Error('图表实例未找到')
    }

    const chartDataURL = chartInstance.getDataURL({
      type: 'png',
      pixelRatio,
      backgroundColor: '#ffffff',
    })

    // 使用 Wails 原生文件保存对话框
    const savedPath = await SaveImageFile(chartDataURL, filename)
    
    if (!savedPath) {
      throw new Error('用户取消了保存操作')
    }
  }
}

/**
 * 导出工具的便捷函数
 */
export const exportCharts = ChartExporter.exportMultipleCharts.bind(ChartExporter)
export const exportChart = ChartExporter.exportSingleChart.bind(ChartExporter)
