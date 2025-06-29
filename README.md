# 图片处理 API

基于 Hono 框架构建的高性能图片处理服务，支持多种图片处理功能，包括缩放、裁剪、格式转换、滤镜效果等。

## 特性

- 🚀 基于 Hono 框架，性能优异
- 🖼️ 支持多种图片格式 (JPEG, PNG, WebP, AVIF, GIF, BMP)
- ⚡ 使用 Sharp 库进行高效图片处理
- 🔧 丰富的图片处理功能
- 📦 支持批量处理
- 🛡️ 完善的错误处理和验证
- 🌐 CORS 支持
- 📝 详细的 API 文档

## 技术栈

- **框架**: Hono
- **图片处理**: Sharp
- **验证**: Zod
- **包管理**: pnpm
- **部署**: Cloudflare Workers

## 安装和运行

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 部署到 Cloudflare Workers

```bash
pnpm deploy
```

## API 文档

### 基础信息

- **基础URL**: `http://localhost:8787` (开发环境)
- **Content-Type**: `multipart/form-data` (文件上传)
- **图片字段名**: `image`

### 端点列表

#### 1. 综合图片处理

**POST** `/api/images/process`

支持多种图片处理操作的综合接口。

**请求参数**:
- `image` (file): 图片文件
- 处理选项 (JSON):

```json
{
  "width": 800,           // 宽度 (1-4000)
  "height": 600,          // 高度 (1-4000)
  "quality": 80,          // 质量 (1-100)
  "format": "webp",       // 格式: jpeg, png, webp, avif
  "fit": "cover",         // 适应方式: cover, contain, fill, inside, outside
  "blur": 1.5,            // 模糊程度 (0.3-1000)
  "sharpen": true,        // 锐化
  "grayscale": false,     // 灰度
  "rotate": 90,           // 旋转角度 (-360 to 360)
  "brightness": 1.2,      // 亮度 (0.1-3)
  "contrast": 1.1,        // 对比度 (0.1-3)
  "saturation": 1.3,      // 饱和度 (0-3)
  "crop": {               // 裁剪
    "left": 100,
    "top": 100,
    "width": 400,
    "height": 300
  }
}
```

**响应**: 处理后的图片文件

#### 2. 获取图片信息

**POST** `/api/images/info`

获取图片的详细信息。

**请求参数**:
- `image` (file): 图片文件

**响应**:
```json
{
  "success": true,
  "data": {
    "original": {
      "name": "example.jpg",
      "type": "image/jpeg",
      "size": 1024000
    },
    "image": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg",
      "size": 1024000,
      "channels": 3,
      "hasAlpha": false
    }
  }
}
```

#### 3. 调整图片大小

**POST** `/api/images/resize`

调整图片尺寸。

**请求参数**:
- `image` (file): 图片文件
- 选项 (JSON):

```json
{
  "width": 800,
  "height": 600,
  "fit": "cover"
}
```

#### 4. 裁剪图片

**POST** `/api/images/crop`

裁剪图片指定区域。

**请求参数**:
- `image` (file): 图片文件
- 选项 (JSON):

```json
{
  "left": 100,
  "top": 100,
  "width": 400,
  "height": 300
}
```

#### 5. 转换图片格式

**POST** `/api/images/convert/:format`

转换图片格式。

**路径参数**:
- `format`: 目标格式 (jpeg, png, webp, avif)

**查询参数**:
- `quality`: 质量 (1-100, 默认 80)

**请求参数**:
- `image` (file): 图片文件

#### 6. 应用滤镜效果

**POST** `/api/images/filter/:type`

应用各种滤镜效果。

**路径参数**:
- `type`: 滤镜类型
  - `grayscale`: 灰度
  - `blur`: 模糊
  - `sharpen`: 锐化

**查询参数** (blur 滤镜):
- `sigma`: 模糊程度 (默认 1)

**请求参数**:
- `image` (file): 图片文件

#### 7. 批量处理

**POST** `/api/images/batch`

批量处理多张图片。

**请求参数**:
- `image` (files): 多个图片文件
- 处理选项 (JSON): 同综合处理接口

**响应**:
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "originalName": "image1.jpg",
      "success": true,
      "size": 45678,
      "data": "base64_encoded_image_data"
    }
  ]
}
```

## 使用示例

### cURL 示例

#### 基础图片处理

```bash
curl -X POST http://localhost:8787/api/images/process \
  -F "image=@example.jpg" \
  -F "options={\"width\":800,\"height\":600,\"format\":\"webp\",\"quality\":80}"
```

#### 获取图片信息

```bash
curl -X POST http://localhost:8787/api/images/info \
  -F "image=@example.jpg"
```

#### 调整大小

```bash
curl -X POST http://localhost:8787/api/images/resize \
  -F "image=@example.jpg" \
  -F "options={\"width\":400,\"height\":300,\"fit\":\"cover\"}"
```

#### 格式转换

```bash
curl -X POST http://localhost:8787/api/images/convert/webp?quality=90 \
  -F "image=@example.jpg"
```

#### 应用滤镜

```bash
# 灰度滤镜
curl -X POST http://localhost:8787/api/images/filter/grayscale \
  -F "image=@example.jpg"

# 模糊滤镜
curl -X POST http://localhost:8787/api/images/filter/blur?sigma=2 \
  -F "image=@example.jpg"
```

### JavaScript 示例

```javascript
// 使用 FormData 上传和处理图片
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const options = {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80
};

formData.append('options', JSON.stringify(options));

const response = await fetch('/api/images/process', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);
  // 使用处理后的图片
}
```

### Python 示例

```python
import requests

# 处理图片
with open('example.jpg', 'rb') as f:
    files = {'image': f}
    data = {
        'options': '{"width":800,"height":600,"format":"webp","quality":80}'
    }

    response = requests.post(
        'http://localhost:8787/api/images/process',
        files=files,
        data=data
    )

    if response.status_code == 200:
        with open('processed.webp', 'wb') as output:
            output.write(response.content)
```

## 错误处理

API 使用标准的 HTTP 状态码：

- `200`: 成功
- `400`: 请求参数错误
- `404`: 接口不存在
- `500`: 服务器内部错误

错误响应格式：

```json
{
  "error": "错误描述",
  "details": "详细错误信息"
}
```

## 限制

- 最大文件大小: 10MB
- 支持的图片格式: JPEG, PNG, GIF, WebP, AVIF, BMP
- 最大图片尺寸: 4000x4000
- 批量处理最大文件数: 5

## 许可证

MIT License
