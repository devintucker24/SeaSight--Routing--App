# AI Novel Writer

A powerful web application for writing novels with integrated AI assistance from OpenRouter. This app provides a professional writing environment with chapter management, text formatting, real-time statistics, and AI-powered writing assistance.

## Features

### 📝 Writing Environment
- **Rich Text Editor**: Professional writing interface with formatting tools
- **Chapter Management**: Organize your novel into chapters with easy navigation
- **Auto-Save**: Automatic saving every 30 seconds to prevent data loss
- **Writing Statistics**: Real-time word count, character count, and page estimates
- **Keyboard Shortcuts**: Standard shortcuts for formatting and saving

### 🤖 AI Integration
- **Multiple AI Models**: Choose from various models including Claude, GPT-4, and Llama
- **Story Suggestions**: Get creative ideas for plot development
- **Continue Writing**: AI can continue your story naturally
- **Text Improvement**: Enhance clarity and literary quality of selected text
- **Context-Aware**: AI considers your novel's summary and existing content
- **Worldbuilding Integration**: AI automatically references relevant worldbuilding entries based on keywords

### 🌍 Worldbuilding System
- **Magic Systems**: Define power sources, limitations, and rules for your magic systems
- **Power Systems**: Track progression levels, ranks, and advancement methods
- **Locations**: Document important places with danger levels and descriptions
- **Characters**: Maintain character profiles with levels, classes, and abilities
- **Lore & History**: Record important historical events and world lore
- **Progression Tracking**: Monitor character advancement and milestone requirements
- **Keyword/Alias System**: AI automatically detects and references entries when keywords appear in your writing
- **LitRPG Focused**: Specifically designed for progression fantasy and LitRPG novels

### 💾 Data Management
- **Local Storage**: All data is stored locally in your browser
- **Export Function**: Download your novel as a text file
- **Import/Export**: Preserve your work across sessions

### 🎨 User Interface
- **Modern Design**: Clean, professional interface optimized for writing
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Dark/Light Themes**: Comfortable writing in any lighting condition
- **Distraction-Free**: Focused writing environment

## Getting Started

### 1. Setup
1. Download or clone this repository
2. Open `index.html` in a modern web browser
3. No installation or server setup required!

### 2. Configure AI Integration
1. Click the settings button (⚙️) in the bottom-right corner
2. Enter your OpenRouter API key
3. Your key is stored locally and never sent to external servers

### 3. Get Your OpenRouter API Key
1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy and paste it into the app settings

## How to Use

### Writing Your Novel
1. **Set Novel Info**: Enter your novel title and summary in the sidebar
2. **Create Chapters**: Use the "Add Chapter" button to organize your work
3. **Start Writing**: Click in the editor and begin writing your story
4. **Format Text**: Use the toolbar buttons or keyboard shortcuts
5. **Save Progress**: Use Ctrl+S or the Save button (auto-save is also active)

### Building Your World
1. **Switch to World Tab**: Click the "World" tab in the sidebar
2. **Add Magic Systems**: Define your magic with power sources, limitations, and rules
3. **Create Power Systems**: Set up progression levels and advancement methods
4. **Document Locations**: Add important places with descriptions and danger levels
5. **Track Characters**: Maintain profiles with levels, classes, and abilities
6. **Record Lore**: Document historical events and world background
7. **Set Keywords**: Add aliases so AI can automatically reference your worldbuilding

### AI Assistance
1. **Get Suggestions**: Click "Get AI Suggestions" for plot ideas
2. **Continue Writing**: Let AI help continue your story
3. **Improve Text**: Select text and click "Improve Text" for enhancements
4. **Choose Models**: Select different AI models based on your needs
5. **Worldbuilding Context**: AI automatically uses relevant worldbuilding entries when keywords are detected

### Keyboard Shortcuts
- `Ctrl+S` (Cmd+S on Mac): Save
- `Ctrl+B` (Cmd+B on Mac): Bold
- `Ctrl+I` (Cmd+I on Mac): Italic
- `Ctrl+U` (Cmd+U on Mac): Underline
- `Ctrl+Z` (Cmd+Z on Mac): Undo
- `Ctrl+Shift+Z` (Cmd+Shift+Z on Mac): Redo

## AI Models Available

### Fast & Economical
- **Claude 3 Haiku**: Quick responses, good for suggestions
- **GPT-4o Mini**: Balanced performance and cost

### High Quality
- **Claude 3 Sonnet**: Excellent for creative writing
- **GPT-4o**: Top-tier model for complex tasks
- **Llama 3.1 8B**: Open-source alternative

## Technical Details

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Storage
- Uses localStorage for data persistence
- Separate storage for novel data and worldbuilding data
- No server required - runs entirely in browser
- Data remains private and local

### API Integration
- Connects to OpenRouter.ai for AI services
- Supports multiple AI model providers
- Secure API key handling
- Intelligent worldbuilding context injection

### Worldbuilding Features
- **6 Category Types**: Magic Systems, Power Systems, Locations, Characters, Lore, Progression
- **Keyword Detection**: Automatic AI context based on aliases and entry names
- **Type-Specific Fields**: Specialized forms for each worldbuilding category
- **Visual Organization**: Color-coded entries with intuitive icons
- **Search & Reference**: Easy viewing and editing of worldbuilding entries

## Privacy & Security

- **Local Storage**: All novel data stays on your device
- **API Key Security**: Keys stored locally, never transmitted to our servers
- **No Tracking**: No analytics or user tracking
- **Offline Capable**: Core writing features work without internet

## Troubleshooting

### AI Features Not Working
1. Verify your OpenRouter API key is entered correctly
2. Check your internet connection
3. Ensure you have credits in your OpenRouter account
4. Try a different AI model

### Data Not Saving
1. Check if localStorage is enabled in your browser
2. Ensure you have sufficient storage space
3. Try refreshing the page and re-entering data

### Performance Issues
1. Close other browser tabs to free up memory
2. Clear browser cache if the app feels slow
3. Consider using a lighter AI model for faster responses

## Development

### File Structure
```
novel-writer-app/
├── index.html          # Main HTML structure with worldbuilding system
├── styles.css          # CSS styling including worldbuilding UI
├── script.js           # JavaScript functionality with AI integration
└── README.md           # This documentation
```

### Worldbuilding Data Structure
Each worldbuilding entry contains:
- **Basic Info**: Name, type, description, creation/update timestamps
- **Keywords/Aliases**: Comma-separated terms for AI detection
- **Type-Specific Data**: 
  - Magic Systems: Power source, limitations, rules
  - Power Systems: Levels/ranks, progression methods
  - Characters: Level/rank, class/role, abilities
  - Locations: Type, danger level
  - Progression: Current level, next milestone, requirements
  - Lore: Historical context and background information

### Customization
The app is built with vanilla HTML, CSS, and JavaScript, making it easy to customize:
- Modify `styles.css` for visual changes
- Edit `script.js` for functionality updates
- Update `index.html` for structural changes

## Contributing

Feel free to contribute improvements:
1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the OpenRouter documentation
3. Ensure your browser is up to date

---

**Happy Writing! 📚✨**

Transform your creative ideas into compelling novels with the power of AI assistance.
