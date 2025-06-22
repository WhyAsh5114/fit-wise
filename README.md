# FitWise 🏋️‍♂️🤖

**FitWise** is an intelligent AI-powered workout assistant that combines **Agentic AI**, **RAG-enhanced knowledge**, and **MediaPipe pose detection** to create personalized workout routines and provide real-time form correction — designed for fitness enthusiasts at every level.

---

## 🚀 Core Features

### 🧠 **Agentic AI Workflow**
- **Intelligent Chat Assistant**: Natural language conversation for fitness advice and workout creation
- **Tool-Based Execution**: Uses specialized tools for workout generation, exercise config creation, and data persistence
- **Context-Aware Responses**: Maintains conversation flow with multi-step reasoning
- **User Session Management**: Personalized experience with login/logout functionality

### 🎯 **Dynamic Workout Generation**
- **Personalized Routines**: AI creates workouts based on goals, equipment, experience level, and duration
- **Unlimited Exercise Support**: No longer limited to predefined exercises - AI generates tracking configs for any exercise
- **Automatic Exercise Config Generation**: MediaPipe pose tracking configurations created dynamically using LLM analysis
- **Smart Caching**: Efficient reuse of generated configurations for performance
- **Database Integration**: Saves workouts with linked exercise configurations for future use

### 📚 **RAG-Enhanced Knowledge System**
- **Vector Database**: Qdrant-powered embedding storage of exercise science research
- **Relevance Filtering**: Only uses high-relevance content (70%+ similarity) for responses
- **Evidence-Based Recommendations**: Leverages latest research in biomechanics, anatomy, and exercise science
- **Source Citation**: References specific research sources in responses
- **LM Studio Integration**: Local embedding generation using text-embedding models

### 📷 **Advanced Pose Detection & Analysis**
- **MediaPipe Integration**: Real-time pose landmark detection via webcam
- **Multi-Joint Tracking**: Composite angle analysis from multiple body joints
- **Adaptive Peak Detection**: Intelligent rep counting with trend analysis
- **Target Angle Guidance**: ROM (Range of Motion) optimization with personalized targets
- **Bilateral Tracking**: Left and right side angle measurements for balanced analysis

### ✅ **Intelligent Real-Time Feedback**
- **AI-Powered Analysis**: LLM-based feedback generation considering form, tempo, and ROM
- **Configurable Performance Modes**:
  - **Fast Mode**: Quick text feedback for immediate responsiveness
  - **Enhanced Reference**: RAG-enhanced feedback with research backing
  - **Voice Feedback**: Spoken guidance in Bengali for hands-free operation
  - **Combined Mode**: Both enhanced reference and voice for comprehensive feedback
- **Scoring System**: 0-100 performance scores with "good/okay/bad" classifications
- **Progressive ROM Targets**: Adjustable range of motion goals (Low/Standard/High/Maximum)

### 🛠️ **User Interface & Experience**
- **Modern SvelteKit Frontend**: Built with shadcn/ui components for a clean, responsive design
- **Dashboard Overview**: Centralized view of workouts, progress, and AI interactions
- **Exercise Config Management**: Visual interface for viewing and testing generated configurations
- **Form Analysis Page**: Real-time pose detection with visual feedback
- **Workout Library**: Save, organize, and access personalized workout routines
- **Mobile-Responsive**: Works seamlessly across desktop and mobile devices

---

## 🤖 Agentic AI Workflow

FitWise implements a sophisticated agentic AI system that orchestrates multiple tools and knowledge sources to provide comprehensive fitness assistance:

### Agentic Components:

1. **Query Analysis Agent**: Determines if queries are fitness-related and routes appropriately
2. **RAG Retrieval Agent**: Searches vector database for relevant exercise science research
3. **Workout Generation Agent**: Creates personalized routines using evidence-based principles
4. **Exercise Config Agent**: Generates MediaPipe configurations for any exercise dynamically
5. **Persistence Agent**: Manages user data, workout storage, and exercise configurations
6. **Feedback Agent**: Provides real-time form analysis using pose detection data

---

## �️ Tech Stack

### **Frontend & UI**
- **SvelteKit**: Modern web framework with server-side rendering
- **shadcn/ui**: Beautiful, accessible component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **TypeScript**: Type-safe development with enhanced developer experience

### **AI & Machine Learning**
- **Vercel AI SDK**: Agentic framework for tool-based AI interactions
- **LM Studio**: Local LLM inference for chat and embedding generation
- **MediaPipe**: Google's pose detection and landmark tracking
- **OpenAI-Compatible API**: Flexible model integration

### **Data & Storage**
- **PostgreSQL**: Primary database via Prisma ORM
- **Qdrant**: Vector database for RAG embeddings
- **Prisma**: Type-safe database client and migration tool
- **Better Auth**: Secure authentication and session management

### **Infrastructure**
- **SvelteKit API Routes**: Backend API endpoints
- **Docker**: Containerized Qdrant deployment
- **pnpm**: Fast, disk space efficient package manager

---

## 🔍 How It Works

### **Workout Creation Flow**
1. **User Input** → Express fitness goals, available equipment, and experience level
2. **AI Analysis** → Agent analyzes requirements and queries RAG system for evidence-based recommendations
3. **Workout Generation** → AI crafts personalized plan with exercises, sets, reps, and rest periods
4. **Exercise Config Creation** → Automatically generates MediaPipe tracking configurations for each exercise
5. **Database Storage** → Saves complete workout with linked exercise configurations
6. **Real-Time Tracking** → Use saved workouts for live pose detection and form feedback

### **Real-Time Form Analysis**
1. **Camera Activation** → MediaPipe detects 33 body landmarks in real-time
2. **Angle Calculation** → Multi-joint composite signals track movement patterns
3. **Rep Detection** → Advanced peak/valley detection counts repetitions automatically
4. **AI Feedback** → LLM analyzes form, tempo, and ROM providing instant corrections
5. **Voice Guidance** → Optional spoken feedback in Bengali for hands-free operation

### **Dynamic Exercise Support**
1. **Exercise Recognition** → User mentions any exercise name
2. **Biomechanical Analysis** → AI determines movement patterns, key joints, and muscle groups
3. **Config Generation** → Creates MediaPipe tracking configuration automatically
4. **Caching** → Stores configs for future use and performance optimization

---

## 📦 Installation & Setup

### **Prerequisites**
- Node.js 18+ and pnpm
- Docker (for Qdrant vector database)
- LM Studio with compatible models
- Webcam for pose detection

### **1. Clone and Install**
```bash
git clone https://github.com/WhyAsh5114/fit-wise
cd fit-wise
pnpm install
```

### **2. Database Setup**
```bash
# Start Qdrant vector database
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant

# Set up PostgreSQL (update .env with your DATABASE_URL)
pnpm prisma migrate dev
```

### **3. LM Studio Configuration**
1. Install and start LM Studio
2. Download required models:
   - **Chat Model**: `qwen/qwen3-4b` or similar instruction-following model
   - **Embedding Model**: `text-embedding-nomic-embed-text-v1.5` or `all-MiniLM-L6-v2`
3. Start the local server on `http://localhost:1234`

### **4. Environment Variables**
Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/fitwise"
LM_STUDIO_URL="http://localhost:1234"
EMBEDDING_MODEL="text-embedding-nomic-embed-text-v1.5"
QDRANT_URL="http://localhost:6333"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5173"
```

### **5. Start Development**
```bash
pnpm dev
```

> ⚠️ **Requirements**: Webcam access and modern browser for pose detection. Ensure LM Studio is running for AI features.

---

## 🎯 Key Features Demo

### **Chat-Based Workout Creation**
```
User: "Create a upper body workout for intermediate level with dumbbells"
AI: *Uses createWorkout tool to generate personalized routine*
AI: "Would you like me to save this workout to your profile?"
User: "Yes"
AI: *Uses saveWorkout tool and generates exercise configs*
```

### **Dynamic Exercise Configuration**
```
User: "Can you track tricep dips?"
AI: *Uses generateExerciseConfig tool*
AI: "Generated tracking configuration for tricep dips with elbow angle monitoring"
```

### **Real-Time Form Feedback**
- **Visual**: Live pose landmarks with angle measurements
- **Text**: "Great range of motion! Control the tempo more." (Score: 82/100)
- **Voice**: Bengali audio feedback for hands-free guidance
- **Classification**: Good/Okay/Bad with specific improvement suggestions

---

## 🧩 Roadmap & Current Status

### ✅ **Completed Features**
- [x] Agentic AI chat interface with tool-based execution
- [x] Dynamic exercise configuration generation for unlimited exercise support
- [x] RAG-enhanced knowledge system with vector database
- [x] Real-time MediaPipe pose detection and rep counting
- [x] AI-powered form feedback with scoring system
- [x] Target angle guidance with progressive ROM settings
- [x] Workout creation, saving, and management
- [x] Exercise config caching and performance optimization
- [x] User authentication and session management
- [x] Modern responsive UI with SvelteKit and shadcn/ui

### 🚧 **In Development**
- [ ] Voice assistant guidance expansion (currently Bengali only)
- [ ] Mobile app with offline-first PWA capabilities
- [ ] Advanced workout analytics and progress tracking
- [ ] Social features and workout sharing
- [ ] Integration with health platforms (Apple Health, Google Fit)

### 🎯 **Future Enhancements**
- [ ] Computer vision-based equipment detection
- [ ] AI-powered injury prevention and recovery protocols
- [ ] Personalized nutrition recommendations
- [ ] Virtual reality workout environments
- [ ] Multi-language voice feedback support
- [ ] Professional trainer dashboard and client management

---

## � Documentation

- **[AI Feedback Setup](docs/AI_FEEDBACK_SETUP.md)**: Configure Ollama and LM Studio for feedback
- **[Dynamic Exercise Config](docs/DYNAMIC_EXERCISE_CONFIG.md)**: Understanding the exercise generation system
- **[Target Angles Implementation](TARGET_ANGLES_IMPLEMENTATION.md)**: ROM guidance and target angle features
- **[Embedding Service](embedding/README.md)**: RAG system setup and content scraping

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Areas for Contribution**
- Exercise science research integration
- New MediaPipe pose tracking configurations
- UI/UX improvements and accessibility
- Mobile app development
- Additional language support for voice feedback
- Performance optimizations

---

## � License

FitWise is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 💬 Support & Community

- **Issues**: [GitHub Issues](https://github.com/WhyAsh5114/fit-wise/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WhyAsh5114/fit-wise/discussions)
- **Email**: For direct support and collaboration inquiries

---

## 🌟 Acknowledgments

- **MediaPipe Team**: For excellent pose detection technology
- **Research Papers**: Exercise science and biomechanics research powering our RAG system
- **Open Source Community**: SvelteKit, Prisma, Qdrant, and other amazing tools
- **Fitness Community**: Feedback and testing from real users and trainers

---

*Built with ❤️ for the fitness community. Transform your workouts with AI-powered intelligence.*

**Transform your fitness journey with smart, real-time guidance — FitWise.**