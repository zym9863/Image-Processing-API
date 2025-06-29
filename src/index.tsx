import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { renderer } from './renderer'
import images from './routes/images'

const app = new Hono()

// 中间件
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('*', logger())
app.use('*', prettyJSON())
app.use(renderer)

// 路由
app.route('/api/images', images)

// 首页 - API文档
app.get('/', (c) => {
  return c.render(
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1>图片处理 API</h1>
      <p>基于 Hono 框架的图片处理服务</p>

      <h2>API 端点</h2>
      <ul>
        <li><strong>POST /api/images/process</strong> - 综合图片处理</li>
        <li><strong>POST /api/images/info</strong> - 获取图片信息</li>
        <li><strong>POST /api/images/resize</strong> - 调整图片大小</li>
        <li><strong>POST /api/images/crop</strong> - 裁剪图片</li>
        <li><strong>POST /api/images/convert/:format</strong> - 转换图片格式</li>
        <li><strong>POST /api/images/filter/:type</strong> - 应用滤镜效果</li>
        <li><strong>POST /api/images/batch</strong> - 批量处理图片</li>
      </ul>

      <h2>支持的功能</h2>
      <ul>
        <li>图片缩放和调整大小</li>
        <li>图片裁剪</li>
        <li>格式转换 (JPEG, PNG, WebP, AVIF)</li>
        <li>滤镜效果 (灰度, 模糊, 锐化)</li>
        <li>颜色调整 (亮度, 对比度, 饱和度)</li>
        <li>图片旋转</li>
        <li>批量处理</li>
      </ul>

      <h2>使用方法</h2>
      <p>所有API都使用 multipart/form-data 格式上传图片文件，字段名为 'image'。</p>
      <p>处理参数通过 JSON 格式在请求体中传递。</p>

      <h3>示例</h3>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
{`curl -X POST http://localhost:8787/api/images/process \\
  -F "image=@example.jpg" \\
  -F "options={\\"width\\":800,\\"height\\":600,\\"format\\":\\"webp\\",\\"quality\\":80}"`}
      </pre>
    </div>
  )
})

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Image Processing API'
  })
})

// 404 处理
app.notFound((c) => {
  return c.json({ error: '接口不存在' }, 404)
})

// 错误处理
app.onError((err, c) => {
  console.error('服务器错误:', err)
  return c.json({ error: '服务器内部错误' }, 500)
})

export default app
