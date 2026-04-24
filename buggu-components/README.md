# @buggu/document-extractor

Reusable React components for extracting structured data from documents using Google Gemini AI.

## 🚀 Features

- **📄 Multi-format Support**: Images, PDFs (unlimited pages), and text files
- **🤖 AI-Powered**: Uses Google Gemini AI for intelligent data extraction
- **🔧 Highly Configurable**: Custom schemas and prompts
- **⚡ Fast Processing**: Optimized PDF rendering and image handling
- **🎨 Beautiful UI**: Modern, responsive components with smooth animations
- **📦 Easy Integration**: Drop-in components for any React project
- **🔒 Type-Safe**: Full TypeScript support (coming soon)

## 📦 Installation

```bash
npm install @buggu/document-extractor
```

## 🔑 API Key Setup

You'll need a Google Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## 🎯 Quick Start

### Basic Usage

```jsx
import React from 'react';
import { DocumentExtractor } from '@buggu/document-extractor';

function App() {
  const handleExtract = (data) => {
    console.log('Extracted data:', data);
  };

  const handleError = (error) => {
    console.error('Extraction error:', error);
  };

  return (
    <DocumentExtractor
      apiKey="your-gemini-api-key"
      onExtract={handleExtract}
      onError={handleError}
    />
  );
}
```

### Custom Schema

```jsx
const customSchema = {
  type: "object",
  properties: {
    invoice_number: { type: "string" },
    date: { type: "string" },
    total_amount: { type: "number" },
    vendor: { type: "string" }
  },
  required: ["invoice_number", "date", "total_amount"]
};

function InvoiceExtractor() {
  return (
    <DocumentExtractor
      apiKey="your-gemini-api-key"
      schema={customSchema}
      customPrompt="Extract invoice details from the document"
      onExtract={(data) => console.log(data)}
    />
  );
}
```

## 🧩 Components

### DocumentExtractor

All-in-one component for document processing and AI extraction.

```jsx
<DocumentExtractor
  apiKey="required"
  schema={optional}
  customPrompt={optional}
  onExtract={optional}
  onError={optional}
  showTextInput={true}
  showFileUpload={true}
/>
```

### Individual Components

#### FileUpload

```jsx
import { FileUpload } from '@buggu/document-extractor';

<FileUpload
  onFilesSelected={(files) => console.log(files)}
  loading={false}
  disabled={false}
  accept="image/*,application/pdf,text/plain,.txt"
  multiple={true}
/>
```

#### TextInput

```jsx
import { TextInput } from '@buggu/document-extractor';

<TextInput
  onTextSubmit={(text) => console.log(text)}
  loading={false}
  disabled={false}
  placeholder="Paste your text here..."
  rows={6}
/>
```

#### ContentPreview

```jsx
import { ContentPreview } from '@buggu/document-extractor';

<ContentPreview
  items={processedItems}
  onClear={() => console.log('cleared')}
/>
```

## 🪝 Hooks

### useDocumentProcessor

Custom hook for document processing logic.

```jsx
import { useDocumentProcessor } from '@buggu/document-extractor';

function MyComponent() {
  const processor = useDocumentProcessor({
    onSuccess: (items) => console.log('Processed:', items),
    onError: (error) => console.error('Error:', error)
  });

  return (
    <div>
      <FileUpload onFilesSelected={processor.processUploadedFiles} />
      <ContentPreview items={processor.processedItems} onClear={processor.clearAll} />
    </div>
  );
}
```

## 🤖 AI Service

### GeminiAIService

Direct access to Gemini AI functionality.

```jsx
import { GeminiAIService } from '@buggu/document-extractor';

const service = new GeminiAIService('your-api-key');

// Extract with custom schema
const data = await service.extractStructuredData({
  items: processedItems,
  schema: customSchema,
  customPrompt: 'Extract invoice data'
});

// Extract job descriptions
const jobData = await service.extractJobDescription(processedItems);
```

## 🛠️ Utilities

### File Processing

```jsx
import { processFiles, createPreviewURL, revokePreviewURL } from '@buggu/document-extractor';

// Process files
const processed = await processFiles(fileList);

// Create preview URLs
const urls = processed.map(item => createPreviewURL(item.blob));

// Clean up URLs
urls.forEach(url => revokePreviewURL(url));
```

### JSON Utilities

```jsx
import { sanitizeJSON, repairJSON } from '@buggu/document-extractor';

// Clean AI-generated JSON
const cleaned = sanitizeJSON(rawText);

// Repair malformed JSON
const parsed = repairJSON(jsonString);
```

## 🎨 Styling

The components use Tailwind CSS classes. You can customize the appearance by:

1. **Override CSS Classes**: Pass custom `className` props
2. **CSS Variables**: Override theme variables
3. **Component Composition**: Use individual components for custom layouts

## 📱 Supported Formats

- **Images**: PNG, JPG, JPEG, WebP, GIF
- **PDFs**: Unlimited pages, high-quality rendering
- **Text**: TXT files and direct text input

## 🔧 Configuration

### Environment Variables

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | string | - | Gemini API key (required) |
| `schema` | object | - | Custom JSON schema |
| `customPrompt` | string | - | Custom AI prompt |
| `onExtract` | function | - | Extraction success callback |
| `onError` | function | - | Error callback |
| `showTextInput` | boolean | true | Show text input option |
| `showFileUpload` | boolean | true | Show file upload option |

## 🌟 Examples

### Invoice Processing

```jsx
const invoiceSchema = {
  type: "object",
  properties: {
    invoice_number: { type: "string" },
    date: { type: "string" },
    vendor: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          price: { type: "number" }
        }
      }
    },
    total: { type: "number" }
  }
};

<InvoiceExtractor schema={invoiceSchema} />
```

### Resume Processing

```jsx
const resumeSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          position: { type: "string" },
          duration: { type: "string" }
        }
      }
    },
    skills: { type: "array", items: { type: "string" } }
  }
};

<ResumeExtractor schema={resumeSchema} />
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@buggu.dev
- 🐛 Issues: [GitHub Issues](https://github.com/AnchitSingh/buggu/issues)
- 📖 Docs: [Documentation](https://buggu.dev/docs)

---

Made with ❤️ by the Buggu team
