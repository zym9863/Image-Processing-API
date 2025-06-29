[简体中文](README.md) | [English](README_EN.md)

# Image Processing API

A high-performance image processing service built with the Hono framework, supporting various image processing features such as resizing, cropping, format conversion, filter effects, and more.

## Features

- 🚀 Built on Hono framework for excellent performance
- 🖼️ Supports multiple image formats (JPEG, PNG, WebP, AVIF, GIF, BMP)
- ⚡ Efficient image processing using Sharp library
- 🔧 Rich image processing functions
- 📦 Batch processing support
- 🛡️ Robust error handling and validation
- 🌐 CORS support
- 📝 Detailed API documentation

## Tech Stack

- **Framework**: Hono
- **Image Processing**: Sharp
- **Validation**: Zod
- **Package Manager**: pnpm
- **Deployment**: Cloudflare Workers

## Installation & Run

### Install dependencies

```bash
pnpm install
```

### Development mode

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Deploy to Cloudflare Workers

```bash
pnpm deploy
```

## API Documentation

### Basic Info

- **Base URL**: `http://localhost:5173` (development)
- **Content-Type**: `multipart/form-data` (file upload)
- **Image field name**: `image`

### Endpoints

#### 1. General Image Processing

**POST** `/api/images/process`

A comprehensive endpoint supporting multiple image processing operations.

**Request Parameters**:
- `image` (file): Image file
- Processing options (JSON):

```json
{
  "width": 800,           // Width (1-4000)
  "height": 600,          // Height (1-4000)
  "quality": 80,          // Quality (1-100)
  "format": "webp",       // Format: jpeg, png, webp, avif
  "fit": "cover",         // Fit: cover, contain, fill, inside, outside
  "blur": 1.5,            // Blur (0.3-1000)
  "sharpen": true,        // Sharpen
  "grayscale": false,     // Grayscale
  "rotate": 90,           // Rotation (-360 to 360)
  "brightness": 1.2,      // Brightness (0.1-3)
  "contrast": 1.1,        // Contrast (0.1-3)
  "saturation": 1.3,      // Saturation (0-3)
  "crop": {               // Crop
    "left": 100,
    "top": 100,
    "width": 400,
    "height": 300
  }
}
```

**Response**: Processed image file

#### 2. Get Image Info

**POST** `/api/images/info`

Get detailed information about an image.

**Request Parameters**:
- `image` (file): Image file

**Response**:
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

#### 3. Resize Image

**POST** `/api/images/resize`

Resize an image.

**Request Parameters**:
- `image` (file): Image file
- Options (JSON):

```json
{
  "width": 800,
  "height": 600,
  "fit": "cover"
}
```

#### 4. Crop Image

**POST** `/api/images/crop`

Crop a specific region of an image.

**Request Parameters**:
- `image` (file): Image file
- Options (JSON):

```json
{
  "left": 100,
  "top": 100,
  "width": 400,
  "height": 300
}
```

#### 5. Convert Image Format

**POST** `/api/images/convert/:format`

Convert image format.

**Path Parameters**:
- `format`: Target format (jpeg, png, webp, avif)

**Query Parameters**:
- `quality`: Quality (1-100, default 80)

**Request Parameters**:
- `image` (file): Image file

#### 6. Apply Filter Effects

**POST** `/api/images/filter/:type`

Apply various filter effects.

**Path Parameters**:
- `type`: Filter type
  - `grayscale`: Grayscale
  - `blur`: Blur
  - `sharpen`: Sharpen

**Query Parameters** (for blur):
- `sigma`: Blur amount (default 1)

**Request Parameters**:
- `image` (file): Image file

#### 7. Batch Processing

**POST** `/api/images/batch`

Batch process multiple images.

**Request Parameters**:
- `image` (files): Multiple image files
- Processing options (JSON): Same as general processing endpoint

**Response**:
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

## Usage Examples

### cURL Examples

#### General Image Processing

```bash
curl -X POST http://localhost:5173/api/images/process \
  -F "image=@example.jpg" \
  -F "options={\"width\":800,\"height\":600,\"format\":\"webp\",\"quality\":80}"
```

#### Get Image Info

```bash
curl -X POST http://localhost:5173/api/images/info \
  -F "image=@example.jpg"
```

#### Resize

```bash
curl -X POST http://localhost:5173/api/images/resize \
  -F "image=@example.jpg" \
  -F "options={\"width\":400,\"height\":300,\"fit\":\"cover\"}"
```

#### Format Conversion

```bash
curl -X POST http://localhost:5173/api/images/convert/webp?quality=90 \
  -F "image=@example.jpg"
```

#### Apply Filter

```bash
# Grayscale filter
curl -X POST http://localhost:5173/api/images/filter/grayscale \
  -F "image=@example.jpg"

# Blur filter
curl -X POST http://localhost:5173/api/images/filter/blur?sigma=2 \
  -F "image=@example.jpg"
```

### JavaScript Example

```javascript
// Upload and process image using FormData
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
  // Use the processed image
}
```

### Python Example

```python
import requests

# Process image
with open('example.jpg', 'rb') as f:
    files = {'image': f}
    data = {
        'options': '{"width":800,"height":600,"format":"webp","quality":80}'
    }

    response = requests.post(
        'http://localhost:5173/api/images/process',
        files=files,
        data=data
    )

    if response.status_code == 200:
        with open('processed.webp', 'wb') as output:
            output.write(response.content)
```

## Error Handling

API uses standard HTTP status codes:

- `200`: Success
- `400`: Bad request
- `404`: Not found
- `500`: Internal server error

Error response format:

```json
{
  "error": "Error description",
  "details": "Detailed error info"
}
```

## Limitations

- Max file size: 10MB
- Supported formats: JPEG, PNG, GIF, WebP, AVIF, BMP
- Max image size: 4000x4000
- Max batch files: 5

## License

MIT License
