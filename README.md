# Brixies Exporter Web Interface

A beautiful web interface for downloading Brixies Builder section exports from the Figma plugin.

## 🚀 Live Demo

Visit: [https://zmdx4.github.io/brixies-exporter-web/](https://zmdx4.github.io/brixies-exporter-web/)

## 📖 Usage

### From Figma Plugin
1. Install the Brixies Exporter plugin in Figma
2. Select sections or pages you want to export
3. Click "Generate Export"
4. The plugin will automatically open this web interface
5. Download or copy the combined JSON for Bricks Builder

### Direct Access
Visit: `https://zmdx4.github.io/brixies-exporter-web/export/EXPORT_ID`

Replace `EXPORT_ID` with the actual export ID from the Figma plugin.

## 🛠️ Features

- **Beautiful UI**: Modern, responsive design with gradient backgrounds
- **Export Management**: View all sections in your export
- **Copy to Clipboard**: One-click copy of the entire JSON
- **Download JSON**: Download the file directly to your computer
- **Preview**: See a preview of the combined code
- **Error Handling**: Graceful error messages for missing exports
- **Mobile Responsive**: Works perfectly on all devices

## 🔧 Technical Details

- **Static HTML**: No backend required, hosted on GitHub Pages
- **GitHub Integration**: Fetches section data from [brixies-sections-data-cf](https://github.com/ZMDx4/brixies-sections-data-cf)
- **Modern JavaScript**: Uses async/await and modern browser APIs
- **Progressive Enhancement**: Works even if JavaScript fails

## 🌐 Custom Domain

This site is ready for a custom domain. Simply:
1. Purchase a domain (e.g., `brixies-exporter.com`)
2. Add CNAME record pointing to `zmdx4.github.io`
3. Enable custom domain in GitHub Pages settings
4. Update the Figma plugin configuration

## 📁 Repository Structure

brixies-exporter-web/
├── index.html # Main web interface
└── README.md # This file


## �� Related Projects

- **[Brixies Exporter Plugin](https://github.com/ZMDx4/brixies-exporter)**: Figma plugin for exporting sections
- **[Brixies Sections Data](https://github.com/ZMDx4/brixies-sections-data-cf)**: Repository containing all section templates

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ for the Bricks Builder community**
