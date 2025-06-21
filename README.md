# FitWise 🏋️‍♂️🤖

**FitWise** is an intelligent workout assistant that uses **Agentic AI** and **MediaPipe pose detection** to generate customized workout routines and provide **real-time form correction** — tailored for fitness enthusiasts, beginners, and everyone in between.

---

## 🚀 Features

- 🧠 **Agentic AI**: Understands your fitness goals and builds adaptive routines.
- 🎯 **Personalized Workouts**: Tailors routines based on your body, experience level, and objectives.
- � **RAG-Enhanced Knowledge**: Leverages embeddings of the latest exercise science and anatomy research to provide evidence-based recommendations.
- �📷 **MediaPipe Pose Detection**: Tracks your form live via camera.
- ✅ **Real-Time Feedback**: Get instant corrections and guidance on your posture and reps.
- 🕹️ **Simple UI**: Designed to be distraction-free and easy to navigate.

---

## 🛠️ Tech Stack

- **Frontend**: SvelteKit + shadcn/ui (Web)
- **AI**: Agentic framework (Vercel AI-SDK)
- **RAG System**: Vector embeddings of exercise science research, anatomy studies, and biomechanics data
- **Pose Detection**: MediaPipe (Pose Landmarks)
- **Backend (optional)**: SvelteKit API
- **Database**: Vercel Postgres
---

## 🔍 How It Works

1. **Input your goals** → muscle gain, fat loss, mobility, etc.
2. **AI Agent** queries the RAG system to retrieve relevant exercise science and anatomy research.
3. **AI crafts a plan** → exercises, reps, rest times based on evidence-based recommendations.
4. **Webcam activates** during your workout to detect posture.
5. **Live feedback** guides your form using biomechanics knowledge, preventing injuries and bad habits.

---

## 📦 Installation (WIP)

```bash
git clone https://github.com/yourusername/fitwise
cd fitwise
pnpm install
pnpm dev
````

> ⚠️ Requires a webcam and modern browser for pose detection.

---

## 🧩 Roadmap

* [x] Custom routine generation via toolspec agents
* [x] Real-time pose feedback (MediaPipe)
* [ ] Voice assistant guidance
* [ ] Health Connect & Apple Health sync
* [ ] Offline-first progressive web app
* [ ] Social workout logs and AI review

---

## 📄 License

FitWise is licensed under the **MIT License**.

---

## 🤝 Contribute

Pull requests are welcome! If you'd like to contribute, feel free to fork the repo and submit improvements or features.

---

## 💬 Support

For feedback or help, reach out on [Issues](https://github.com/yourusername/fitwise/issues) or email: `your@email.com`

---

**Transform your fitness journey with smart, real-time guidance — FitWise.**