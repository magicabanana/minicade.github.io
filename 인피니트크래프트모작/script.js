// === Initial State & Constants ===
const INITIAL_ELEMENTS = [
    { id: 'water', emoji: '💧', word: 'Water' },
    { id: 'fire', emoji: '🔥', word: 'Fire' },
    { id: 'wind', emoji: '💨', word: 'Wind' },
    { id: 'earth', emoji: '🌍', word: 'Earth' }
];

let discoveredElements = [];
let canvasItems = [];
let draggingItem = null;
let offsetX = 0;
let offsetY = 0;

// API configuration
// In a real robust app, cache combinations locally to prevent unnecessary backend calls
let combinationsCache = JSON.parse(localStorage.getItem('combinations_cache')) || {};

// === DOM Elements ===
const inventoryEl = document.getElementById('inventory');
const canvasEl = document.getElementById('canvas');
const discoveryCountEl = document.getElementById('discovery-count');
const canvasMessageEl = document.querySelector('.canvas-message');

const loadingOverlay = document.getElementById('loading-overlay');
const clearCanvasBtn = document.getElementById('clear-canvas-btn');
const resetProgressBtn = document.getElementById('reset-progress-btn');

// === Initialization ===
function init() {
    loadProgress();
    renderInventory();
    setupEventListeners();
}

function loadProgress() {
    const saved = localStorage.getItem('discovered_elements');
    if (saved) {
        discoveredElements = JSON.parse(saved);
    } else {
        discoveredElements = [...INITIAL_ELEMENTS];
        saveProgress();
    }
}

function saveProgress() {
    localStorage.setItem('discovered_elements', JSON.stringify(discoveredElements));
}

// === UI Rendering ===
function createItemElement(item, isCanvasItem = false) {
    const el = document.createElement('div');
    el.className = 'craft-item';
    el.innerHTML = `<span>${item.emoji}</span> <span>${item.word}</span>`;
    el.dataset.id = item.id;
    el.dataset.emoji = item.emoji;
    el.dataset.word = item.word;

    // Attach pointer/mouse events for dragging
    el.addEventListener('pointerdown', (e) => startDrag(e, el, isCanvasItem));

    return el;
}

function renderInventory() {
    inventoryEl.innerHTML = '';
    discoveredElements.forEach(item => {
        const el = createItemElement(item, false);
        inventoryEl.appendChild(el);
    });
    discoveryCountEl.textContent = discoveredElements.length;
}

// === Drag & Drop Logic ===
function startDrag(e, element, isCanvasItem) {
    // Only left click / main touch
    if (e.button !== 0 && e.type.startsWith('mouse')) return;

    // Create a clone to drag if it's from inventory, or use the existing if on canvas
    let dragEl;
    let startX = e.clientX;
    let startY = e.clientY;

    if (!isCanvasItem) {
        // Dragging from inventory: clone it and put on body
        dragEl = element.cloneNode(true);
        dragEl.className = 'craft-item dragging';
        document.body.appendChild(dragEl);

        // Calculate offset based on initial click position relative to newly created clone
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // Position clone at mouse
        updateDragPosition(dragEl, e.clientX, e.clientY);
    } else {
        // Dragging existing canvas item
        dragEl = element;
        dragEl.classList.add('dragging');

        const rect = dragEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // Ensure it's on top of other canvas items
        dragEl.style.zIndex = '1000';
    }

    draggingItem = {
        element: dragEl,
        isFromCanvas: isCanvasItem,
        itemData: {
            id: dragEl.dataset.id,
            emoji: dragEl.dataset.emoji,
            word: dragEl.dataset.word
        }
    };

    // Add global event listeners for move and end
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag);

    // Prevent default text selection during drag
    e.preventDefault();
}

function onDrag(e) {
    if (!draggingItem) return;
    updateDragPosition(draggingItem.element, e.clientX, e.clientY);
}

function updateDragPosition(element, clientX, clientY) {
    element.style.left = `${clientX - offsetX}px`;
    element.style.top = `${clientY - offsetY}px`;
}

async function endDrag(e) {
    if (!draggingItem) return;

    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', endDrag);

    const el = draggingItem.element;
    const isFromCanvas = draggingItem.isFromCanvas;
    const itemData = draggingItem.itemData;

    el.classList.remove('dragging');

    // Check where it was dropped
    const canvasRect = canvasEl.getBoundingClientRect();
    const isDroppedOnCanvas = (
        e.clientX >= canvasRect.left &&
        e.clientX <= canvasRect.right &&
        e.clientY >= canvasRect.top &&
        e.clientY <= canvasRect.bottom
    );

    if (isDroppedOnCanvas) {
        // Hide message if it's the first item
        canvasMessageEl.style.display = 'none';

        if (!isFromCanvas) {
            // New item added to canvas
            document.body.removeChild(el); // remove clone from body
            const canvasItem = createItemElement(itemData, true);

            // Adjust position relative to canvas
            canvasItem.style.left = `${e.clientX - canvasRect.left - offsetX}px`;
            canvasItem.style.top = `${e.clientY - canvasRect.top - offsetY}px`;
            canvasEl.appendChild(canvasItem);

            canvasItem.style.zIndex = '1'; // Reset z-index
            checkForCollisions(canvasItem);
        } else {
            // Moved existing canvas item
            // Adjust position relative to canvas (compensating for canvas bounds if body relative)
            const rect = el.getBoundingClientRect();
            el.style.left = `${rect.left - canvasRect.left}px`;
            el.style.top = `${rect.top - canvasRect.top}px`;
            el.style.zIndex = '1';

            checkForCollisions(el);
        }
    } else {
        // Dropped outside canvas
        if (!isFromCanvas) {
            // Destroy the clone from body
            document.body.removeChild(el);
        } else {
            // Remove the item from canvas (deleting it)
            if (el.parentNode === canvasEl) {
                canvasEl.removeChild(el);
            }
            if (canvasEl.children.length === 0) {
                canvasMessageEl.style.display = 'block';
            }
        }
    }

    draggingItem = null;
}

// === Collision & Combination ===
async function checkForCollisions(movedElement) {
    const movedRect = movedElement.getBoundingClientRect();
    const canvasItemsList = Array.from(canvasEl.querySelectorAll('.craft-item')).filter(el => el !== movedElement);

    for (let targetElement of canvasItemsList) {
        const targetRect = targetElement.getBoundingClientRect();

        // Simple AABB collision detection
        if (
            movedRect.left < targetRect.right &&
            movedRect.right > targetRect.left &&
            movedRect.top < targetRect.bottom &&
            movedRect.bottom > targetRect.top
        ) {
            // Collision detected! Combine them.
            await combineItems(movedElement, targetElement);
            return; // Only combine with one item at a time
        }
    }
}

// === Event Listeners for UI ===
function setupEventListeners() {
    // Clear Canvas
    clearCanvasBtn.addEventListener('click', () => {
        canvasEl.innerHTML = '';
        canvasMessageEl.style.display = 'block';
    });

    // Reset Progress
    resetProgressBtn.addEventListener('click', () => {
        if (confirm('정말로 모든 진행 상황을 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
            discoveredElements = [...INITIAL_ELEMENTS];
            saveProgress();
            renderInventory();
            canvasEl.innerHTML = '';
            canvasMessageEl.style.display = 'block';
            // Clear cache
            combinationsCache = {};
            localStorage.setItem('combinations_cache', JSON.stringify({}));
        }
    });
}

// === Combination & API Logic ===
async function combineItems(el1, el2) {
    const word1 = el1.dataset.word;
    const word2 = el2.dataset.word;

    // Create a deterministic cache key (alphabetical order)
    const sortedWords = [word1, word2].sort();
    const cacheKey = `${sortedWords[0]}+${sortedWords[1]}`;

    // Show loading
    loadingOverlay.classList.remove('hidden');
    el1.style.opacity = '0.5';
    el2.style.opacity = '0.5';

    try {
        let result;

        // Check cache first
        if (combinationsCache[cacheKey]) {
            result = combinationsCache[cacheKey];
            // Simulate slight delay for effect
            await new Promise(resolve => setTimeout(resolve, 300));
        } else {
            // Call Backend API
            result = await callBackendAPI(word1, word2);
            // Save to cache
            combinationsCache[cacheKey] = result;
            localStorage.setItem('combinations_cache', JSON.stringify(combinationsCache));
        }

        // Spawn new item
        spawnNewItem(result, el1, el2);

    } catch (error) {
        console.error("Combination Error:", error);
        alert(error.message || "조합 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        el1.style.opacity = '1';
        el2.style.opacity = '1';
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

async function callBackendAPI(word1, word2) {
    const response = await fetch('/api/combine', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word1, word2 })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `서버 오류: ${response.status}`);
    }

    return data;
}

function spawnNewItem(result, el1, el2) {
    const { word, emoji } = result;

    // Create new ID
    const newId = word.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newItemData = {
        id: newId,
        emoji,
        word
    };

    // Calculate center drop position
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const cx = (rect1.left + rect2.left) / 2 - canvasRect.left;
    const cy = (rect1.top + rect2.top) / 2 - canvasRect.top;

    // Remove old items from DOM
    if (el1.parentNode === canvasEl) canvasEl.removeChild(el1);
    if (el2.parentNode === canvasEl) canvasEl.removeChild(el2);

    // Create and position new item
    const newItemEl = createItemElement(newItemData, true);
    newItemEl.style.left = `${cx}px`;
    newItemEl.style.top = `${cy}px`;
    newItemEl.classList.add('pop-animation');
    canvasEl.appendChild(newItemEl);

    // Create visual effect
    createParticles(cx + canvasRect.left + (rect1.width / 2), cy + canvasRect.top + (rect1.height / 2));

    // Check if it's a new discovery
    if (!discoveredElements.find(e => e.word.toLowerCase() === word.toLowerCase())) {
        discoveredElements.push(newItemData);
        saveProgress();
        renderInventory();

        // Auto-scroll to bottom of inventory
        inventoryEl.scrollTop = inventoryEl.scrollHeight;
    }
}

function createParticles(x, y) {
    const container = document.createElement('div');
    container.className = 'particles-container';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    document.body.appendChild(container);

    const colors = ['#a855f7', '#6366f1', '#f0f0f0', '#38bdf8'];

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.cssText = `
            position: absolute;
            width: ${4 + Math.random() * 6}px;
            height: ${4 + Math.random() * 6}px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            opacity: 1;
        `;
        container.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 40;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], {
            duration: 600 + Math.random() * 400,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => particle.remove();
    }

    setTimeout(() => container.remove(), 1200);
}

// Run app
init();
