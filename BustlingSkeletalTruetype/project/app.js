// Supabase Configuration
const SUPABASE_URL = 'https://gmbzxrjpxlmrxzctkdhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYnp4cmpweGxtcnh6Y3RrZGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNzg5NTIsImV4cCI6MjA2Njc1NDk1Mn0.F764UTFgDxaGWfdnq_KVZyHnhQm-n4Y2_sgIJQ5IVmA';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let userSettings = {
    targetLanguage: 'Spanish',
    level: 'A1',
    goals: 'general',
    theme: 'light',
    grammarColoring: true,
    autoTranslation: true,
    backtranslation: true,
    difficultyIndicator: true
};

let selectedText = '';
let contextMenu = null;

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const onboardingScreen = document.getElementById('onboarding-screen');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    
    // Check if user is already logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await loadUserSettings();
        showMainApp();
    } else {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
        if (hasCompletedOnboarding) {
            showAuthScreen();
        } else {
            showOnboardingScreen();
        }
    }
    
    hideLoadingScreen();
    setupEventListeners();
    setupTextSelection();
});

// Screen management
function hideLoadingScreen() {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1000);
}

function showOnboardingScreen() {
    onboardingScreen.classList.remove('hidden');
    authScreen.classList.add('hidden');
    mainApp.classList.add('hidden');
}

function showAuthScreen() {
    onboardingScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
}

function showMainApp() {
    onboardingScreen.classList.add('hidden');
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    
    // Update UI with user info
    if (currentUser) {
        document.getElementById('user-email').textContent = currentUser.email;
    }
    
    // Load initial data
    loadVocabulary();
    loadProgress();
    
    // Add welcome message
    addWelcomeMessage();
}

// Add welcome message with language detection
function addWelcomeMessage() {
    const welcomeMessages = {
        'Spanish': '¡Hola! Soy tu tutor de español con IA. ¿De qué te gustaría hablar hoy?',
        'French': 'Bonjour ! Je suis votre tuteur de français IA. De quoi aimeriez-vous parler aujourd\'hui ?',
        'German': 'Hallo! Ich bin Ihr KI-Deutschlehrer. Worüber möchten Sie heute sprechen?',
        'Italian': 'Ciao! Sono il tuo tutor di italiano IA. Di cosa vorresti parlare oggi?',
        'Portuguese': 'Olá! Sou seu tutor de português com IA. Sobre o que você gostaria de falar hoje?',
        'Japanese': 'こんにちは！私はあなたのAI日本語チューターです。今日は何について話したいですか？'
    };
    
    const translations = {
        'Spanish': 'Hello! I\'m your AI Spanish tutor. What would you like to talk about today?',
        'French': 'Hello! I\'m your AI French tutor. What would you like to talk about today?',
        'German': 'Hello! I\'m your AI German tutor. What would you like to talk about today?',
        'Italian': 'Hello! I\'m your AI Italian tutor. What would you like to talk about today?',
        'Portuguese': 'Hello! I\'m your AI Portuguese tutor. What would you like to talk about today?',
        'Japanese': 'Hello! I\'m your AI Japanese tutor. What would you like to talk about today?'
    };
    
    const message = welcomeMessages[userSettings.targetLanguage] || welcomeMessages['Spanish'];
    const translation = translations[userSettings.targetLanguage] || translations['Spanish'];
    
    // Update chat input placeholder
    const chatInput = document.getElementById('chat-input');
    chatInput.placeholder = `Type your message in ${userSettings.targetLanguage}...`;
    
    // Clear existing messages and add welcome message
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    addMessageToChat(message, 'ai', translation);
}

// Onboarding flow
function setupOnboarding() {
    let currentStep = 0;
    const steps = ['language-selection', 'level-selection', 'goals-selection'];
    let selectedLanguage = '';
    let selectedLevel = '';
    let selectedGoal = '';

    // Language selection
    document.querySelectorAll('.language-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.language-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLanguage = card.dataset.language;
            document.getElementById('onboarding-next').disabled = false;
        });
    });

    // Level selection
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLevel = card.dataset.level;
            document.getElementById('onboarding-next').disabled = false;
        });
    });

    // Goals selection
    document.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedGoal = card.dataset.goal;
            document.getElementById('onboarding-finish').disabled = false;
        });
    });

    // Navigation
    document.getElementById('onboarding-next').addEventListener('click', () => {
        if (currentStep === 0) {
            userSettings.targetLanguage = selectedLanguage;
            document.getElementById('language-selection').classList.add('hidden');
            document.getElementById('level-selection').classList.remove('hidden');
            document.getElementById('onboarding-back').classList.remove('hidden');
            document.getElementById('onboarding-next').disabled = true;
            currentStep = 1;
        } else if (currentStep === 1) {
            userSettings.level = selectedLevel;
            document.getElementById('level-selection').classList.add('hidden');
            document.getElementById('goals-selection').classList.remove('hidden');
            document.getElementById('onboarding-next').classList.add('hidden');
            document.getElementById('onboarding-finish').classList.remove('hidden');
            currentStep = 2;
        }
    });

    document.getElementById('onboarding-back').addEventListener('click', () => {
        if (currentStep === 1) {
            document.getElementById('level-selection').classList.add('hidden');
            document.getElementById('language-selection').classList.remove('hidden');
            document.getElementById('onboarding-back').classList.add('hidden');
            document.getElementById('onboarding-next').disabled = false;
            currentStep = 0;
        } else if (currentStep === 2) {
            document.getElementById('goals-selection').classList.add('hidden');
            document.getElementById('level-selection').classList.remove('hidden');
            document.getElementById('onboarding-next').classList.remove('hidden');
            document.getElementById('onboarding-finish').classList.add('hidden');
            document.getElementById('onboarding-next').disabled = false;
            currentStep = 1;
        }
    });

    document.getElementById('onboarding-finish').addEventListener('click', () => {
        userSettings.goals = selectedGoal;
        localStorage.setItem('onboarding-completed', 'true');
        localStorage.setItem('user-settings', JSON.stringify(userSettings));
        showAuthScreen();
    });
}

// Authentication
function setupAuth() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authButton = document.querySelector('.auth-button');

    let currentAuthMode = 'login';

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentAuthMode = tab.dataset.tab;
            
            if (currentAuthMode === 'login') {
                authButton.textContent = 'Login';
            } else if (currentAuthMode === 'signup') {
                authButton.textContent = 'Sign Up';
            }
        });
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        authButton.disabled = true;
        authButton.textContent = 'Processing...';

        try {
            let result;
            
            if (currentAuthMode === 'signup') {
                result = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                });
                
                if (result.error) throw result.error;
                
                if (result.data.user && !result.data.session) {
                    showToast('Please check your email to confirm your account', 'success');
                    return;
                }
            } else {
                result = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                
                if (result.error) throw result.error;
            }

            if (result.data.session) {
                currentUser = result.data.user;
                await saveUserSettings();
                showMainApp();
                showToast('Welcome to Languella!', 'success');
            }

        } catch (error) {
            console.error('Auth error:', error);
            showToast(error.message || 'Authentication failed', 'error');
        } finally {
            authButton.disabled = false;
            authButton.textContent = currentAuthMode === 'login' ? 'Login' : 'Sign Up';
        }
    });
}

// User settings management
async function loadUserSettings() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            userSettings = { ...userSettings, ...data.settings };
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

async function saveUserSettings() {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('user_settings')
            .upsert({
                user_id: currentUser.id,
                settings: userSettings,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving user settings:', error);
    }
}

// Text selection and context menu
function setupTextSelection() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', hideContextMenu);
}

function handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
        selectedText = text;
        showContextMenu(e.pageX, e.pageY);
    } else {
        hideContextMenu();
    }
}

function showContextMenu(x, y) {
    hideContextMenu();
    
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <button class="context-item" onclick="explainText()">
            <span>🔍</span> Explain this
        </button>
        <button class="context-item" onclick="breakDownText()">
            <span>🔧</span> Break it down
        </button>
        <button class="context-item" onclick="translateText()">
            <span>🔄</span> Translate
        </button>
        <button class="context-item" onclick="addToVocabulary()">
            <span>📚</span> Add to vocabulary
        </button>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Position the menu
    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 10;
    }
    
    if (top + rect.height > viewportHeight) {
        top = y - rect.height - 10;
    }
    
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
    
    setTimeout(() => {
        contextMenu.classList.add('show');
    }, 10);
}

function hideContextMenu() {
    if (contextMenu) {
        contextMenu.classList.remove('show');
        setTimeout(() => {
            if (contextMenu && contextMenu.parentNode) {
                contextMenu.parentNode.removeChild(contextMenu);
            }
            contextMenu = null;
        }, 150);
    }
}

// Context menu actions
async function explainText() {
    if (!selectedText) return;
    hideContextMenu();
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.post('/api/explain', {
            text: selectedText,
            targetLanguage: userSettings.targetLanguage
        }, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        showExplanationModal(selectedText, response.data.explanation);
    } catch (error) {
        console.error('Explain error:', error);
        showToast('Failed to get explanation', 'error');
    }
}

async function breakDownText() {
    if (!selectedText) return;
    hideContextMenu();
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.post('/api/explain', {
            text: selectedText,
            targetLanguage: userSettings.targetLanguage
        }, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        showExplanationModal(selectedText, response.data.explanation, 'breakdown');
    } catch (error) {
        console.error('Breakdown error:', error);
        showToast('Failed to get breakdown', 'error');
    }
}

async function translateText() {
    if (!selectedText) return;
    hideContextMenu();
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.post('/api/explain', {
            text: selectedText,
            targetLanguage: userSettings.targetLanguage
        }, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        showExplanationModal(selectedText, response.data.explanation, 'translation');
    } catch (error) {
        console.error('Translation error:', error);
        showToast('Failed to get translation', 'error');
    }
}

function addToVocabulary() {
    if (!selectedText) return;
    hideContextMenu();
    
    showAddWordModal(selectedText);
}

// Modal functions
function showExplanationModal(text, explanation, type = 'explanation') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${type === 'breakdown' ? 'Grammar Breakdown' : type === 'translation' ? 'Translation' : 'Explanation'}</h3>
                <button class="close-modal" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background: var(--bg-tertiary); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4);">
                    <strong>"${text}"</strong>
                </div>
                <div style="line-height: 1.6;">${explanation}</div>
            </div>
            <div style="margin-top: var(--space-6); display: flex; gap: var(--space-3);">
                <button class="btn btn-primary" onclick="addToVocabularyFromModal('${text}')">Add to Vocabulary</button>
                <button class="btn btn-secondary" onclick="closeModal(this)">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function showAddWordModal(word = '') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add to Vocabulary</h3>
                <button class="close-modal" onclick="closeModal(this)">&times;</button>
            </div>
            <form onsubmit="saveWordFromModal(event, this)">
                <div class="form-group">
                    <label>Word/Phrase</label>
                    <input type="text" name="word" value="${word}" required>
                </div>
                <div class="form-group">
                    <label>Translation</label>
                    <input type="text" name="translation" required>
                </div>
                <div class="form-group">
                    <label>Personal Note</label>
                    <textarea name="note" rows="3" placeholder="Add context or memory aid..."></textarea>
                </div>
                <div class="form-group">
                    <label>Tag</label>
                    <select name="tag">
                        <option value="general">General</option>
                        <option value="grammar">Grammar</option>
                        <option value="vocabulary">Vocabulary</option>
                        <option value="phrases">Phrases</option>
                        <option value="business">Business</option>
                        <option value="travel">Travel</option>
                    </select>
                </div>
                <div style="display: flex; gap: var(--space-3); margin-top: var(--space-6);">
                    <button type="submit" class="btn btn-primary">Save Word</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(element) {
    const modal = element.closest('.modal');
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

function addToVocabularyFromModal(word) {
    closeModal(event.target);
    showAddWordModal(word);
}

async function saveWordFromModal(event, form) {
    event.preventDefault();
    
    const formData = new FormData(form);
    const wordData = {
        word: formData.get('word'),
        definition: formData.get('translation'),
        example: formData.get('note'),
        targetLanguage: userSettings.targetLanguage
    };
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.post('/api/study-words', wordData, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        showToast('Word added to vocabulary!', 'success');
        closeModal(form);
        loadVocabulary(); // Refresh vocabulary list
    } catch (error) {
        console.error('Save word error:', error);
        showToast('Failed to save word', 'error');
    }
}

// Chat functionality
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    if (!currentUser) {
        showToast('Please log in to chat', 'error');
        return;
    }

    // Clear input and disable send button
    chatInput.value = '';
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Add user message to chat
    addMessageToChat(message, 'user');

    try {
        const response = await getAIResponse(message, userSettings.targetLanguage);
        addMessageToChat(response.message, 'ai', response.translation);
    } catch (error) {
        console.error('Chat error:', error);
        showToast('Failed to get AI response. Please try again.', 'error');
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'ai');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        chatInput.focus();
    }
}

async function getAIResponse(message, targetLanguage) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        throw new Error('Not authenticated');
    }

    const response = await axios.post('/api/chat', {
        message: message,
        targetLanguage: targetLanguage
    }, {
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}

function addMessageToChat(message, sender, translation = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    let messageHTML = `<div class="message-content">${applyGrammarColoring(message)}</div>`;
    
    if (translation && userSettings.autoTranslation && sender === 'ai') {
        messageHTML += `
            <div class="message-translation">
                <button class="translation-toggle">Show translation</button>
                <div class="translation-content hidden">${translation}</div>
            </div>
        `;
    }

    if (sender === 'ai') {
        messageHTML += `
            <div class="message-actions">
                <button class="action-btn" onclick="explainMessage(this)">
                    <span>🔍</span> Explain
                </button>
                <button class="action-btn" onclick="addMessageToVocab(this)">
                    <span>📚</span> Add to Vocab
                </button>
                <button class="action-btn" onclick="practiceMessage(this)">
                    <span>🎯</span> Practice
                </button>
            </div>
        `;
    }

    messageDiv.innerHTML = messageHTML;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Setup translation toggle
    const translationToggle = messageDiv.querySelector('.translation-toggle');
    if (translationToggle) {
        translationToggle.addEventListener('click', () => {
            const translationContent = messageDiv.querySelector('.translation-content');
            translationContent.classList.toggle('hidden');
            translationToggle.textContent = translationContent.classList.contains('hidden') 
                ? 'Show translation' : 'Hide translation';
        });
    }
}

function applyGrammarColoring(text) {
    if (!userSettings.grammarColoring) return text;
    
    // Simple grammar coloring - this would be enhanced with proper NLP
    const patterns = {
        'grammar-verb': /\b(is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|must|may|might|ser|estar|tener|hacer|ir|venir|ver|dar|saber|poder|querer|decir|poner|salir|volver|llegar|pasar|quedar|seguir|encontrar|llamar|trabajar|estudiar|vivir|comer|beber|hablar|escribir|leer|escuchar|mirar|comprar|vender|abrir|cerrar|empezar|terminar|gustar|encantar|parecer|conocer|entender|aprender|enseñar|ayudar|necesitar|deber|creer|pensar|sentir|dormir|despertar|levantarse|acostarse|ducharse|vestirse|desayunar|almorzar|cenar)\b/gi,
        'grammar-noun': /\b(casa|coche|perro|gato|libro|mesa|silla|agua|comida|tiempo|día|noche|año|mes|semana|hora|minuto|segundo|persona|hombre|mujer|niño|niña|familia|amigo|trabajo|escuela|universidad|hospital|tienda|restaurante|hotel|aeropuerto|estación|calle|ciudad|país|mundo|vida|muerte|amor|dinero|problema|solución|pregunta|respuesta|idea|plan|proyecto|empresa|negocio|producto|servicio|cliente|precio|calidad|cantidad|número|letra|palabra|frase|oración|párrafo|página|capítulo|libro|revista|periódico|noticia|información|dato|resultado|consecuencia|causa|razón|motivo|objetivo|meta|sueño|esperanza|miedo|preocupación|alegría|tristeza|enfado|sorpresa|interés|aburrimiento|cansancio|energía|fuerza|debilidad|salud|enfermedad|medicina|doctor|enfermera|paciente|síntoma|tratamiento|cura|prevención|ejercicio|deporte|juego|diversión|entretenimiento|música|canción|baile|arte|pintura|dibujo|fotografía|película|teatro|concierto|festival|fiesta|celebración|cumpleaños|boda|funeral|vacaciones|viaje|turismo|aventura|experiencia|recuerdo|historia|pasado|presente|futuro|cambio|diferencia|similitud|comparación|contraste|ventaja|desventaja|beneficio|riesgo|peligro|seguridad|protección|defensa|ataque|guerra|paz|conflicto|acuerdo|negociación|decisión|elección|opción|alternativa|posibilidad|oportunidad|suerte|destino|casualidad|coincidencia|sorpresa|misterio|secreto|verdad|mentira|realidad|fantasía|imaginación|creatividad|innovación|invención|descubrimiento|investigación|estudio|análisis|evaluación|juicio|opinión|creencia|fe|religión|dios|cielo|infierno|alma|espíritu|mente|cerebro|corazón|cuerpo|cabeza|cara|ojo|nariz|boca|oreja|cuello|hombro|brazo|mano|dedo|pecho|espalda|estómago|pierna|pie|piel|pelo|sangre|hueso|músculo|nervio|órgano|sistema|función|proceso|método|técnica|herramienta|instrumento|máquina|tecnología|ciencia|matemáticas|física|química|biología|medicina|psicología|sociología|economía|política|historia|geografía|literatura|filosofía|arte|música|deporte|educación|enseñanza|aprendizaje|conocimiento|sabiduría|inteligencia|talento|habilidad|capacidad|competencia|experiencia|práctica|entrenamiento|preparación|planificación|organización|gestión|administración|dirección|liderazgo|equipo|grupo|comunidad|sociedad|cultura|tradición|costumbre|hábito|rutina|horario|programa|agenda|cita|reunión|conferencia|presentación|discurso|conversación|diálogo|debate|discusión|argumento|punto|tema|asunto|cuestión|problema|dificultad|obstáculo|barrera|límite|frontera|borde|centro|medio|lado|parte|sección|área|zona|región|lugar|sitio|espacio|habitación|sala|cocina|baño|dormitorio|oficina|despacho|almacén|garaje|jardín|parque|plaza|mercado|centro|barrio|distrito|provincia|estado|nación|continente|planeta|universo|naturaleza|medio ambiente|clima|tiempo|temperatura|calor|frío|lluvia|nieve|viento|sol|luna|estrella|cielo|nube|mar|océano|río|lago|montaña|valle|bosque|árbol|planta|flor|hierba|animal|pájaro|pez|insecto|reptil|mamífero|comida|bebida|desayuno|almuerzo|cena|aperitivo|postre|fruta|verdura|carne|pescado|pollo|cerdo|ternera|cordero|arroz|pasta|pan|queso|leche|huevo|azúcar|sal|pimienta|aceite|vinagre|salsa|sopa|ensalada|sandwich|pizza|hamburguesa|patatas|tomate|cebolla|ajo|zanahoria|lechuga|pepino|pimiento|apio|brócoli|coliflor|espinacas|guisantes|judías|lentejas|garbanzos|nueces|almendras|avellanas|pistachos|manzana|naranja|plátano|pera|melocotón|albaricoque|ciruela|cereza|fresa|frambuesa|arándano|uva|limón|lima|pomelo|piña|mango|papaya|kiwi|melón|sandía|agua|zumo|café|té|leche|cerveza|vino|refresco|alcohol|medicina|pastilla|jarabe|inyección|vacuna|operación|cirugía|hospital|clínica|farmacia|médico|enfermero|dentista|psicólogo|terapeuta|paciente|enfermedad|síntoma|dolor|fiebre|tos|resfriado|gripe|alergia|infección|virus|bacteria|cáncer|diabetes|hipertensión|depresión|ansiedad|estrés|insomnio|fatiga|mareo|náusea|vómito|diarrea|estreñimiento|acidez|úlcera|gastritis|hepatitis|neumonía|bronquitis|asma|artritis|osteoporosis|fractura|herida|corte|quemadura|moratón|cicatriz|vendaje|yeso|muleta|silla de ruedas|gafas|lentillas|audífono|marcapasos|prótesis|implante|trasplante|donación|sangre|órgano|tejido|célula|gen|ADN|cromosoma|herencia|genética|evolución|selección natural|adaptación|mutación|especie|población|ecosistema|cadena alimentaria|biodiversidad|extinción|conservación|contaminación|reciclaje|energía renovable|cambio climático|calentamiento global|efecto invernadero|capa de ozono|deforestación|desertificación|erosión|sequía|inundación|terremoto|tsunami|huracán|tornado|volcán|avalancha|incendio|accidente|emergencia|rescate|bombero|policía|ambulancia|hospital|urgencias|primeros auxilios|seguridad|protección|prevención|riesgo|peligro|amenaza|violencia|crimen|robo|asesinato|violación|secuestro|terrorismo|guerra|conflicto|paz|tratado|acuerdo|negociación|diplomacia|embajada|consulado|visa|pasaporte|frontera|aduana|inmigración|emigración|refugiado|asilo|ciudadanía|nacionalidad|identidad|documento|certificado|licencia|permiso|autorización|registro|inscripción|matrícula|examen|prueba|test|evaluación|calificación|nota|aprobado|suspenso|título|diploma|certificado|carrera|profesión|trabajo|empleo|ocupación|oficio|empresa|negocio|industria|sector|mercado|economía|finanzas|banco|dinero|moneda|euro|dólar|libra|yen|yuan|peso|real|rublo|corona|franco|marco|lira|peseta|escudo|bolívar|sol|quetzal|córdoba|colón|balboa|lempira|precio|coste|gasto|ingreso|beneficio|ganancia|pérdida|deuda|préstamo|hipoteca|interés|inversión|ahorro|cuenta|tarjeta|efectivo|cheque|transferencia|pago|cobro|factura|recibo|impuesto|IVA|renta|patrimonio|herencia|testamento|seguro|pensión|jubilación|subsidio|ayuda|beca|subvención|donación|caridad|voluntariado|ONG|fundación|asociación|club|grupo|equipo|partido|sindicato|cooperativa|empresa|corporación|multinacional|startup|pyme|autónomo|freelance|empleado|trabajador|jefe|director|gerente|presidente|CEO|accionista|socio|cliente|proveedor|competidor|rival|aliado|partner|colaborador|consultor|asesor|experto|especialista|profesional|técnico|ingeniero|arquitecto|médico|abogado|profesor|maestro|educador|investigador|científico|artista|músico|actor|escritor|periodista|fotógrafo|diseñador|programador|desarrollador|analista|contable|economista|psicólogo|sociólogo|antropólogo|historiador|geógrafo|biólogo|químico|físico|matemático|estadístico|filósofo|teólogo|político|diplomático|militar|policía|bombero|enfermero|farmacéutico|veterinario|dentista|fisioterapeuta|nutricionista|chef|cocinero|camarero|recepcionista|secretario|administrativo|vendedor|comercial|marketing|publicidad|relaciones públicas|comunicación|periodismo|medios|prensa|radio|televisión|internet|web|blog|redes sociales|Facebook|Twitter|Instagram|LinkedIn|YouTube|Google|Amazon|Apple|Microsoft|Samsung|Sony|Nike|Adidas|Coca-Cola|McDonald's|Starbucks|IKEA|Zara|H&M|Toyota|BMW|Mercedes|Ferrari|Rolex|Chanel|Louis Vuitton|Gucci|Prada|Armani|Versace|Dolce & Gabbana|Calvin Klein|Ralph Lauren|Tommy Hilfiger|Levi's|Gap|Uniqlo|Mango|Bershka|Pull & Bear|Massimo Dutti|Oysho|Lefties|Stradivarius|Uterqüe|Cos|Arket|Weekday|Monki|& Other Stories|Acne Studios|Ganni|Samsøe Samsøe|Wood Wood|Norse Projects|A.P.C.|Isabel Marant|Ganni|Baum und Pferdgarten|Stine Goya|Rotate|Remain|Gestuz|Moss Copenhagen|Modström|Vero Moda|Only|Pieces|Selected|Jack & Jones|Name It|Vila|Object|Noisy May|Aware by Vero Moda|Mamalicious|Junarose|Y.A.S|Ichi|Kaffe|Cream|Fransa|Soaked in Luxury|Saint Tropez|Culture|Nümph|B.Young|Pulz Jeans|Denim Hunter|Dranella|Zizzi|Persona by Marina Rinaldi|Max Mara|Weekend Max Mara|Sportmax|Marni|Jil Sander|Bottega Veneta|Celine|Hermès|Dior|Saint Laurent|Balenciaga|Givenchy|Valentino|Fendi|Loewe|Burberry|Stella McCartney|Alexander McQueen|Tom Ford|Marc Jacobs|Michael Kors|Kate Spade|Coach|Tory Burch|Rebecca Minkoff|Mansur Gavriel|Staud|Cult Gaia|Jacquemus|Ganni|Baum und Pferdgarten|Stine Goya|Rotate|Remain|Gestuz|Moss Copenhagen|Modström)\b/gi,
        'grammar-adjective': /\b(bueno|malo|grande|pequeño|nuevo|viejo|joven|mayor|alto|bajo|largo|corto|ancho|estrecho|grueso|delgado|gordo|flaco|fuerte|débil|rápido|lento|fácil|difícil|simple|complicado|claro|oscuro|brillante|opaco|limpio|sucio|seco|húmedo|caliente|frío|dulce|amargo|salado|ácido|picante|suave|duro|blando|áspero|liso|rugoso|pesado|ligero|denso|fino|espeso|líquido|sólido|gaseoso|transparente|opaco|visible|invisible|audible|silencioso|ruidoso|musical|melódico|armónico|disonante|agudo|grave|alto|bajo|fuerte|débil|intenso|suave|brillante|mate|colorido|monocromático|vivo|apagado|saturado|desaturado|cálido|frío|neutro|primario|secundario|complementario|análogo|triádico|tetrádico|monocromático|acromático|cromático|iridiscente|metálico|perlado|mate|satinado|brillante|reflectante|absorbente|transparente|translúcido|opaco|cristalino|turbio|claro|nublado|despejado|cubierto|soleado|lluvioso|nevado|ventoso|calmado|tormentoso|húmedo|seco|árido|tropical|templado|frío|gélido|helado|congelado|derretido|evaporado|condensado|sublimado|ionizado|radiactivo|magnético|eléctrico|electrónico|digital|analógico|virtual|real|artificial|natural|orgánico|inorgánico|sintético|biodegradable|reciclable|renovable|sostenible|ecológico|contaminante|tóxico|venenoso|peligroso|seguro|inocuo|beneficioso|perjudicial|saludable|enfermizo|nutritivo|calórico|dietético|light|integral|refinado|procesado|crudo|cocido|asado|frito|hervido|al vapor|a la plancha|al horno|a la parrilla|ahumado|marinado|encurtido|fermentado|destilado|filtrado|purificado|contaminado|infectado|esterilizado|desinfectado|limpio|sucio|higiénico|antihigiénico|fresco|rancio|caducado|en mal estado|podrido|maduro|verde|tierno|duro|blando|jugoso|seco|crujiente|masticable|pegajoso|resbaladizo|viscoso|gelatinoso|cremoso|espumoso|burbujeante|efervescente|gaseoso|plano|liso|rugoso|texturizado|granulado|pulverizado|molido|triturado|picado|cortado|rebanado|troceado|rallado|pelado|mondado|descascarillado|deshuesado|desespinado|limpio|preparado|listo|terminado|acabado|completo|incompleto|parcial|total|entero|medio|cuarto|tercio|doble|triple|múltiple|único|singular|plural|individual|colectivo|personal|impersonal|privado|público|oficial|extraoficial|formal|informal|serio|divertido|aburrido|interesante|emocionante|tranquilo|nervioso|relajado|tenso|estresado|calmado|agitado|inquieto|paciente|impaciente|tolerante|intolerante|comprensivo|incomprensivo|empático|apático|simpático|antipático|amable|desagradable|cortés|descortés|educado|maleducado|respetuoso|irrespetuoso|considerado|desconsiderado|generoso|tacaño|egoísta|altruista|honesto|deshonesto|sincero|falso|leal|desleal|fiel|infiel|confiable|poco confiable|responsable|irresponsable|maduro|inmaduro|sensato|insensato|prudente|imprudente|cauteloso|temerario|valiente|cobarde|audaz|tímido|extrovertido|introvertido|sociable|antisocial|popular|impopular|famoso|desconocido|célebre|anónimo|importante|insignificante|relevante|irrelevante|significativo|insignificante|trascendente|intrascendente|fundamental|superficial|esencial|accesorio|necesario|innecesario|útil|inútil|práctico|impractico|funcional|disfuncional|eficaz|ineficaz|eficiente|ineficiente|productivo|improductivo|rentable|no rentable|económico|caro|barato|costoso|asequible|inasequible|accesible|inaccesible|disponible|no disponible|libre|ocupado|vacío|lleno|completo|incompleto|perfecto|imperfecto|exacto|inexacto|preciso|impreciso|correcto|incorrecto|verdadero|falso|real|irreal|auténtico|falso|genuino|imitación|original|copia|único|común|raro|frecuente|habitual|inusual|extraordinario|ordinario|especial|normal|típico|atípico|estándar|personalizado|general|específico|universal|particular|global|local|nacional|internacional|mundial|regional|provincial|municipal|urbano|rural|metropolitano|cosmopolita|pueblerino|citadino|campesino|moderno|antiguo|contemporáneo|clásico|tradicional|innovador|conservador|progresista|reaccionario|liberal|autoritario|democrático|dictatorial|libre|oprimido|independiente|dependiente|autónomo|heterónomo|soberano|subordinado|dominante|sumiso|activo|pasivo|dinámico|estático|móvil|inmóvil|flexible|rígido|adaptable|inadaptable|versátil|especializado|polivalente|monovalente|multifuncional|unifuncional|complejo|simple|complicado|sencillo|elaborado|básico|avanzado|primitivo|sofisticado|rudimentario|refinado|tosco|elegante|vulgar|distinguido|ordinario|noble|plebeyo|aristocrático|burgués|proletario|rico|pobre|adinerado|necesitado|próspero|arruinado|exitoso|fracasado|triunfante|derrotado|ganador|perdedor|vencedor|vencido|superior|inferior|mejor|peor|óptimo|pésimo|excelente|terrible|magnífico|horrible|maravilloso|espantoso|fantástico|fatal|genial|desastroso|perfecto|defectuoso|impecable|deficiente|sobresaliente|insuficiente|notable|mediocre|bueno|malo|regular|irregular|constante|inconstante|estable|inestable|fijo|variable|permanente|temporal|duradero|efímero|eterno|mortal|inmortal|infinito|finito|ilimitado|limitado|absoluto|relativo|total|parcial|completo|incompleto|entero|fragmentado|íntegro|roto|sano|enfermo|saludable|patológico|normal|anormal|típico|atípico|común|raro|frecuente|infrecuente|habitual|inusual|regular|irregular|sistemático|caótico|ordenado|desordenado|organizado|desorganizado|metódico|asistemático|planificado|improvisado|preparado|improvisado|listo|no preparado|dispuesto|reacio|motivado|desmotivado|entusiasta|apático|optimista|pesimista|positivo|negativo|constructivo|destructivo|creativo|destructivo|imaginativo|prosaico|artístico|prosaico|estético|antiestético|bello|feo|hermoso|horrible|atractivo|repulsivo|encantador|repugnante|seductor|repelente|fascinante|aburrido|cautivador|tedioso|hipnotizante|soporífero|estimulante|deprimente|inspirador|desalentador|motivador|desmotivador|alentador|descorazonador|esperanzador|desesperanzador|prometedor|desalentador|halagüeño|sombrío|brillante|opaco|luminoso|tenebroso|radiante|lúgubre|resplandeciente|siniestro|deslumbrante|tétrico|cegador|oscuro|iluminado|sombrío|claro|turbio|transparente|opaco|cristalino|empañado|nítido|borroso|definido|difuso|enfocado|desenfocado|visible|invisible|evidente|oculto|manifiesto|latente|patente|encubierto|obvio|sutil|claro|ambiguo|explícito|implícito|directo|indirecto|franco|evasivo|abierto|cerrado|sincero|hipócrita|honesto|mentiroso|veraz|falaz|fidedigno|dudoso|creíble|increíble|confiable|sospechoso|seguro|inseguro|cierto|incierto|indudable|dudoso|inequívoco|ambiguo|categórico|vago|tajante|impreciso|rotundo|vacilante|firme|débil|sólido|frágil|resistente|delicado|robusto|endeble|fuerte|débil|poderoso|impotente|potente|ineficaz|eficaz|inútil|capaz|incapaz|hábil|torpe|diestro|patoso|experto|novato|experimentado|inexperto|veterano|principiante|profesional|amateur|cualificado|no cualificado|competente|incompetente|eficiente|ineficiente|productivo|improductivo|trabajador|perezoso|laborioso|holgazán|diligente|negligente|cuidadoso|descuidado|meticuloso|chapucero|minucioso|superficial|detallista|general|específico|concreto|abstracto|particular|universal|individual|colectivo|personal|impersonal|íntimo|público|privado|oficial|confidencial|secreto|reservado|abierto|cerrado|accesible|inaccesible|disponible|ocupado|libre|cautivo|independiente|dependiente|autónomo|subordinado|soberano|vasallo|dominante|sumiso|superior|inferior|alto|bajo|elevado|hundido|encumbrado|humilde|exaltado|rebajado|enaltecido|degradado|prestigioso|desprestigiado|respetado|despreciado|admirado|aborrecido|querido|odiado|amado|detestado|apreciado|menospreciado|valorado|desvalorizado|estimado|subestimado|reconocido|ignorado|celebrado|olvidado|famoso|desconocido|célebre|anónimo|ilustre|oscuro|notable|insignificante|destacado|mediocre|sobresaliente|vulgar|excepcional|corriente|extraordinario|ordinario|singular|plural|único|múltiple|solo|acompañado|solitario|gregario|aislado|integrado|separado|unido|dividido|fragmentado|cohesionado|disperso|concentrado|esparcido|reunido|disgregado|agrupado|individualizado|colectivizado|socializado|privatizado|nacionalizado|internacionalizado|globalizado|localizado|centralizado|descentralizado|unificado|diversificado|homogeneizado|heterogeneizado|estandarizado|personalizado|masificado|individualizado|industrializado|artesanal|mecanizado|manual|automatizado|controlado|libre|regulado|desregulado|organizado|caótico|sistemático|asistemático|metódico|desordenado|planificado|espontáneo|estructurado|desestructurado|formal|informal|oficial|extraoficial|legal|ilegal|legítimo|ilegítimo|lícito|ilícito|permitido|prohibido|autorizado|no autorizado|aprobado|rechazado|aceptado|denegado|concedido|negado|otorgado|retirado|dado|quitado|entregado|recibido|enviado|devuelto|prestado|pedido|ofrecido|solicitado|demandado|exigido|requerido|necesitado|deseado|querido|buscado|encontrado|perdido|hallado|descubierto|inventado|creado|destruido|construido|demolido|edificado|derribado|levantado|caído|erguido|tumbado|de pie|sentado|acostado|dormido|despierto|consciente|inconsciente|atento|distraído|concentrado|disperso|enfocado|desenfocado|alerta|despistado|vigilante|descuidado|observador|ciego|vidente|sordo|oyente|mudo|hablador|callado|silencioso|ruidoso|bullicioso|tranquilo|agitado|calmado|nervioso|relajado|tenso|suelto|apretado|flojo|tirante|laxo|estricto|permisivo|tolerante|intolerante|flexible|rígido|blando|duro|suave|áspero|liso|rugoso|pulido|tosco|refinado|burdo|delicado|brusco|gentil|violento|pacífico|agresivo|manso|feroz|salvaje|doméstico|silvestre|cultivado|natural|artificial|sintético|orgánico|inorgánico|vivo|muerto|animado|inanimado|dinámico|estático|activo|inactivo|móvil|inmóvil|ágil|torpe|rápido|lento|veloz|pausado|acelerado|frenado|urgente|pausado|inmediato|tardío|puntual|impuntual|temprano|tarde|prematuro|tardío|adelantado|atrasado|avanzado|retrasado|progresivo|regresivo|evolutivo|involutivo|desarrollado|subdesarrollado|creciente|decreciente|ascendente|descendente|subiendo|bajando|mejorando|empeorando|progresando|retrocediendo|avanzando|retrasando|acelerando|frenando|aumentando|disminuyendo|creciendo|menguando|expandiendo|contrayendo|ampliando|reduciendo|extendiendo|acortando|alargando|encogiendo|estirando|comprimiendo|inflando|desinflando|hinchando|deshinchando|llenando|vaciando|cargando|descargando|ocupando|liberando|tomando|dejando|cogiendo|soltando|agarrando|liberando|sujetando|aflojando|apretando|aflojando|cerrando|abriendo|bloqueando|desbloqueando|obstruyendo|despejando|tapando|destapando|cubriendo|descubriendo|ocultando|revelando|escondiendo|mostrando|exhibiendo|disimulando|manifestando|encubriendo|expresando|callando|comunicando|silenciando|transmitiendo|interrumpiendo|conectando|desconectando|uniendo|separando|juntando|apartando|acercando|alejando|aproximando|distanciando|atrayendo|repeliendo|magnetizando|desmagnetizando|cargando|descargando|energizando|agotando|fortaleciendo|debilitando|potenciando|limitando|capacitando|incapacitando|habilitando|inhabilitando|permitiendo|impidiendo|facilitando|dificultando|simplificando|complicando|clarificando|confundiendo|iluminando|oscureciendo|aclarando|enturbiando|purificando|contaminando|limpiando|ensuciando|ordenando|desordenando|organizando|desorganizando|estructurando|desestructurando|construyendo|destruyendo|creando|eliminando|produciendo|consumiendo|generando|gastando|ahorrando|desperdiciando|conservando|malgastando|preservando|deteriorando|manteniendo|descuidando|cuidando|abandonando|protegiendo|atacando|defendiendo|agrediendo|amparando|amenazando|tranquilizando|inquietando|calmando|alterando|sosegando|perturbando|pacificando|agitando|serenando|excitando|relajando|estimulando|sedando|activando|desactivando|encendiendo|apagando|prendiendo|extinguiendo|iniciando|terminando|empezando|acabando|comenzando|finalizando|arrancando|parando|partiendo|llegando|saliendo|entrando|yendo|viniendo|marchando|quedando|permaneciendo|cambiando|manteniéndose|transformándose|conservándose|evolucionando|involucionando|desarrollándose|retrocediendo|creciendo|decreciendo|madurando|envejeciendo|rejuveneciendo|naciendo|muriendo|viviendo|existiendo|siendo|estando|teniendo|haciendo|diciendo|viendo|oyendo|sintiendo|pensando|creyendo|sabiendo|conociendo|ignorando|aprendiendo|enseñando|estudiando|investigando|descubriendo|inventando|creando|imaginando|soñando|recordando|olvidando|memorizing|amnesiando|reconociendo|desconociendo|identificando|confundiendo|distinguiendo|mezclando|separando|clasificando|categorizing|agrupando|dispersando|reuniendo|dividiendo|multiplicando|sumando|restando|calculando|contando|midiendo|pesando|comparando|contrastando|igualando|diferenciando|asemejando|distinguiendo|pareciendo|diferiendo|coincidiendo|discrepando|concordando|discordando|armonizando|desentonando|sincronizando|desincronizando|coordinando|descoordinando|colaborando|compitiendo|cooperando|rivalizando|ayudando|obstaculizando|apoyando|oponiendo|favoreciendo|perjudicando|beneficiando|dañando|curando|enfermando|sanando|infectando|inmunizando|contagiando|previniendo|causando|evitando|provocando|impidiendo|permitiendo|prohibiendo|autorizando|denegando|concediendo|rechazando|aceptando|negando|afirmando|confirmando|desmentiendo|ratificando|rectificando|corrigiendo|equivocando|acertando|errando|triunfando|fracasando|ganando|perdiendo|venciendo|derrotando|superando|sucumbiendo|resistiendo|cediendo|insistiendo|desistiendo|persistiendo|abandonando|continuando|interrumpiendo|prosiguiendo|pausando|reanudando|suspendiendo|retomando|aplazando|adelantando|atrasando|posponer|anticipar|predecir|pronosticar|adivinar|suponer|presumir|imaginar|fantasear|soñar|desear|querer|necesitar|requerir|exigir|demandar|solicitar|pedir|rogar|suplicar|implorar|ordenar|mandar|comandar|dirigir|guiar|liderar|seguir|obedecer|desobedecer|cumplir|incumplir|respetar|irrespetar|honrar|deshonrar|valorar|despreciar|apreciar|menospreciar|estimar|subestimar|admirar|aborrecer|amar|odiar|querer|detestar|adorar|despreciar|venerar|vilipendiar|idolatrar|execrar|reverenciar|blasfemar|bendecir|maldecir|alabar|criticar|elogiar|censurar|felicitar|reprochar|congratular|recriminar|aplaudir|abuchear|ovacionar|silbar|vitorear|protestar|celebrar|lamentar|festejar|llorar|reír|sonreír|fruncir|gesticular|expresar|comunicar|transmitir|informar|notificar|avisar|advertir|alertar|prevenir|anunciar|proclamar|declarar|manifestar|revelar|confesar|admitir|negar|ocultar|esconder|disimular|fingir|simular|aparentar|parecer|mostrar|exhibir|lucir|ostentar|presumir|alardear|fanfarronear|jactarse|vanagloriarse|enorgullecerse|avergonzarse|sonrojarse|ruborizarse|palidecer|enrojecer|amarillear|verdear|azulear|blanquear|ennegrecer|oscurecer|aclarar|iluminar|alumbrar|encender|prender|avivar|atizar|soplar|exhalar|inhalar|respirar|suspirar|jadear|resollar|bufar|silbar|gritar|chillar|vociferar|bramar|rugir|aullar|ladrar|maullar|piar|cantar|tararear|murmurar|susurrar|cuchichear|balbucear|tartamudear|pronunciar|articular|vocalizar|entonar|modular|afinar|desafinar|tocar|interpretar|ejecutar|representar|actuar|dramatizar|teatralizar|escenificar|personificar|encarnar|simbolizar|representar|significar|denotar|connotar|implicar|sugerir|insinuar|aludir|referirse|mencionar|citar|nombrar|denominar|titular|llamar|apodar|motejar|etiquetar|clasificar|catalogar|registrar|anotar|apuntar|escribir|redactar|componer|crear|inventar|idear|concebir|gestar|engendrar|procrear|reproducir|multiplicar|propagar|difundir|extender|expandir|ampliar|agrandar|aumentar|incrementar|acrecentar|elevar|subir|alzar|levantar|izar|erguir|enderezar|incorporar|sentar|acostar|tumbar|echar|tender|extender|estirar|alargar|prolongar|continuar|proseguir|seguir|perseguir|acosar|hostigar|molestar|fastidiar|importunar|incomodar|disturbar|perturbar|alterar|modificar|cambiar|transformar|convertir|mudar|variar|diversificar|uniformar|igualar|nivelar|equilibrar|balancear|compensar|contrarrestar|neutralizar|anular|cancelar|suspender|interrumpir|cortar|seccionar|dividir|partir|romper|quebrar|fracturar|agrietar|resquebrajar|hendir|rajar|desgarrar|rasgar|despedazar|destrozar|demoler|derribar|tumbar|abatir|derrocar|destronar|deponer|destituir|cesar|dimitir|renunciar|abandonar|dejar|soltar|liberar|emancipar|independizar|autonomizar|someter|subyugar|dominar|controlar|gobernar|regir|dirigir|administrar|gestionar|manejar|manipular|influir|persuadir|convencer|disuadir|desalentar|animar|alentar|estimular|motivar|inspirar|desanimar|desmoralizar|deprimir|entristecer|alegrar|contentar|satisfacer|complacer|agradar|gustar|encantar|fascinar|cautivar|seducir|atraer|repeler|rechazar|despreciar|desdeñar|menospreciar|subestimar|sobrestimar|exagerar|minimizar|maximizar|optimizar|perfeccionar|mejorar|empeorar|deteriorar|estropear|dañar|perjudicar|beneficiar|favorecer|privilegiar|discriminar|marginar|excluir|incluir|integrar|incorporar|añadir|agregar|sumar|restar|quitar|eliminar|suprimir|borrar|tachar|cancelar|anular|invalidar|desautorizar|autorizar|permitir|conceder|otorgar|dar|entregar|proporcionar|suministrar|proveer|abastecer|surtir|dotar|equipar|pertrechar|armar|desarmar|montar|desmontar|ensamblar|desensamblar|construir|edificar|erigir|levantar|alzar|izar|subir|bajar|descender|caer|precipitar|desplomar|hundir|sumergir|zambullir|bucear|nadar|flotar|navegar|volar|planear|aterrizar|despegar|partir|llegar|venir|ir|volver|regresar|retornar|marcharse|irse|salir|entrar|penetrar|introducir|insertar|meter|sacar|extraer|retirar|quitar|poner|colocar|situar|ubicar|localizar|encontrar|hallar|descubrir|topar|tropezar|chocar|golpear|pegar|dar|recibir|tomar|coger|agarrar|asir|sujetar|sostener|mantener|conservar|guardar|almacenar|depositar|ahorrar|gastar|consumir|devorar|comer|beber|tragar|masticar|morder|lamer|chupar|sorber|aspirar|inhalar|exhalar|soplar|silbar|tocar|palpar|sentir|notar|percibir|captar|detectar|descubrir|observar|mirar|ver|contemplar|admirar|examinar|inspeccionar|revisar|comprobar|verificar|confirmar|ratificar|validar|aprobar|rechazar|desaprobar|criticar|censurar|juzgar|evaluar|valorar|calificar|puntuar|medir|pesar|contar|calcular|computar|sumar|restar|multiplicar|dividir|resolver|solucionar|arreglar|reparar|componer|descomponer|romper|estropear|averiar|funcionar|operar|trabajar|laborar|esforzarse|luchar|pelear|combatir|guerrear|batallar|competir|rivalizar|enfrentarse|oponerse|resistir|defenderse|atacar|agredir|asaltar|invadir|conquistar|ocupar|liberar|emancipar|independizar|colonizar|civilizar|educar|enseñar|instruir|formar|capacitar|entrenar|preparar|adiestrar|domesticar|domar|amansar|calmar|tranquilizar|sosegar|apaciguar|pacificar|reconciliar|mediar|arbitrar|negociar|acordar|pactar|convenir|concertar|organizar|planificar|programar|proyectar|diseñar|trazar|dibujar|pintar|colorear|teñir|manchar|ensuciar|limpiar|lavar|fregar|barrer|aspirar|sacudir|quitar el polvo|ordenar|arreglar|colocar|organizar|clasificar|separar|dividir|repartir|distribuir|compartir|partir|cortar|trocear|picar|rallar|moler|triturar|machacar|aplastar|prensar|comprimir|apretar|aflojar|soltar|liberar|desatar|atar|amarrar|sujetar|fijar|clavar|atornillar|desenroscar|abrir|cerrar|tapar|destapar|cubrir|descubrir|ocultar|mostrar|enseñar|exhibir|exponer|presentar|introducir|representar|interpretar|traducir|explicar|aclarar|clarificar|confundir|liar|enredar|complicar|simplificar|facilitar|dificultar|obstaculizar|impedir|bloquear|desbloquear|liberar|soltar|atrapar|capturar|cazar|pescar|recoger|recolectar|cosechar|sembrar|plantar|cultivar|regar|podar|cortar|talar|arrancar|desarraigar|trasplantar|injertar|crecer|desarrollarse|madurar|florecer|fructificar|germinar|brotar|nacer|morir|fallecer|perecer|expirar|agonizar|sufrir|padecer|doler|lastimar|herir|lesionar|dañar|perjudicar|beneficiar|ayudar|auxiliar|socorrer|rescatar|salvar|proteger|defender|amparar|cobijar|refugiar|albergar|hospedar|alojar|acoger|recibir|admitir|aceptar|rechazar|negar|denegar|prohibir|impedir|evitar|prevenir|precaver|cuidar|atender|asistir|servir|trabajar|funcionar|operar|manejar|conducir|guiar|dirigir|liderar|mandar|ordenar|disponer|arreglar|organizar|preparar|alistar|equipar|proveer|suministrar|abastecer|surtir|dotar|dar|otorgar|conceder|permitir|autorizar|habilitar|capacitar|facultar|empoderar|fortalecer|debilitar|flaquear|desfallecer|desmayar|desvanecerse|marearse|aturdirse|confundirse|desorientarse|perderse|extraviarse|desviarse|apartarse|alejarse|distanciarse|acercarse|aproximarse|arrimar|juntar|unir|conectar|enlazar|vincular|relacionar|asociar|combinar|mezclar|fusionar|integrar|incorporar|incluir|abarcar|comprender|entender|captar|asimilar|absorber|aprender|estudiar|investigar|indagar|averiguar|descubrir|explorar|examinar|analizar|evaluar|valorar|juzgar|opinar|creer|pensar|reflexionar|meditar|considerar|contemplar|imaginar|fantasear|soñar|desear|querer|necesitar|requerir|precisar|faltar|sobrar|bastar|alcanzar|llegar|conseguir|lograr|obtener|adquirir|comprar|vender|intercambiar|trocar|cambiar|sustituir|reemplazar|renovar|actualizar|modernizar|reformar|transformar|convertir|adaptar|ajustar|acomodar|instalar|montar|ensamblar|armar|construir|edificar|fabricar|manufacturar|producir|crear|generar|originar|causar|provocar|ocasionar|motivar|impulsar|empujar|tirar|jalar|arrastrar|llevar|traer|transportar|trasladar|mover|desplazar|cambiar de lugar|reubicar|situar|colocar|poner|depositar|dejar|abandonar|olvidar|recordar|memorizar|aprender de memoria|retener|conservar|mantener|preservar|cuidar|proteger|guardar|vigilar|observar|mirar|contemplar|admirar|apreciar|valorar|estimar|querer|amar|adorar|idolatrar|venerar|respetar|honrar|reverenciar|acatar|obedecer|cumplir|realizar|efectuar|ejecutar|llevar a cabo|desarrollar|desempeñar|ejercer|practicar|entrenar|ensayar|repetir|repasar|revisar|repasar|estudiar|aprender|enseñar|instruir|educar|formar|capacitar|preparar|entrenar|adiestrar|guiar|orientar|dirigir|conducir|liderar|mandar|gobernar|regir|administrar|gestionar|manejar|controlar|dominar|someter|subyugar|oprimir|liberar|emancipar|independizar|autonomizar|democratizar|socializar|nacionalizar|privatizar|comercializar|industrializar|modernizar|desarrollar|progresar|avanzar|evolucionar|crecer|expandirse|extenderse|propagarse|difundirse|esparcirse|dispersarse|distribuirse|repartirse|dividirse|separarse|apartarse|alejarse|distanciarse|acercarse|aproximarse|juntarse|unirse|conectarse|enlazarse|vincularse|relacionarse|asociarse|aliarse|confederarse|coaligarse|colaborar|cooperar|trabajar juntos|ayudarse mutuamente|apoyarse|respaldarse|secundarse|acompañarse|seguirse|perseguirse|acosarse|hostigarse|molestarse|fastidiarse|importunarse|incomodarse|disturbar|perturbar|alterar|modificar|cambiar|transformar|convertir|mudar|variar|diversificar|uniformar|igualar|nivelar|equilibrar|balancear|compensar|contrarrestar|neutralizar|anular|cancelar|suspender|interrumpir|cortar|parar|detener|frenar|acelerar|apresurar|apurar|urgir|presionar|forzar|obligar|compeler|coaccionar|intimidar|amenazar|asustar|atemorizar|aterrorizar|espantar|ahuyentar|alejar|repeler|rechazar|despreciar|desdeñar|menospreciar|subestimar|infravalorar|sobrestimar|sobrevalorar|exagerar|magnificar|amplificar|aumentar|incrementar|acrecentar|elevar|subir|alzar|levantar|izar|erguir|enderezar|incorporar|sentar|acostar|tumbar|echar|tender|extender|estirar|alargar|prolongar|continuar|proseguir|seguir|perseguir|acosar|hostigar|molestar|fastidiar|importunar|incomodar|disturbar|perturbar|alterar|modificar|cambiar|transformar|convertir|mudar|variar|diversificar|uniformar|igualar|nivelar|equilibrar|balancear|compensar|contrarrestar|neutralizar|anular|cancelar|suspender|interrumpir|cortar|seccionar|dividir|partir|romper|quebrar|fracturar|agrietar|resquebrajar|hendir|rajar|desgarrar|rasgar|despedazar|destrozar|demoler|derribar|tumbar|abatir|derrocar|destronar|deponer|destituir|cesar|dimitir|renunciar|abandonar|dejar|soltar|liberar|emancipar|independizar|autonomizar|someter|subyugar|dominar|controlar|gobernar|regir|dirigir|administrar|gestionar|manejar|manipular|influir|persuadir|convencer|disuadir|desalentar|animar|alentar|estimular|motivar|inspirar|desanimar|desmoralizar|deprimir|entristecer|alegrar|contentar|satisfacer|complacer|agradar|gustar|encantar|fascinar|cautivar|seducir|atraer|repeler|rechazar|despreciar|desdeñar|menospreciar|subestimar|sobrestimar|exagerar|minimizar|maximizar|optimizar|perfeccionar|mejorar|empeorar|deteriorar|estropear|dañar|perjudicar|beneficiar|favorecer|privilegiar|discriminar|marginar|excluir|incluir|integrar|incorporar|añadir|agregar|sumar|restar|quitar|eliminar|suprimir|borrar|tachar|cancelar|anular|invalidar|desautorizar|autorizar|permitir|conceder|otorgar|dar|entregar|proporcionar|suministrar|proveer|abastecer|surtir|dotar|equipar|pertrechar|armar|desarmar|montar|desmontar|ensamblar|desensamblar|construir|edificar|erigir|levantar|alzar|izar|subir|bajar|descender|caer|precipitar|desplomar|hundir|sumergir|zambullir|bucear|nadar|flotar|navegar|volar|planear|aterrizar|despegar|partir|llegar|venir|ir|volver|regresar|retornar|marcharse|irse|salir|entrar|penetrar|introducir|insertar|meter|sacar|extraer|retirar|quitar|poner|colocar|situar|ubicar|localizar|encontrar|hallar|descubrir|topar|tropezar|chocar|golpear|pegar|dar|recibir|tomar|coger|agarrar|asir|sujetar|sostener|mantener|conservar|guardar|almacenar|depositar|ahorrar|gastar|consumir|devorar|comer|beber|tragar|masticar|morder|lamer|chupar|sorber|aspirar|inhalar|exhalar|soplar|silbar|tocar|palpar|sentir|notar|percibir|captar|detectar|descubrir|observar|mirar|ver|contemplar|admirar|examinar|inspeccionar|revisar|comprobar|verificar|confirmar|ratificar|validar|aprobar|rechazar|desaprobar|criticar|censurar|juzgar|evaluar|valorar|calificar|puntuar|medir|pesar|contar|calcular|computar|sumar|restar|multiplicar|dividir|resolver|solucionar|arreglar|reparar|componer|descomponer|romper|estropear|averiar|funcionar|operar|trabajar|laborar|esforzarse|luchar|pelear|combatir|guerrear|batallar|competir|rivalizar|enfrentarse|oponerse|resistir|defenderse|atacar|agredir|asaltar|invadir|conquistar|ocupar|liberar|emancipar|independizar|colonizar|civilizar|educar|enseñar|instruir|formar|capacitar|entrenar|preparar|adiestrar|domesticar|domar|amansar|calmar|tranquilizar|sosegar|apaciguar|pacificar|reconciliar|mediar|arbitrar|negociar|acordar|pactar|convenir|concertar|organizar|planificar|programar|proyectar|diseñar|trazar|dibujar|pintar|colorear|teñir|manchar|ensuciar|limpiar|lavar|fregar|barrer|aspirar|sacudir|quitar el polvo|ordenar|arreglar|colocar|organizar|clasificar|separar|dividir|repartir|distribuir|compartir|partir|cortar|trocear|picar|rallar|moler|triturar|machacar|aplastar|prensar|comprimir|apretar|aflojar|soltar|liberar|desatar|atar|amarrar|sujetar|fijar|clavar|atornillar|desenroscar|abrir|cerrar|tapar|destapar|cubrir|descubrir|ocultar|mostrar|enseñar|exhibir|exponer|presentar|introducir|representar|interpretar|traducir|explicar|aclarar|clarificar|confundir|liar|enredar|complicar|simplificar|facilitar|dificultar|obstaculizar|impedir|bloquear|desbloquear|liberar|soltar|atrapar|capturar|cazar|pescar|recoger|recolectar|cosechar|sembrar|plantar|cultivar|regar|podar|cortar|talar|arrancar|desarraigar|trasplantar|injertar|crecer|desarrollarse|madurar|florecer|fructificar|germinar|brotar|nacer|morir|fallecer|perecer|expirar|agonizar|sufrir|padecer|doler|lastimar|herir|lesionar|dañar|perjudicar|beneficiar|ayudar|auxiliar|socorrer|rescatar|salvar|proteger|defender|amparar|cobijar|refugiar|albergar|hospedar|alojar|acoger|recibir|admitir|aceptar|rechazar|negar|denegar|prohibir|impedir|evitar|prevenir|precaver|cuidar|atender|asistir|servir|trabajar|funcionar|operar|manejar|conducir|guiar|dirigir|liderar|mandar|ordenar|disponer|arreglar|organizar|preparar|alistar|equipar|proveer|suministrar|abastecer|surtir|dotar|dar|otorgar|conceder|permitir|autorizar|habilitar|capacitar|facultar|empoderar|fortalecer|debilitar|flaquear|desfallecer|desmayar|desvanecerse|marearse|aturdirse|confundirse|desorientarse|perderse|extraviarse|desviarse|apartarse|alejarse|distanciarse|acercarse|aproximarse|arrimar|juntar|unir|conectar|enlazar|vincular|relacionar|asociar|combinar|mezclar|fusionar|integrar|incorporar|incluir|abarcar|comprender|entender|captar|asimilar|absorber|aprender|estudiar|investigar|indagar|averiguar|descubrir|explorar|examinar|analizar|evaluar|valorar|juzgar|opinar|creer|pensar|reflexionar|meditar|considerar|contemplar|imaginar|fantasear|soñar|desear|querer|necesitar|requerir|precisar|faltar|sobrar|bastar|alcanzar|llegar|conseguir|lograr|obtener|adquirir|comprar|vender|intercambiar|trocar|cambiar|sustituir|reemplazar|renovar|actualizar|modernizar|reformar|transformar|convertir|adaptar|ajustar|acomodar|instalar|montar|ensamblar|armar|construir|edificar|fabricar|manufacturar|producir|crear|generar|originar|causar|provocar|ocasionar|motivar|impulsar|empujar|tirar|jalar|arrastrar|llevar|traer|transportar|trasladar|mover|desplazar|cambiar de lugar|reubicar|situar|colocar|poner|depositar|dejar|abandonar|olvidar|recordar|memorizar|aprender de memoria|retener|conservar|mantener|preservar|cuidar|proteger|guardar|vigilar|observar|mirar|contemplar|admirar|apreciar|valorar|estimar|querer|amar|adorar|idolatrar|venerar|respetar|honrar|reverenciar|acatar|obedecer|cumplir|realizar|efectuar|ejecutar|llevar a cabo|desarrollar|desempeñar|ejercer|practicar|entrenar|ensayar|repetir|repasar|revisar|repasar|estudiar|aprender|enseñar|instruir|educar|formar|capacitar|preparar|entrenar|adiestrar|guiar|orientar|dirigir|conducir|liderar|mandar|gobernar|regir|administrar|gestionar|manejar|controlar|dominar|someter|subyugar|oprimir|liberar|emancipar|independizar|autonomizar|democratizar|socializar|nacionalizar|privatizar|comercializar|industrializar|modernizar|desarrollar|progresar|avanzar|evolucionar|crecer|expandirse|extenderse|propagarse|difundirse|esparcirse|dispersarse|distribuirse|repartirse|dividirse|separarse|apartarse|alejarse|distanciarse|acercarse|aproximarse|juntarse|unirse|conectarse|enlazarse|vincularse|relacionarse|asociarse|aliarse|confederarse|coaligarse|colaborar|cooperar|trabajar juntos|ayudarse mutuamente|apoyarse|respaldarse|secundarse|acompañarse|seguirse|perseguirse|acosarse|hostigarse|molestarse|fastidiarse|importunarse|incomodarse|disturbar|perturbar|alterar|modificar|cambiar|transformar|convertir|mudar|variar|diversificar|uniformar|igualar|nivelar|equilibrar|balancear|compensar|contrarrestar|neutralizar|anular|cancelar|suspender|interrumpir|cortar|parar|detener|frenar|acelerar|apresurar|apurar|urgir|presionar|forzar|obligar|compeler|coaccionar|intimidar|amenazar|asustar|atemorizar|aterrorizar|espantar|ahuyentar|alejar|repeler|rechazar|despreciar|desdeñar|menospreciar|subestimar|infravalorar|sobrestimar|sob)\b/gi
    };

    let coloredText = text;
    
    Object.entries(patterns).forEach(([className, pattern]) => {
        coloredText = coloredText.replace(pattern, `<span class="${className}">$&</span>`);
    });
    
    return coloredText;
}

// Message action functions
function explainMessage(button) {
    const messageContent = button.closest('.message').querySelector('.message-content').textContent;
    explainText(messageContent);
}

function addMessageToVocab(button) {
    const messageContent = button.closest('.message').querySelector('.message-content').textContent;
    showAddWordModal(messageContent);
}

function practiceMessage(button) {
    const messageContent = button.closest('.message').querySelector('.message-content').textContent;
    showToast('Practice feature coming soon!', 'info');
}

// Vocabulary management
async function loadVocabulary() {
    if (!currentUser) return;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.get('/api/study-words', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        displayVocabulary(response.data?.words || []);
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        displayVocabulary([]);
    }
}

function displayVocabulary(words) {
    const vocabularyList = document.getElementById('vocabulary-list');
    vocabularyList.innerHTML = '';

    if (words.length === 0) {
        vocabularyList.innerHTML = '<div class="empty-state">No vocabulary words yet. Start chatting to build your collection!</div>';
        return;
    }

    words.forEach(word => {
        const wordCard = document.createElement('div');
        wordCard.className = 'vocabulary-card';
        wordCard.innerHTML = `
            <div class="word-header">
                <div class="word-main">${word.word}</div>
                <div class="word-status ${word.status || 'learning'}">${word.status || 'learning'}</div>
            </div>
            <div class="word-translation">${word.definition}</div>
            ${word.example ? `<div class="word-note">${word.example}</div>` : ''}
            <div class="word-meta">
                <span class="word-tag">${word.target_language}</span>
                <span>Added ${new Date(word.created_at).toLocaleDateString()}</span>
            </div>
            <div class="word-actions">
                <button class="word-action-btn" onclick="reviewWord('${word.id}')">Review</button>
                <button class="word-action-btn" onclick="editWord('${word.id}')">Edit</button>
                <button class="word-action-btn" onclick="deleteWord('${word.id}')">Delete</button>
            </div>
        `;
        vocabularyList.appendChild(wordCard);
    });
}

// Progress tracking
async function loadProgress() {
    if (!currentUser) return;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const response = await axios.get('/api/progress', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        updateProgressDisplay(response.data);
    } catch (error) {
        console.error('Error loading progress:', error);
        updateProgressDisplay({
            totalWords: 0,
            todayChats: 0,
            todayReviews: 0
        });
    }
}

function updateProgressDisplay(progress) {
    document.getElementById('total-words-learned').textContent = progress.totalWords || 0;
    document.getElementById('conversations-count').textContent = progress.todayChats || 0;
    document.getElementById('current-level').textContent = userSettings.level;
    document.getElementById('streak-count').textContent = '0'; // TODO: Implement streak calculation
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.dataset.view;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target view
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(`${targetView}-view`).classList.add('active');
            
            // Load data for specific views
            if (targetView === 'vocabulary') {
                loadVocabulary();
            } else if (targetView === 'progress') {
                loadProgress();
            }
        });
    });
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Event listeners setup
function setupEventListeners() {
    setupOnboarding();
    setupAuth();
    setupNavigation();
    
    // Chat input
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    chatInput.addEventListener('input', () => {
        // Auto-resize textarea
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        currentUser = null;
        showAuthScreen();
        showToast('Logged out successfully', 'success');
    });
    
    // Profile menu toggle
    document.getElementById('profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('profile-menu').classList.toggle('hidden');
    });
    
    // Close profile menu when clicking outside
    document.addEventListener('click', (e) => {
        const profileMenu = document.getElementById('profile-menu');
        const profileBtn = document.getElementById('profile-btn');
        
        if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
            profileMenu.classList.add('hidden');
        }
    });
}

// Placeholder functions for features to be implemented
function reviewWord(wordId) {
    showToast('Review feature coming soon!', 'info');
}

function editWord(wordId) {
    showToast('Edit word feature coming soon!', 'info');
}

function deleteWord(wordId) {
    showToast('Delete word feature coming soon!', 'info');
}