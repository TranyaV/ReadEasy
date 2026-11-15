# ReadEase

**Making digital reading more accessible, one document at a time.**

ReadEase is a web-based reading and accessibility platform designed to make digital documents easier to read, understand and interact with.

It transforms uploaded documents and scanned pages into editable reading spaces with customisable typography, visual adjustments, text-to-speech and an AI-powered reading assistant.

## The Problem

Digital documents aren't equally accessible to everyone. Dense layouts, inconsistent formatting and limited reading customisation can make reading difficult, particularly for people with dyslexia and other reading differences.

ReadEase aims to give readers greater control over how they interact with text, rather than forcing everyone to use the same reading experience.

## Features

- **Document Upload & OCR:** Upload PDFs and images and extract readable text using optical character recognition.
- **Customisable Reading Workspace:** Adjust font family, font size, letter spacing, word spacing, line spacing and paragraph spacing.
- **Visual Accessibility:** Choose appearance themes, contrast settings and focus aids to personalise the reading environment.
- **Read Aloud:** Listen to documents with adjustable playback speed, voice selection and sentence highlighting.
- **AI Reading Assistant:** Ask questions about document content or get help with general queries through an integrated AI assistant.
- **Word Definitions:** Access definitions, pronunciation and examples while reading.
- **Document Library:** Organise documents, create folders, star important files and continue reading from where you left off.
- **Reading Profiles:** Save personal reading preferences and apply them to future documents.

## How It Works

1. Upload a PDF or image.
2. ReadEase extracts text using OCR.
3. Review and edit the extracted content.
4. Open the document in the reading workspace.
5. Personalise the reading experience using the available accessibility controls.
6. Use the reading assistant, definitions or text-to-speech whenever needed.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| OCR | Tesseract.js |
| PDF Processing | PDF.js |
| AI Assistant | Google Gemini API |
| Speech | Web Speech API |
| Icons | Lucide React |
| Local Document Storage | IndexedDB |
| Deployment | Vercel |

## Architecture & Privacy

ReadEase uses browser-side document processing and local storage for its core reading workflow.

- OCR processing takes place in the browser.
- Documents are stored locally using IndexedDB.
- Reading preferences are saved locally.
- The AI assistant uses a server-side API route to communicate with Gemini.
- Document context is only sent to the AI assistant after the user gives consent.

The application requires an internet connection for its hosted deployment and external AI services.

## Running Locally

**Prerequisites**
- Node.js
- npm
- A Google Gemini API key

**Installation**

```bash
git clone https://github.com/TranyaV/ReadEasy.git
cd ReadEasy
npm install
```

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current Limitations

ReadEase is an actively developed project. Some planned capabilities, including cloud synchronisation and shared document access, are not currently implemented. Documents are stored locally in the browser, so clearing site data can remove saved documents.

## Acknowledgements

ReadEase was developed as a project for ICE HACKS 2026. AI-assisted development tools, including Claude Code, were used during implementation and debugging. Technical decisions, feature requirements, testing and project direction were guided by the project team.

---

**Built for more accessible reading.**
