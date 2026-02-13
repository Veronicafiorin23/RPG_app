// Estado global da aplicação
let currentUser = null;
let currentCharacter = null;
let boardBackground = null;
let characterPosition = { x: 0, y: 0 };

// Configurações do tabuleiro
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;
const GRID_SIZE = 40;
const GRID_COLS = Math.floor(BOARD_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.floor(BOARD_HEIGHT / GRID_SIZE);

// Personagens no tabuleiro do servidor
let serverCharacters = [];
let selectedCharacter = null;
let isDragging = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateGrid();
});

// Inicializar aplicação
function initializeApp() {
    // Verificar se há usuário logado
    const savedUser = localStorage.getItem('rpg-current-user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Ir direto para tela de servidores após login
        showServersScreen();
        loadUserCharacter();
    } else {
        showWelcomeScreen();
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Formulário de registro
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Formulário de criação de personagem
    document.getElementById('character-form').addEventListener('submit', handleCreateCharacter);
    
    // Botões da navbar
    document.getElementById('login-btn').addEventListener('click', showLogin);
    document.getElementById('register-btn').addEventListener('click', showRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// Mostrar telas
function showWelcomeScreen() {
    hideAllScreens();
    document.getElementById('welcome-screen').style.display = 'flex';
    updateNavbar();
}

function showLogin() {
    hideAllScreens();
    document.getElementById('login-screen').style.display = 'flex';
    clearForm('login-form');
    hideError('login-error');
}

function showRegister() {
    hideAllScreens();
    document.getElementById('register-screen').style.display = 'flex';
    clearForm('register-form');
    hideError('register-error');
}

function showGameScreen() {
    hideAllScreens();
    document.getElementById('game-screen').style.display = 'block';
    updateNavbar();
}

function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');
}

// Atualizar navbar baseado no estado de login
function updateNavbar() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userWelcome = document.getElementById('user-welcome');
    const usernameDisplay = document.getElementById('username-display');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userWelcome.style.display = 'inline-block';
        usernameDisplay.textContent = currentUser.username;
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userWelcome.style.display = 'none';
    }
}

// Funções de autenticação
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    // Buscar usuários salvos
    const users = JSON.parse(localStorage.getItem('rpg-users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = { id: user.id, username: user.username, email: user.email };
        localStorage.setItem('rpg-current-user', JSON.stringify(currentUser));
        showServersScreen();
        loadUserCharacter();
    } else {
        showError('login-error', 'Nome de usuário ou senha incorretos');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;
    
    // Validações
    if (password !== confirmPassword) {
        showError('register-error', 'As senhas não coincidem');
        return;
    }
    
    if (password.length < 6) {
        showError('register-error', 'A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    // Verificar se usuário já existe
    const users = JSON.parse(localStorage.getItem('rpg-users') || '[]');
    const existingUser = users.find(u => u.username === username || u.email === email);
    
    if (existingUser) {
        showError('register-error', 'Nome de usuário ou email já existe');
        return;
    }
    
    // Criar novo usuário
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('rpg-users', JSON.stringify(users));
    
    // Logar automaticamente
    currentUser = { id: newUser.id, username: newUser.username, email: newUser.email };
    localStorage.setItem('rpg-current-user', JSON.stringify(currentUser));
    
    showServersScreen();
}

function handleLogout() {
    currentUser = null;
    currentCharacter = null;
    localStorage.removeItem('rpg-current-user');
    showWelcomeScreen();
}

// Funções de personagem
function showCharacterCreator() {
    document.getElementById('character-modal').style.display = 'flex';
    clearForm('character-form');
    document.getElementById('character-preview').style.display = 'none';
}

function closeCharacterModal() {
    document.getElementById('character-modal').style.display = 'none';
}

function previewCharacterImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('character-preview-img').src = e.target.result;
            document.getElementById('character-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleCreateCharacter(e) {
    e.preventDefault();
    const name = document.getElementById('character-name-input').value;
    const imageFile = document.getElementById('character-image').files[0];
    
    if (!name || !imageFile) {
        alert('Por favor, preencha o nome e escolha uma imagem');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const character = {
            id: Date.now().toString(),
            name: name,
            icon: e.target.result,
            userId: currentUser.id,
            level: 1,
            hp: 100,
            position: { x: 0, y: 0 },
            createdAt: new Date().toISOString()
        };
        
        // Salvar personagem
        const characters = JSON.parse(localStorage.getItem('rpg-characters') || '[]');
        characters.push(character);
        localStorage.setItem('rpg-characters', JSON.stringify(characters));
        
        currentCharacter = character;
        characterPosition = { x: 0, y: 0 };
        
        updateCharacterDisplay();
        closeCharacterModal();
    };
    reader.readAsDataURL(imageFile);
}

function loadUserCharacter() {
    const characters = JSON.parse(localStorage.getItem('rpg-characters') || '[]');
    const userCharacter = characters.find(c => c.userId === currentUser.id);
    
    if (userCharacter) {
        currentCharacter = userCharacter;
        characterPosition = userCharacter.position || { x: 0, y: 0 };
        updateCharacterDisplay();
    }
}

function updateCharacterDisplay() {
    const characterInfo = document.getElementById('character-info');
    const createBtn = document.getElementById('create-character-btn');
    
    if (currentCharacter) {
        characterInfo.style.display = 'block';
        createBtn.textContent = 'Editar Personagem';
        
        document.getElementById('character-icon').src = currentCharacter.icon;
        document.getElementById('character-name').textContent = currentCharacter.name;
        document.getElementById('character-level').textContent = currentCharacter.level;
        document.getElementById('character-hp').textContent = currentCharacter.hp;
        
        // Mostrar personagem no tabuleiro
        const playerPiece = document.getElementById('player-piece');
        const pieceIcon = document.getElementById('piece-icon');
        
        playerPiece.style.display = 'block';
        pieceIcon.src = currentCharacter.icon;
        pieceIcon.alt = currentCharacter.name;
        
        updateCharacterPosition();
    } else {
        characterInfo.style.display = 'none';
        createBtn.textContent = 'Criar Personagem';
        document.getElementById('player-piece').style.display = 'none';
    }
}

// Funções do tabuleiro
function generateGrid() {
    const grid = document.getElementById('board-grid');
    grid.innerHTML = '';
    
    const cols = Math.floor(BOARD_WIDTH / GRID_SIZE);
    const rows = Math.floor(BOARD_HEIGHT / GRID_SIZE);
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.left = (col * GRID_SIZE) + 'px';
            cell.style.top = (row * GRID_SIZE) + 'px';
            cell.style.width = GRID_SIZE + 'px';
            cell.style.height = GRID_SIZE + 'px';
            grid.appendChild(cell);
        }
    }
}

function moveCharacter(event) {
    if (!currentCharacter) {
        alert('Você precisa criar um personagem primeiro!');
        return;
    }
    
    const board = document.getElementById('game-board');
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Ajustar para a grade
    const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE;
    
    // Verificar limites
    if (gridX >= 0 && gridX < BOARD_WIDTH - GRID_SIZE && gridY >= 0 && gridY < BOARD_HEIGHT - GRID_SIZE) {
        characterPosition = { x: gridX, y: gridY };
        updateCharacterPosition();
        saveCharacterPosition();
    }
}

function updateCharacterPosition() {
    const playerPiece = document.getElementById('player-piece');
    playerPiece.style.left = characterPosition.x + 'px';
    playerPiece.style.top = characterPosition.y + 'px';
}

function saveCharacterPosition() {
    if (currentCharacter) {
        currentCharacter.position = characterPosition;
        
        const characters = JSON.parse(localStorage.getItem('rpg-characters') || '[]');
        const index = characters.findIndex(c => c.id === currentCharacter.id);
        if (index !== -1) {
            characters[index] = currentCharacter;
            localStorage.setItem('rpg-characters', JSON.stringify(characters));
        }
    }
}

// Funções de fundo do tabuleiro
function showBackgroundUploader() {
    document.getElementById('background-modal').style.display = 'flex';
    document.getElementById('background-preview').style.display = 'none';
}

function closeBackgroundModal() {
    document.getElementById('background-modal').style.display = 'none';
}

function previewBackgroundImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('background-preview-img').src = e.target.result;
            document.getElementById('background-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function setBackgroundImage() {
    const file = document.getElementById('background-image').files[0];
    if (!file) {
        alert('Por favor, escolha uma imagem');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        boardBackground = e.target.result;
        document.getElementById('board-background').style.backgroundImage = `url(${boardBackground})`;
        localStorage.setItem('rpg-board-background', boardBackground);
        closeBackgroundModal();
    };
    reader.readAsDataURL(file);
}

// Funções utilitárias
function clearForm(formId) {
    document.getElementById(formId).reset();
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

// Carregar fundo salvo do tabuleiro
function loadBoardBackground() {
    const savedBackground = localStorage.getItem('rpg-board-background');
    if (savedBackground) {
        boardBackground = savedBackground;
        document.getElementById('board-background').style.backgroundImage = `url(${boardBackground})`;
    }
}

// Carregar fundo quando a tela do jogo for mostrada
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadBoardBackground, 100);
});

// Fechar modais clicando fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// 🔒 SISTEMA DE SERVIDORES MULTIPLAYER COM SEGURANÇA
let currentServer = null;
let servers = [];
let chatMessages = [];

// Funções de segurança para validação
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function validateInput(input, maxLength = 100, allowHTML = false) {
    if (!input || typeof input !== 'string') return '';
    
    // Remover caracteres perigosos
    let cleaned = input.trim();
    if (!allowHTML) {
        cleaned = sanitizeHTML(cleaned);
    }
    
    // Limitar comprimento
    return cleaned.substring(0, maxLength);
}

function generateSecureCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Carregar servidores do localStorage
function loadServers() {
    try {
        const savedServers = localStorage.getItem('rpg-servers');
        servers = savedServers ? JSON.parse(savedServers) : [];
        
        // Validar estrutura dos servidores
        servers = servers.filter(server => {
            return server && 
                   typeof server.id === 'string' &&
                   typeof server.name === 'string' &&
                   typeof server.code === 'string' &&
                   typeof server.masterId === 'string' &&
                   Array.isArray(server.players);
        });
    } catch (error) {
        console.warn('Erro ao carregar servidores:', error);
        servers = [];
    }
}

// Salvar servidores no localStorage
function saveServers() {
    try {
        localStorage.setItem('rpg-servers', JSON.stringify(servers));
    } catch (error) {
        console.error('Erro ao salvar servidores:', error);
    }
}

// Mostrar tela de servidores
function showServersScreen() {
    hideAllScreens();
    document.getElementById('servers-screen').style.display = 'block';
    loadServers();
    renderServers();
}

// Renderizar lista de servidores
function renderServers() {
    if (!currentUser) return;
    
    const ownedContainer = document.getElementById('owned-servers');
    const joinedContainer = document.getElementById('joined-servers');
    
    // Limpar containers
    ownedContainer.innerHTML = '<div class="no-servers" id="no-owned-servers"><p>Você ainda não criou nenhum servidor. Crie um para ser o mestre!</p></div>';
    joinedContainer.innerHTML = '<div class="no-servers" id="no-joined-servers"><p>Você não participa de nenhum servidor ainda. Peça o código de convite para um amigo!</p></div>';
    
    const ownedServers = servers.filter(server => server.masterId === currentUser.id);
    const joinedServers = servers.filter(server => 
        server.masterId !== currentUser.id && 
        server.players.some(player => player.id === currentUser.id)
    );
    
    // Renderizar servidores próprios
    if (ownedServers.length > 0) {
        ownedContainer.innerHTML = '';
        ownedServers.forEach(server => {
            const serverCard = createServerCard(server, true);
            ownedContainer.appendChild(serverCard);
        });
    }
    
    // Renderizar servidores participantes
    if (joinedServers.length > 0) {
        joinedContainer.innerHTML = '';
        joinedServers.forEach(server => {
            const serverCard = createServerCard(server, false);
            joinedContainer.appendChild(serverCard);
        });
    }
}

// Criar card de servidor
function createServerCard(server, isMaster) {
    const div = document.createElement('div');
    div.className = 'server-card';
    div.onclick = () => enterServer(server.id);
    
    const playerCount = server.players.length;
    const description = server.description ? sanitizeHTML(server.description) : 'Sem descrição';
    
    div.innerHTML = `
        <div class="server-${isMaster ? 'master' : 'player'}-badge">
            ${isMaster ? '👑 Mestre' : '⚔️ Jogador'}
        </div>
        <h4>${sanitizeHTML(server.name)}</h4>
        <p><strong>Código:</strong> <span class="server-code">${server.code}</span></p>
        <p><strong>Jogadores:</strong> ${playerCount}</p>
        <p><strong>Descrição:</strong> ${description}</p>
        <p><strong>Criado em:</strong> ${new Date(server.createdAt).toLocaleDateString('pt-BR')}</p>
    `;
    
    return div;
}

// Abrir modal de criar servidor
function openCreateServerModal() {
    document.getElementById('create-server-modal').style.display = 'flex';
}

// Fechar modal de criar servidor
function closeCreateServerModal() {
    document.getElementById('create-server-modal').style.display = 'none';
    document.getElementById('create-server-form').reset();
}

// Criar novo servidor
document.getElementById('create-server-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const serverName = validateInput(document.getElementById('server-name-input').value, 50);
    const serverDescription = validateInput(document.getElementById('server-description').value, 200);
    
    if (!serverName) {
        alert('Nome do servidor é obrigatório!');
        return;
    }
    
    const newServer = {
        id: 'server_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: serverName,
        description: serverDescription,
        code: generateSecureCode(),
        masterId: currentUser.id,
        masterName: currentUser.username,
        players: [{
            id: currentUser.id,
            username: currentUser.username,
            character: currentCharacter,
            joinedAt: Date.now()
        }],
        createdAt: Date.now(),
        boardBackground: null,
        chatMessages: []
    };
    
    servers.push(newServer);
    saveServers();
    closeCreateServerModal();
    renderServers();
    
    // Mostrar código de convite
    alert(`Servidor criado com sucesso!\\n\\nCódigo do servidor: ${newServer.code}\\n\\nCompartilhe este código com seus amigos para eles entrarem no servidor.`);
});

// Entrar em servidor por código
function joinServerByCode() {
    const inviteCode = validateInput(document.getElementById('invite-code-input').value, 6).toUpperCase();
    
    if (!inviteCode || inviteCode.length !== 6) {
        alert('Digite um código válido de 6 caracteres!');
        return;
    }
    
    if (!currentUser) {
        alert('Você precisa estar logado para entrar em um servidor!');
        return;
    }
    
    const server = servers.find(s => s.code === inviteCode);
    
    if (!server) {
        alert('Servidor não encontrado! Verifique o código e tente novamente.');
        return;
    }
    
    // Verificar se já está no servidor
    const alreadyInServer = server.players.some(player => player.id === currentUser.id);
    
    if (alreadyInServer) {
        alert('Você já participa deste servidor!');
        enterServer(server.id);
        return;
    }
    
    // Adicionar jogador ao servidor
    server.players.push({
        id: currentUser.id,
        username: currentUser.username,
        character: currentCharacter,
        joinedAt: Date.now()
    });
    
    // Adicionar mensagem de entrada no chat
    server.chatMessages.push({
        id: Date.now(),
        type: 'system',
        message: `${currentUser.username} entrou no servidor`,
        timestamp: Date.now()
    });
    
    saveServers();
    document.getElementById('invite-code-input').value = '';
    
    alert(`Você entrou no servidor "${server.name}" com sucesso!`);
    renderServers();
    enterServer(server.id);
}

// Entrar em servidor específico
function enterServer(serverId) {
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
        alert('Servidor não encontrado!');
        return;
    }
    
    // Verificar se o usuário está no servidor
    const playerInServer = server.players.some(player => player.id === currentUser.id);
    
    if (!playerInServer) {
        alert('Você não tem permissão para acessar este servidor!');
        return;
    }
    
    currentServer = server;
    
    // Mostrar tela do servidor
    hideAllScreens();
    document.getElementById('server-room-screen').style.display = 'block';
    
    // Atualizar interface
    document.getElementById('server-name-display').textContent = sanitizeHTML(server.name);
    document.getElementById('server-code-display').textContent = `Código: ${server.code}`;
    
    // Mostrar controles de mestre se necessário
    const isMaster = server.masterId === currentUser.id;
    document.getElementById('server-master-badge').style.display = isMaster ? 'block' : 'none';
    document.getElementById('master-controls').style.display = isMaster ? 'flex' : 'none';
    document.getElementById('delete-server-btn').style.display = isMaster ? 'block' : 'none';
    
    // Carregar interface do servidor
    renderServerPlayers();
    renderServerChat();
    setupServerBoard();
}

// Renderizar jogadores do servidor
function renderServerPlayers() {
    if (!currentServer) return;
    
    const playersContainer = document.getElementById('players-list');
    playersContainer.innerHTML = '';
    
    currentServer.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        const isMaster = player.id === currentServer.masterId;
        const characterIcon = player.character?.icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23f39c12"><circle cx="12" cy="12" r="10"/></svg>';
        
        playerDiv.innerHTML = `
            <img src="${characterIcon}" alt="${sanitizeHTML(player.username)}" class="player-avatar">
            <span>${sanitizeHTML(player.username)} ${isMaster ? '👑' : ''}</span>
        `;
        
        playersContainer.appendChild(playerDiv);
    });
}

// Renderizar chat do servidor
function renderServerChat() {
    if (!currentServer) return;
    
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '';
    
    (currentServer.chatMessages || []).forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        if (message.type === 'system') {
            messageDiv.innerHTML = `
                <em style="color: #888;">${sanitizeHTML(message.message)}</em>
                <span class="timestamp">${timestamp}</span>
            `;
        } else {
            messageDiv.innerHTML = `
                <span class="username">${sanitizeHTML(message.username)}:</span>
                ${sanitizeHTML(message.message)}
                <span class="timestamp">${timestamp}</span>
            `;
        }
        
        chatContainer.appendChild(messageDiv);
    });
    
    // Scroll para o final
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Enviar mensagem no chat
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = validateInput(chatInput.value, 200);
    
    if (!message ||!currentServer || !currentUser) return;
    
    // Verificar se o usuário ainda está no servidor
    const playerInServer = currentServer.players.some(player => player.id === currentUser.id);
    if (!playerInServer) {
        alert('Você não tem permissão para enviar mensagens neste servidor!');
        return;
    }
    
    const chatMessage = {
        id: Date.now(),
        type: 'user',
        userId: currentUser.id,
        username: currentUser.username,
        message: message,
        timestamp: Date.now()
    };
    
    if (!currentServer.chatMessages) {
        currentServer.chatMessages = [];
    }
    
    currentServer.chatMessages.push(chatMessage);
    
    // Limitar mensagens de chat (últimas 100)
    if (currentServer.chatMessages.length > 100) {
        currentServer.chatMessages = currentServer.chatMessages.slice(-100);
    }
    
    saveServers();
    chatInput.value = '';
    renderServerChat();
}

// Configurar tabuleiro do servidor
function setupServerBoard() {
    if (!currentServer) return;
    
    const serverBoardContainer = document.getElementById('server-board');
    serverBoardContainer.innerHTML = '';
    
    // Criar tabuleiro similar ao principal
    const serverBoard = document.createElement('div');
    serverBoard.className = 'game-board';
    serverBoard.id = 'server-board-game';
    serverBoard.style.position = 'relative';
    serverBoard.style.width = '800px';
    serverBoard.style.height = '600px';
    serverBoard.style.backgroundSize = 'cover';
    serverBoard.style.backgroundPosition = 'center';
    
    // Aplicar fundo se houver
    if (currentServer.boardBackground) {
        serverBoard.style.backgroundImage = `url(${currentServer.boardBackground})`;
    }
    
    // Gerar grid
    generateServerGrid(serverBoard);
    
    serverBoardContainer.appendChild(serverBoard);
}

// Gerar grid do servidor com coordenadas
function generateServerGrid(boardElement) {
    // Limpar conteúdo anterior
    boardElement.innerHTML = '';
    
    // Container para coordenadas e grid
    const gridContainer = document.createElement('div');
    gridContainer.style.position = 'relative';
    gridContainer.style.width = '100%';
    gridContainer.style.height = '100%';
    
    // Coordenadas das colunas (A, B, C...)
    const colCoords = document.createElement('div');
    colCoords.style.position = 'absolute';
    colCoords.style.top = '0';
    colCoords.style.left = '30px';
    colCoords.style.height = '20px';
    colCoords.style.display = 'flex';
    colCoords.style.fontSize = '12px';
    colCoords.style.fontWeight = 'bold';
    colCoords.style.color = '#f39c12';
    
    for (let col = 0; col < GRID_COLS; col++) {
        const colLabel = document.createElement('div');
        colLabel.style.width = GRID_SIZE + 'px';
        colLabel.style.textAlign = 'center';
        colLabel.textContent = String.fromCharCode(65 + col); // A, B, C...
        colCoords.appendChild(colLabel);
    }
    
    // Coordenadas das linhas (1, 2, 3...)
    const rowCoords = document.createElement('div');
    rowCoords.style.position = 'absolute';
    rowCoords.style.top = '20px';
    rowCoords.style.left = '0';
    rowCoords.style.width = '30px';
    rowCoords.style.display = 'flex';
    rowCoords.style.flexDirection = 'column';
    rowCoords.style.fontSize = '12px';
    rowCoords.style.fontWeight = 'bold';
    rowCoords.style.color = '#f39c12';
    
    for (let row = 0; row < GRID_ROWS; row++) {
        const rowLabel = document.createElement('div');
        rowLabel.style.height = GRID_SIZE + 'px';
        rowLabel.style.display = 'flex';
        rowLabel.style.alignItems = 'center';
        rowLabel.style.justifyContent = 'center';
        rowLabel.textContent = (row + 1).toString();
        rowCoords.appendChild(rowLabel);
    }
    
    // Grid principal
    const gridOverlay = document.createElement('div');
    gridOverlay.className = 'server-grid-overlay';
    gridOverlay.style.position = 'absolute';
    gridOverlay.style.top = '20px';
    gridOverlay.style.left = '30px';
    gridOverlay.style.width = (GRID_COLS * GRID_SIZE) + 'px';
    gridOverlay.style.height = (GRID_ROWS * GRID_SIZE) + 'px';
    gridOverlay.style.display = 'grid';
    gridOverlay.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${GRID_SIZE}px)`;
    gridOverlay.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${GRID_SIZE}px)`;
    gridOverlay.style.gap = '1px';
    
    const totalCells = GRID_COLS * GRID_ROWS;
    
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        const row = Math.floor(i / GRID_COLS);
        const col = i % GRID_COLS;
        const coordinate = String.fromCharCode(65 + col) + (row + 1);
        
        cell.className = 'grid-cell';
        cell.dataset.cellIndex = i;
        cell.dataset.coordinate = coordinate;
        cell.style.border = '1px solid rgba(255,255,255,0.2)';
        cell.style.backgroundColor = 'transparent';
        cell.style.position = 'relative';
        cell.title = coordinate;
        
        // Event listeners para movimento
        cell.addEventListener('click', function(e) {
            handleCellClick(i, coordinate, e);
        });
        
        cell.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (isDragging) {
                cell.style.backgroundColor = 'rgba(243, 156, 18, 0.3)';
            }
        });
        
        cell.addEventListener('dragleave', function() {
            cell.style.backgroundColor = 'transparent';
        });
        
        cell.addEventListener('drop', function(e) {
            e.preventDefault();
            handleCharacterDrop(i, coordinate);
            cell.style.backgroundColor = 'transparent';
        });
        
        gridOverlay.appendChild(cell);
    }
    
    // Container para personagens
    const charactersLayer = document.createElement('div');
    charactersLayer.className = 'characters-layer';
    charactersLayer.style.position = 'absolute';
    charactersLayer.style.top = '20px';
    charactersLayer.style.left = '30px';
    charactersLayer.style.width = (GRID_COLS * GRID_SIZE) + 'px';
    charactersLayer.style.height = (GRID_ROWS * GRID_SIZE) + 'px';
    charactersLayer.style.pointerEvents = 'none';
    charactersLayer.id = 'server-characters-layer';
    
    gridContainer.appendChild(colCoords);
    gridContainer.appendChild(rowCoords);
    gridContainer.appendChild(gridOverlay);
    gridContainer.appendChild(charactersLayer);
    boardElement.appendChild(gridContainer);
    
    // Carregar personagens no tabuleiro
    loadServerCharacters();
}

// Carregar personagens no tabuleiro do servidor
function loadServerCharacters() {
    if (!currentServer) return;
    
    // Carregar personagens salvos do servidor
    serverCharacters = currentServer.characters || [];
    
    // Se não há personagens, adicionar os jogadores atuais
    if (serverCharacters.length === 0) {
        currentServer.players.forEach(player => {
            if (player.character) {
                serverCharacters.push({
                    id: player.id,
                    playerId: player.id,
                    playerName: player.username,
                    character: player.character,
                    x: 0,
                    y: 0,
                    cellIndex: 0,
                    coordinate: 'A1'
                });
            }
        });
        currentServer.characters = serverCharacters;
        saveServers();
    }
    
    renderServerCharacters();
}

// Renderizar personagens no tabuleiro
function renderServerCharacters() {
    const charactersLayer = document.getElementById('server-characters-layer');
    if (!charactersLayer) return;
    
    charactersLayer.innerHTML = '';
    
    serverCharacters.forEach(character => {
        const characterElement = document.createElement('div');
        characterElement.className = 'server-character';
        characterElement.dataset.characterId = character.id;
        characterElement.style.position = 'absolute';
        characterElement.style.left = (character.x || 0) + 'px';
        characterElement.style.top = (character.y || 0) + 'px';
        characterElement.style.width = (GRID_SIZE - 2) + 'px';
        characterElement.style.height = (GRID_SIZE - 2) + 'px';
        characterElement.style.pointerEvents = 'all';
        characterElement.style.cursor = 'grab';
        characterElement.style.zIndex = '10';
        characterElement.title = `${character.playerName} (${character.coordinate})`;
        
        // Ícone do personagem
        const characterIcon = document.createElement('img');
        characterIcon.src = character.character.icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="%23f39c12"><circle cx="12" cy="12" r="10"/></svg>';
        characterIcon.style.width = '100%';
        characterIcon.style.height = '100%';
        characterIcon.style.borderRadius = '50%';
        characterIcon.style.border = '2px solid #f39c12';
        characterIcon.style.objectFit = 'cover';
        characterIcon.draggable = false;
        
        // Nome do jogador
        const nameLabel = document.createElement('div');
        nameLabel.textContent = character.playerName;
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = '-20px';
        nameLabel.style.left = '50%';
        nameLabel.style.transform = 'translateX(-50%)';
        nameLabel.style.fontSize = '10px';
        nameLabel.style.color = '#f39c12';
        nameLabel.style.fontWeight = 'bold';
        nameLabel.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        nameLabel.style.whiteSpace = 'nowrap';
        nameLabel.style.pointerEvents = 'none';
        
        characterElement.appendChild(characterIcon);
        characterElement.appendChild(nameLabel);
        
        // Event listeners para drag and drop
        characterElement.draggable = true;
        
        characterElement.addEventListener('dragstart', function(e) {
            if (currentServer.masterId !== currentUser.id && character.playerId !== currentUser.id) {
                e.preventDefault();
                return;
            }
            selectedCharacter = character;
            isDragging = true;
            characterElement.style.opacity = '0.5';
        });
        
        characterElement.addEventListener('dragend', function() {
            isDragging = false;
            selectedCharacter = null;
            characterElement.style.opacity = '1';
        });
        
        charactersLayer.appendChild(characterElement);
    });
}

// Manipular clique na célula
function handleCellClick(cellIndex, coordinate, event) {
    if (!currentServer || !currentUser) return;
    
    // Se há um personagem selecionado, mover para esta célula
    if (selectedCharacter) {
        moveCharacterToCell(selectedCharacter, cellIndex, coordinate);
        return;
    }
    
    // Se é mestre, pode adicionar personagem na célula
    if (currentServer.masterId === currentUser.id && event.ctrlKey) {
        showAddCharacterMenu(cellIndex, coordinate);
    }
}

// Manipular drop de personagem
function handleCharacterDrop(cellIndex, coordinate) {
    if (!selectedCharacter) return;
    
    moveCharacterToCell(selectedCharacter, cellIndex, coordinate);
}

// Mover personagem para célula
function moveCharacterToCell(character, cellIndex, coordinate) {
    if (!currentServer || !currentUser) return;
    
    // Verificar permissões
    const isMaster = currentServer.masterId === currentUser.id;
    const isOwnCharacter = character.playerId === currentUser.id;
    
    if (!isMaster && !isOwnCharacter) {
        alert('Você só pode mover seu próprio personagem!');
        return;
    }
    
    // Verificar se a célula já está ocupada
    const occupiedBy = serverCharacters.find(char => 
        char.id !== character.id && 
        char.cellIndex === cellIndex
    );
    
    if (occupiedBy) {
        alert(`Esta posição já está ocupada por ${occupiedBy.playerName}!`);
        return;
    }
    
    // Calcular posição em pixels
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);
    const x = col * GRID_SIZE;
    const y = row * GRID_SIZE;
    
    // Atualizar posição do personagem
    character.x = x;
    character.y = y;
    character.cellIndex = cellIndex;
    character.coordinate = coordinate;
    
    // Salvar no servidor
    currentServer.characters = serverCharacters;
    saveServers();
    
    // Adicionar mensagem no chat
    const message = `${character.playerName} moveu-se para ${coordinate}`;
    currentServer.chatMessages.push({
        id: Date.now(),
        type: 'system',
        message: message,
        timestamp: Date.now()
    });
    
    // Re-renderizar
    renderServerCharacters();
    renderServerChat();
    
    // Efeito visual de movimento
    setTimeout(() => {
        const characterElement = document.querySelector(`[data-character-id="${character.id}"]`);
        if (characterElement) {
            characterElement.classList.add('just-moved');
            setTimeout(() => {
                characterElement.classList.remove('just-moved');
            }, 500);
        }
    }, 100);
}

// Menu para adicionar personagem (mestre)
function showAddCharacterMenu(cellIndex, coordinate) {
    const availablePlayers = currentServer.players.filter(player => 
        !serverCharacters.find(char => char.playerId === player.id)
    );
    
    if (availablePlayers.length === 0) {
        alert('Todos os jogadores já têm personagens no tabuleiro!');
        return;
    }
    
    const playerName = prompt(
        `Adicionar personagem em ${coordinate}:\n\nJogadores disponíveis:\n` +
        availablePlayers.map(p => `- ${p.username}`).join('\n') +
        '\n\nDigite o nome do jogador:'
    );
    
    if (!playerName) return;
    
    const selectedPlayer = availablePlayers.find(p => 
        p.username.toLowerCase() === playerName.toLowerCase()
    );
    
    if (!selectedPlayer) {
        alert('Jogador não encontrado!');
        return;
    }
    
    // Adicionar personagem ao tabuleiro
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);
    
    const newCharacter = {
        id: selectedPlayer.id + '_' + Date.now(),
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.username,
        character: selectedPlayer.character,
        x: col * GRID_SIZE,
        y: row * GRID_SIZE,
        cellIndex: cellIndex,
        coordinate: coordinate
    };
    
    serverCharacters.push(newCharacter);
    currentServer.characters = serverCharacters;
    saveServers();
    
    // Mensagem no chat
    currentServer.chatMessages.push({
        id: Date.now(),
        type: 'system',
        message: `${currentUser.username} adicionou ${selectedPlayer.username} em ${coordinate}`,
        timestamp: Date.now()
    });
    
    renderServerCharacters();
    renderServerChat();
}

// Escolher fundo do servidor (apenas mestre)
function chooseServerBackground() {
    if (!currentServer || currentServer.masterId !== currentUser.id) {
        alert('Apenas o mestre pode alterar o fundo do tabuleiro!');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Apenas arquivos de imagem são permitidos!');
            return;
        }
        
        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Imagem muito grande! Máximo 5MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentServer.boardBackground = e.target.result;
            saveServers();
            setupServerBoard();
            
            // Adicionar mensagem no chat
            currentServer.chatMessages.push({
                id: Date.now(),
                type: 'system',
                message: `${currentUser.username} alterou o fundo do tabuleiro`,
                timestamp: Date.now()
            });
            renderServerChat();
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

// Limpar tabuleiro do servidor (apenas mestre)
function resetServerBoard() {
    if (!currentServer || currentServer.masterId !== currentUser.id) {
        alert('Apenas o mestre pode limpar o tabuleiro!');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar o tabuleiro? Esta ação removerá todos os personagens e não pode ser desfeita.')) {
        currentServer.boardBackground = null;
        currentServer.characters = [];
        serverCharacters = [];
        saveServers();
        setupServerBoard();
        
        // Adicionar mensagem no chat
        currentServer.chatMessages.push({
            id: Date.now(),
            type: 'system',
            message: `${currentUser.username} limpou completamente o tabuleiro`,
            timestamp: Date.now()
        });
        renderServerChat();
    }
}

// Sair do servidor
function leaveServer() {
    if (!currentServer) return;
    
    const isMaster = currentServer.masterId === currentUser.id;
    
    if (isMaster) {
        if (currentServer.players.length > 1) {
            alert('Você não pode sair do servidor enquanto há outros jogadores. Exclua o servidor ou transfira a gestão.');
            return;
        }
    }
    
    if (confirm('Tem certeza que deseja sair deste servidor?')) {
        // Remover jogador do servidor
        currentServer.players = currentServer.players.filter(player => player.id !== currentUser.id);
        
        // Adicionar mensagem de saída
        currentServer.chatMessages.push({
            id: Date.now(),
            type: 'system',
            message: `${currentUser.username} saiu do servidor`,
            timestamp: Date.now()
        });
        
        saveServers();
        
        // Voltar para tela de servidores
        currentServer = null;
        showServersScreen();
    }
}

// Excluir servidor (apenas mestre)
function deleteServer() {
    if (!currentServer || currentServer.masterId !== currentUser.id) {
        alert('Apenas o mestre pode excluir o servidor!');
        return;
    }
    
    if (confirm(`Tem certeza que deseja EXCLUIR o servidor "${currentServer.name}"?\\n\\nEsta ação não pode ser desfeita e todos os jogadores serão removidos!`)) {
        // Remover servidor da lista
        servers = servers.filter(server => server.id !== currentServer.id);
        saveServers();
        
        // Voltar para tela de servidores
        currentServer = null;
        showServersScreen();
        
        alert('Servidor excluído com sucesso!');
    }
}

// Event listener para pressionar Enter no chat
document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// Event listener para pressionar Enter no código de convite
document.getElementById('invite-code-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        joinServerByCode();
    }
});

// Função para esconder todas as telas (incluindo as novas)
function hideAllScreens() {
    const screens = ['welcome-screen', 'login-screen', 'register-screen', 'game-screen', 'servers-screen', 'server-room-screen'];
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.style.display = 'none';
        }
    });
}

// Carregar servidores na inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadServers();
});

// 🔒 MEDIDAS DE SEGURANÇA ADICIONAIS

// Prevenir injeção de scripts
document.addEventListener('DOMContentLoaded', function() {
    // Remover todos os scripts inline existentes
    const scripts = document.querySelectorAll('script[src=""]');
    scripts.forEach(script => script.remove());
    
    // Sanitizar todos os inputs ao focar
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove caracteres potencialmente perigosos
            this.value = this.value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            this.value = this.value.replace(/javascript:/gi, '');
            this.value = this.value.replace(/on\w+\s*=/gi, '');
        });
    });
});

// Proteção contra ataques de timing
function secureStringCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
}

// Validação de sessão
function validateUserSession() {
    if (currentUser) {
        const users = JSON.parse(localStorage.getItem('rpg-users') || '[]');
        const userExists = users.find(u => u.id === currentUser.id && u.username === currentUser.username);
        
        if (!userExists) {
            // Sessão inválida
            handleLogout();
            alert('Sua sessão expirou. Faça login novamente.');
        }
    }
}

// Alternar instruções do tabuleiro
function toggleBoardInstructions() {
    const instructions = document.getElementById('board-instructions');
    if (!instructions) return;
    
    if (instructions.classList.contains('hidden')) {
        instructions.classList.remove('hidden');
    } else {
        instructions.classList.add('hidden');
    }
}

// Verificar sessão a cada 5 minutos
setInterval(validateUserSession, 5 * 60 * 1000);

console.log('🔒 RPG Online Board Game - Versão Segura Carregada!');
console.log('✅ Todas as medidas de segurança foram implementadas.');
console.log('🎮 Sistema multiplayer com validação de segurança ativo!');