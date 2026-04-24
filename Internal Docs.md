# Internal Developer Documentation

Welcome to the Exam Buddy project! This document provides a technical overview of the extension's architecture and development process. Its goal is to help developers understand the codebase, contribute effectively, and avoid common pitfalls.

## 1. Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Chrome Extension Plugin**: [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Hooks (`useState`, `useContext`, `useReducer`) combined with a custom service layer.
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Charting**: [ApexCharts](https://apexcharts.com/)

## 2. Project Structure

```
/
├── dist/                  # Build output directory
├── public/                # Static assets
├── src/
│   ├── assets/            # Icons, images
│   ├── components/        # Reusable React components (UI, Quiz, Story)
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks (e.g., useQuizState.js)
│   ├── pages/             # Top-level page components (e.g., HomePage, QuizPage)
│   ├── services/          # Core application logic and API layer (api.js)
│   ├── utils/             # Helper functions and utilities
│   ├── background.js      # Chrome extension service worker
│   ├── content.js         # Chrome extension content script
│   ├── main.jsx           # Entry point for the popup UI
│   ├── manifest.json      # The extension manifest
│   └── sidepanel.jsx      # Entry point for the side panel UI
├── Internal Docs.md       # This file
├── package.json           # Project dependencies and scripts
└── vite.config.js         # Vite build configuration
```

## 3. Architecture Deep Dive

The architecture is designed to be modular and maintain a clean separation of concerns between the UI, state management, and service logic.

### 3.1. The Service Layer Singleton (`src/services/api.js`)

This is the **most critical part of the architecture**. The `examBuddyAPI` is a **singleton class** that acts as a centralized service layer for the entire application.

- **Responsibilities**:
    - Manages all application data (quizzes, bookmarks, user stats).
    - Holds the "source of truth" for active quizzes and user progress in memory (`Map` objects).
    - Interacts with `chrome.storage.local` to persist data across sessions.
    - Abstracts all business logic away from the UI components.
    - Provides a clean, promise-based API for the rest of the app to consume.

- **Why is this important?**
    By centralizing data and logic, we ensure consistency. UI components don't manage their own data; they request it from `examBuddyAPI`. This prevents state desynchronization and makes bugs easier to track down.

- **Gotcha (The Bug We Just Fixed)**:
    If a quiz is not "registered" with the `examBuddyAPI` (i.e., added to its `activeQuizzes` map), the service layer **does not know it exists**. When the UI later tries to submit an answer for that quiz, the API will fail to find it, and the operation (like AI evaluation) will not proceed. This was the root cause of the bookmark evaluation bug.

### 3.2. State Management (`src/hooks/useQuizState.js`)

This custom hook is the primary engine for the quiz experience. It encapsulates all the complex state and logic required to run a quiz.

- **Responsibilities**:
    - Initializes a new quiz (either from the AI or from bookmarks).
    - Tracks the current question, user answers, timer, and quiz status (active, paused, finished).
    - Communicates with the `examBuddyAPI` to start quizzes, submit answers, and save progress.
    - Manages the UI state related to the quiz (e.g., showing feedback, loading indicators).

### 3.3. UI Layer (`src/pages` and `src/components`)

- **`pages`**: These are top-level components that correspond to a major view in the application (e.g., `HomePage`, `QuizPage`). They are responsible for fetching data (via the service layer) and managing the high-level layout.
- **`components`**: These are smaller, reusable components.
    - `components/ui`: Generic, style-focused components (Button, Modal, etc.).
    - `components/quiz`: Components specifically related to the quiz experience.

### 3.4. Chrome Extension Components

- **`background.js`**: The service worker. It handles tasks that need to persist outside of a specific tab, such as creating context menus or managing long-running background processes.
- **`content.js`**: Injected into web pages. It is responsible for extracting text content from the page and communicating it back to the extension's UI (side panel or popup).
- **`sidepanel.jsx` & `main.jsx`**: These are the React entry points for the side panel and the popup action, respectively. They render the main `App.jsx` component.

### 3.5. AI & Storage Utilities

- **`src/utils/chromeAI.js`**: A wrapper around the `window.ai` object provided by Chrome. It abstracts the specific AI model calls (`evaluateSubjectiveJSON`, `streamQuiz`, etc.) into a cleaner, more manageable interface.
- **`src/utils/storage.js`**: A simple abstraction over `chrome.storage.local` and `localStorage`. It provides a consistent, promise-based `get`/`set`/`remove` API.

## 4. Data Flow Example: Starting a Bookmarked Quiz

Understanding this flow is key to understanding the architecture.

1.  **User Action**: The user selects bookmarked questions in `BookmarksPage.jsx` and clicks "Practice Selected".
2.  **Navigate & Configure**: `BookmarksPage.jsx` gathers the selected question data and calls the `onNavigate` function, passing a `quizConfig` object containing the questions.
3.  **Quiz Initialization**: The main `App.jsx` detects the navigation change and mounts `QuizPage.jsx` with the `quizConfig`.
4.  **Hook Activation**: `QuizPage.jsx` passes the `quizConfig` to the `useQuizState.js` hook.
5.  **Quiz Registration (The Fix)**:
    - Inside `useQuizState.js`, the `initializeQuiz` function is called.
    - It sees that `config.questions` exists and calls `examBuddyAPI.createPracticeQuiz(config)`.
    - `createPracticeQuiz` generates a new quiz ID, creates a quiz object, and **saves it to the `activeQuizzes` map within the API service**. It then returns the newly created quiz object.
6.  **State Update**: `useQuizState.js` receives the quiz object from the API and updates its internal state (`setQuiz`, `setQuizId`, etc.), causing the UI to render the first question.
7.  **Evaluation**: Later, when `stopQuiz` is called, it uses the stored `quizId` to call `examBuddyAPI.submitAnswer`. The API can now find the quiz in its `activeQuizzes` map and proceed with the AI evaluation.

## 5. Development & Build

**1. Install Dependencies:**
```bash
npm install
```

**2. Run in Development Mode:**
```bash
npm run dev
```
This will start the Vite development server. To use the extension in Chrome:
- Go to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked" and select the `/dist` directory.
- The extension will hot-recharge as you make changes.

**3. Build for Production:**
```bash
npm run build
```
This creates a production-ready build in the `/dist` directory.

**4. Create a Distributable ZIP file:**
```bash
npm run build:extension
```
This command first builds the extension, then creates `exam-buddy-extension.zip` for distribution.
