# Architecture Diagram

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#ffffff",
    "primaryColor": "#f8f9fa",
    "primaryTextColor": "#212529",
    "secondaryColor": "#e9ecef",
    "tertiaryColor": "#dee2e6",
    "lineColor": "#495057",
    "textColor": "#212529",
    "clusterBkg": "#f8f9fa",
    "clusterBorder": "#adb5bd",
    "nodeBorder": "#495057"
  }
}}%%

graph TB
    subgraph "User Interface"
        UI[Landing Page]
        MODAL[JD Search Modal]
        RESULTS[Results Page]
        CHAT[Chat View Modal]
    end

    subgraph "Document Processing"
        PDF[PDF Processor]
        IMG[Image Converter]
        BLOB[Blob Handler]
    end

    subgraph "AI Extraction"
        GEMINI[Gemini Vision API]
        JSON[JSON Parser & Repair]
        SCHEMA[JD Schema Validator]
        JD_EMB[JD Embedding Generator]
    end

    subgraph "Matching Engine"
        BM25[BM25F Lexical Index]
        VEC[Vector Embeddings]
        BONUS[Structural Bonus Calculator]
        GATE[Must-Have Gate]
        FUSE[Score Fusion]
        EXP[Explainability Engine]
    end

    subgraph "Interest Assessment"
        CONV[Conversation Engine]
        RECR[Recruiter LLM]
        CAND[Candidate LLM]
        JUDGE[Judge LLM]
        RETRY[Retry with Backoff]
    end

    subgraph "Data Layer"
        CDB[Candidate DB]
        EMB[Embedding Cache]
    end

    UI --> MODAL
    MODAL --> PDF
    PDF --> IMG
    IMG --> BLOB
    BLOB --> GEMINI
    GEMINI --> JSON
    JSON --> SCHEMA
    SCHEMA --> JD_EMB
    JD_EMB --> RESULTS

    RESULTS --> BM25
    RESULTS --> VEC
    BM25 --> BONUS
    VEC --> BONUS
    BONUS --> GATE
    GATE --> FUSE
    FUSE --> EXP
    EXP --> RESULTS

    RESULTS --> CONV
    CONV --> RECR
    CONV --> CAND
    RECR --> CAND
    CAND --> JUDGE
    JUDGE --> RETRY
    RETRY --> RESULTS

    RESULTS --> CDB
    RESULTS --> EMB
    CDB --> BM25
    EMB --> VEC

    RESULTS --> CHAT
    CHAT --> CONV

    %% Light theme node styles
    classDef ui fill:#e1f5ff,stroke:#0c6cb5,stroke-width:2px,color:#0c2e4a
    classDef doc fill:#fff4e1,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef ai fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef match fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#4c1d95
    classDef interest fill:#fee2e9,stroke:#e11d48,stroke-width:2px,color:#881337
    classDef data fill:#f1f5f9,stroke:#334155,stroke-width:2px,color:#1e2937

    class UI,MODAL,RESULTS,CHAT ui
    class PDF,IMG,BLOB doc
    class GEMINI,JSON,SCHEMA ai
    class BM25,VEC,BONUS,GATE,FUSE,EXP match
    class CONV,RECR,CAND,JUDGE,RETRY interest
    class CDB,EMB data
```

## Component Overview

### User Interface Layer
- **Landing Page**: Entry point with JD upload modal
- **JD Search Modal**: Multi-step modal for JD parsing and review
- **Results Page**: Displays ranked candidates with match/interest scores
- **Chat View Modal**: Shows conversation transcripts for each candidate

### Document Processing Layer
- **PDF Processor**: Converts PDF pages to images using PDF.js
- **Image Converter**: Renders PDF pages to canvas and extracts blobs
- **Blob Handler**: Manages image blobs for API transmission

### AI Extraction Layer
- **Gemini Vision API**: Extracts structured JSON from images/text
- **JSON Parser & Repair**: Sanitizes and repairs malformed LLM responses
- **JD Schema Validator**: Validates extracted data against schema
- **JD Embedding Generator**: Generates embeddings for job description

### Matching Engine Layer
- **BM25F Lexical Index**: Inverted index for keyword matching
- **Vector Embeddings**: Semantic similarity using cosine similarity
- **Structural Bonus Calculator**: Rewards experience, location, salary, availability
- **Must-Have Gate**: Enforces critical skill requirements
- **Score Fusion**: Combines all signals into match score
- **Explainability Engine**: Generates human-readable explanations via set-diffing

### Interest Assessment Layer
- **Conversation Engine**: Orchestrates two-LLM conversations
- **Recruiter LLM**: Roleplays recruiter, asks questions
- **Candidate LLM**: Roleplays candidate, responds based on profile
- **Judge LLM**: Analyzes transcript to score interest
- **Retry with Backoff**: Handles API rate limits with exponential backoff

### Data Layer
- **Candidate DB**: JSON database of candidate profiles with pre-computed embeddings
- **Embedding Cache**: Cached embedding vectors for faster matching

## Data Flow

1. **JD Upload**: User uploads PDF/image/text → Modal
2. **Document Processing**: PDF → Images → Blobs
3. **AI Extraction**: Blobs → Gemini → Structured JSON
4. **Matching**: JD + Candidate DB → BM25 + Vector + Bonuses → Match Score
5. **Interest Assessment**: Selected candidates → Two-LLM conversations → Interest Score
6. **Combined Scoring**: Match Score (60%) + Interest Score (40%) → Final Ranking
7. **Display**: Results page shows ranked candidates with scores and explanations
