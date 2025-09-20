class LearnOS {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.quizState = {};
    }

    initializeElements() {
        // Cover Page Elements
        this.coverPage = document.getElementById('coverPage');
        this.nameInput = document.getElementById('nameInput');
        this.startBtn = document.getElementById('startBtn');
        this.mainApp = document.getElementById('mainApp');

        // Main App Elements
        this.topicInput = document.getElementById('topicInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.loading = document.getElementById('loading');
        this.lessonPlan = document.getElementById('lessonPlan');
        this.conceptsDiv = document.getElementById('concepts');
        this.analogiesDiv = document.getElementById('analogies');
        this.quizDiv = document.getElementById('quiz');
        this.resetBtn = document.getElementById('resetQuiz');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startApp());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startApp();
        });

        this.generateBtn.addEventListener('click', () => this.generateLesson());
        this.topicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.generateLesson();
        });
        this.resetBtn.addEventListener('click', () => this.resetQuiz());
    }

    startApp() {
        const name = this.nameInput.value.trim();
        if (!name) {
            alert('Please enter your name to begin!');
            return;
        }

        // You can optionally save the user's name to use later
        // For example: localStorage.setItem('userName', name);
        
        this.coverPage.style.display = 'none';
        this.mainApp.style.display = 'block';
    }

    async generateLesson() {
        const topic = this.topicInput.value.trim();
        if (!topic) {
            alert('Please enter a topic to learn about!');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.renderLessonPlan(data);
        } catch (error) {
            console.error('Error:', error);
            alert('Sorry, there was an error generating your lesson. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.generateBtn.disabled = true;
        this.generateBtn.textContent = 'Generating...';
        this.loading.style.display = 'block';
        this.lessonPlan.style.display = 'none';
    }

    hideLoading() {
        this.generateBtn.disabled = false;
        this.generateBtn.textContent = 'Generate Lesson';
        this.loading.style.display = 'none';
    }

    renderLessonPlan(data) {
        this.renderConcepts(data.keyConcepts);
        this.renderAnalogies(data.analogies);
        this.renderQuiz(data.quiz);
        this.lessonPlan.style.display = 'block';
        this.lessonPlan.scrollIntoView({ behavior: 'smooth' });
    }

    renderConcepts(concepts) {
        this.conceptsDiv.innerHTML = concepts.map(concept => `
            <div class="concept">
                <h3>${concept.title}</h3>
                <p>${concept.explanation}</p>
            </div>
        `).join('');
    }

    renderAnalogies(analogies) {
        this.analogiesDiv.innerHTML = analogies.map(analogy => `
            <div class="analogy">
                <strong>${analogy.concept}:</strong> ${analogy.analogy}
            </div>
        `).join('');
    }

    renderQuiz(questions) {
        this.quizState = {};
        this.quizDiv.innerHTML = questions.map((q, index) => `
            <div class="quiz-question" data-question="${index}">
                <div class="question">${index + 1}. ${q.question}</div>
                <ul class="options">
                    ${q.options.map((option, optIndex) => `
                        <li class="option" data-option="${optIndex}" onclick="app.selectOption(${index}, ${optIndex})">
                            ${option}
                        </li>
                    `).join('')}
                </ul>
                <div class="feedback" id="feedback-${index}" style="display: none;"></div>
            </div>
        `).join('');

        // Store correct answers
        questions.forEach((q, index) => {
            this.quizState[index] = {
                correctAnswer: q.correctAnswer,
                answered: false
            };
        });

        this.resetBtn.style.display = 'block';
    }

    selectOption(questionIndex, optionIndex) {
        if (this.quizState[questionIndex].answered) return;

        const questionDiv = document.querySelector(`[data-question="${questionIndex}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const feedback = document.getElementById(`feedback-${questionIndex}`);
        
        options.forEach(opt => opt.classList.remove('selected'));
        
        options[optionIndex].classList.add('selected');
        
        const isCorrect = optionIndex === this.quizState[questionIndex].correctAnswer;
        
        setTimeout(() => {
            if (isCorrect) {
                options[optionIndex].classList.add('correct');
                feedback.innerHTML = '✅ Correct! Well done.';
                feedback.className = 'feedback correct';
            } else {
                options[optionIndex].classList.add('incorrect');
                options[this.quizState[questionIndex].correctAnswer].classList.add('correct');
                feedback.innerHTML = `❌ Incorrect. The correct answer is option ${this.quizState[questionIndex].correctAnswer + 1}.`;
                feedback.className = 'feedback incorrect';
            }
            
            feedback.style.display = 'block';
            this.quizState[questionIndex].answered = true;
        }, 300);
    }

    resetQuiz() {
        Object.keys(this.quizState).forEach(key => {
            this.quizState[key].answered = false;
        });

        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected', 'correct', 'incorrect');
        });

        document.querySelectorAll('.feedback').forEach(feedback => {
            feedback.style.display = 'none';
        });
    }
}

const app = new LearnOS();
// Finalizing client-side logic