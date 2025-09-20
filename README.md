# Voke - BBCode Editor with Integrated Image Hosting

<div align="center">

![Voke Logo](public/favicon.ico)

**A modern, feature-rich BBCode editor with built-in image hosting integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D.svg)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x+-339933.svg)](https://nodejs.org/)

</div>

## 🎯 Overview

Voke is a powerful BBCode editor that streamlines the content creation process by eliminating the tedious workflow of uploading images to image hosts and copying links. With integrated image hosting support, you can simply drag and drop images directly into your editor and have them automatically uploaded and embedded as BBCode.

## ✨ Key Features

### 🖼️ **Integrated Image Hosting**

- **Drag & Drop Upload**: Simply drag images into the editor for instant upload
- **Multiple Image Hosts**: Support for FreeImage.host, SDA1.dev, and local testing
- **Batch Link Processing**: Paste multiple image URLs at once for bulk insertion
- **Smart Format Detection**: Automatic validation of image formats and URLs
- **No External Tools Required**: Upload directly from the editor interface

### 📝 **Rich BBCode Editing**

- **WYSIWYG & Source Modes**: Switch between visual and code editing
- **Comprehensive Toolbar**: Bold, italic, colors, fonts, lists, quotes, and more
- **Custom Commands**: Export to clipboard, alignment formatting
- **Live Preview**: See your formatting in real-time
- **Syntax Highlighting**: Clear BBCode syntax visualization

### 🌐 **Multi-language Support**

- **Internationalization**: Full Chinese and English language support
- **Dynamic Switching**: Change language on-the-fly without reloading
- **Localized UI**: All interface elements properly translated

### 🎨 **Modern User Experience**

- **Dark/Light Themes**: Toggle between themes with smooth transitions
- **Auto-Save**: Automatic content saving with configurable intervals
- **File Operations**: Import/export documents as .txt files
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Content Protection**: Smart detection to prevent accidental content loss

### ⚙️ **Advanced Configuration**

- **Flexible Settings**: Customize image alignment, auto-formatting, and more
- **Storage Management**: Configurable auto-save with expiration settings
- **Development Proxy**: Built-in CORS proxy for seamless image hosting integration
- **API Integration**: Support for custom API keys and hosting preferences

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19.0+ or 22.12.0+
- npm or yarn package manager

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/plumed-nebula/voke.git
cd voke
```

2. **Install dependencies**

```bash
npm install
```

3. **Install server dependencies**

```bash
cd server
npm install
cd ..
```

4. **Start development server**

```bash
npm run dev
```

5. **Open your browser**
   Navigate to `http://localhost:5173` to start using Voke!

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint frontend code
- `npm run lint:all` - Lint both frontend and backend code
- `npm run format` - Format code with Prettier

### Project Structure

```
voke/
├── src/                    # Frontend source code
│   ├── components/         # Vue components
│   │   ├── BBcodeEditor.vue    # Main editor component
│   │   ├── ImageDropZone.vue   # Image upload interface
│   │   ├── TopBar.vue          # Application header
│   │   └── SettingsPanel.vue   # Configuration panel
│   ├── composables/        # Vue composables
│   ├── utils/              # Utility functions
│   │   ├── imageUploadProxy.js # Image hosting integration
│   │   ├── formatUtils.js      # BBCode formatting
│   │   └── i18n.js            # Internationalization
│   └── styles/             # CSS and styling
├── server/                 # Development proxy server
│   └── dev-proxy.js        # CORS proxy for image hosting
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 📋 Usage Examples

### Basic BBCode Editing

```bbcode
[b]Bold text[/b]
[i]Italic text[/i]
[u]Underlined text[/u]
[color=red]Colored text[/color]
[size=18]Large text[/size]
[url=https://example.com]Link text[/url]
```

### Image Integration

1. **Drag & Drop**: Drag images directly into the editor
2. **Toolbar Upload**: Click the image button to select files
3. **Batch Links**: Use "Insert Links" to add multiple image URLs at once
4. **Auto-formatting**: Images are automatically formatted with proper BBCode

### Advanced Features

- **Export**: Copy formatted content to clipboard
- **Alignment**: Format image alignment tags
- **Source Mode**: Edit raw BBCode directly
- **Full Screen**: Maximize editor for distraction-free editing

## 🔧 Configuration

### Image Hosting Settings

Access settings via the gear icon in the top bar:

- **Default Image Host**: Choose between FreeImage.host, SDA1.dev, or local testing
- **API Keys**: Configure FreeImage.host API key for higher limits
- **Image Formatting**: Set default alignment and auto-newline preferences
- **Copy Formatting**: Enable universal align parameter format for compatibility

### Auto-Save Configuration

- **Enable/Disable**: Toggle automatic content saving
- **Save Interval**: Adjust delay between auto-saves (0.5s to 3s)
- **Storage Expiry**: Set how long content is retained (1 hour to 30 days)

## 🌐 Supported Image Hosts

| Host               | API Required | Max Size | Features                              |
| ------------------ | ------------ | -------- | ------------------------------------- |
| **FreeImage.host** | Optional     | 64MB     | High reliability, optional API key    |
| **SDA1.dev**       | No           | 5MB      | No registration required, fast upload |
| **Local Testing**  | No           | 10MB     | Base64 preview, no network required   |

## 🎨 Theming

Voke supports both light and dark themes with:

- Dynamic CSS variables for consistent theming
- Smooth transitions between theme switches
- Editor content that adapts to the selected theme
- Preserved theme preference across sessions

## 🌍 Internationalization

Currently supported languages:

- **中文 (Chinese)**: Complete translation with cultural adaptations
- **English**: Native language with full feature support

To add a new language, extend the translation objects in `src/utils/i18n.js`.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature X"`
5. Push to your fork: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SCEditor**: The powerful BBCode editor that forms the foundation of Voke
- **Vue.js**: For the reactive framework that powers the user interface
- **Image Hosting Services**: FreeImage.host and SDA1.dev for providing reliable image hosting APIs
- **Contributors**: Everyone who has contributed to making Voke better

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/plumed-nebula/voke/issues)
- **Discussions**: [GitHub Discussions](https://github.com/plumed-nebula/voke/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

## 🔮 Roadmap

- [ ] Plugin system for custom BBCode tags
- [ ] More image hosting service integrations
- [ ] Advanced image editing tools
- [ ] Collaborative editing features
- [ ] Mobile app versions
- [ ] Cloud synchronization options

---

<div align="center">

**Made with ❤️ by the Voke Team**

[Website](https://voke.dev) • [Documentation](docs/) • [GitHub](https://github.com/plumed-nebula/voke)

</div>
