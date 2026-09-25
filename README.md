<div align="center">
  <img src="public/logo.svg" alt="Shadow Logo" width="150" height="150" />
  <h1>Shadow</h1>
  <p><strong>A Privacy-Focused, Bring-Your-Own-Key AI Chat Assistant</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#providers--models">Providers</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

## 🌟 Introduction

**Shadow** is a modern, highly-capable AI chat interface designed with privacy and flexibility at its core. Instead of locking you into a single ecosystem, Shadow allows you to bring your own API keys for providers like **Puter**, **Ollama**, and **Cloudflare**, ensuring that you have full control over your data and the models you interact with. 

All your conversations, settings, and generated artifacts are stored locally in your browser using IndexedDB. No analytics, no tracking, and no middlemen.

## ✨ Features

- 🔒 **Absolute Privacy:** 100% local data storage. Your conversations never leave your browser unless explicitly sent to the AI provider you configure.
- 🔑 **Bring Your Own Keys (BYOK):** Seamless integration with Puter.js, local Ollama instances, and Cloudflare AI.
- 🛠️ **Rich Tool Calling:** Enhance your AI's capabilities with built-in tools:
  - **Web Search** (via Tavily)
  - **Image Generation** (Flux models)
  - **Calculator, Weather, & Current Time**
- 🎨 **Beautiful UI & Typography:**
  - Full Markdown support with robust syntax highlighting for code blocks.
  - Math rendering via KaTeX.
  - Native Dark/Light and System themes.
- 🧠 **Advanced Reasoning:** Built-in support for model "Thinking" modes and context window configurations.
- 📁 **Artifacts & Scratchpad:** Dedicated UI for viewing generated code, documents, and ongoing agent scratchpads.

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`) installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/shadow.git
   cd shadow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Providers & Models

Shadow is provider-agnostic. Open the **Settings** modal in the app to configure your integrations:

- **Puter:** Access cutting-edge models seamlessly via Puter.js.
- **Ollama:** Run local, uncensored, and private models directly on your hardware.
- **Cloudflare:** Leverage Cloudflare's serverless AI inference network for fast and scalable AI interactions.

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI & Styling:** [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Storage:** [idb](https://github.com/jakearchibald/idb) (IndexedDB)
- **Markdown & Code:** `react-markdown`, `remark-gfm`, `rehype-katex`, `shiki`, `prismjs`

## 🤝 Contributing

Contributions are welcome! If you'd like to add a new provider, tool, or feature, feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
