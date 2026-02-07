# Playwright Skill

Complete browser automation skill for Claude Code, powered by Playwright.

## 🚀 Features

- **Browser Automation**: Automate any browser interaction with Playwright
- **Cookie Management**: Save and reuse browser sessions with cookie persistence
- **Script Recording**: Record browser actions and convert to Playwright scripts
- **Headless Mode**: Convert recorded scripts to headless mode for CI/CD
- **Clean Test Scripts**: Auto-generated, readable test scripts

## 📦 Installation

```bash
npm install
```

## 🎯 Usage

### Run Browser Automation

```bash
node run.js
```

### Record Browser Actions

```bash
node record.js
```

### Manage Cookies

```bash
node cookie-management.js
```

### Convert to Headless Mode

```bash
node convert-to-headless.js <script-file>
```

## 📁 Project Structure

```
playwright-skill/
├── lib/              # Core library files
├── scrips/           # Automation scripts
├── run.js            # Main runner
├── record.js         # Browser recorder
├── cookie-management.js  # Cookie utilities
├── convert-to-headless.js  # Headless converter
├── SKILL.md          # Skill documentation
└── API_REFERENCE.md  # API reference
```

## 📚 Documentation

- [Skill Documentation](SKILL.md)
- [API Reference](API_REFERENCE.md)

## 🔧 Dependencies

- Playwright
- Node.js 14+

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📄 License

MIT

## 🎨 Built with Claude Code

This skill was created and maintained using [Claude Code](https://claude.com/claude-code).
