const student = document.getElementById('student');
const caughtCountEl = document.getElementById('caught-count');
const suspicionGauge = document.getElementById('suspicion-gauge');
const statusText = document.getElementById('status-text');
const catchOverlay = document.getElementById('catch-overlay');

let caughtCount = 0;
let lastHiddenTime = 0;
let isGameOver = false;
let suspicionLevel = 0;
let isGameStarted = false;

// YouTube API
let player;
const VIDEO_ID = 'R9j-C6VzV0w'; // Monkey Magic

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: VIDEO_ID,
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'disablekb': 1,
            'enablejsapi': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    console.log("Music ready");
    event.target.setVolume(100);
}

function testAudio() {
    if (player && player.getPlayerState) {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            statusText.textContent = "테스트 중지됨";
        } else {
            player.playVideo();
            statusText.textContent = "몽키매직 재생 중... (소리가 들리나요?)";
        }
    } else {
        alert("음악 플레이어가 아직 준비되지 않았습니다. 잠시만 기다려주세요.");
    }
}

function startGame() {
    isGameStarted = true;
    document.getElementById('start-overlay').classList.add('hidden');
    resetGame();
}

// Load YouTube API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Game Config
const DANCE_START_DELAY = 1000;
const REACTION_WINDOW = 1200; // Increased slightly for fun with music

function updateSuspicion() {
    if (!isGameStarted || isGameOver) return;
    
    suspicionLevel = Math.min(100, suspicionLevel + 0.05);
    suspicionGauge.style.width = `${suspicionLevel}%`;
    
    requestAnimationFrame(updateSuspicion);
}

let danceTimer = null;

function handleVisibilityChange() {
    if (!isGameStarted || isGameOver) return;

    if (document.hidden) {
        lastHiddenTime = Date.now();
        
        danceTimer = setTimeout(() => {
            student.className = 'student dancing';
            if (player && player.playVideo) player.playVideo();
        }, DANCE_START_DELAY);
        
    } else {
        if (danceTimer) clearTimeout(danceTimer);
        if (player && player.pauseVideo) player.pauseVideo();
        
        const timeAway = Date.now() - lastHiddenTime;

        if (timeAway > DANCE_START_DELAY) {
            const danceTime = timeAway - DANCE_START_DELAY;
            
            if (danceTime < REACTION_WINDOW) {
                triggerCatch();
            } else {
                student.className = 'student sitting';
                statusText.textContent = "학생이 시치미를 떼고 있습니다... (조금 더 빨리 돌아와보세요!)";
                suspicionLevel = Math.min(100, suspicionLevel + 10);
            }
        } else {
            student.className = 'student sitting';
            statusText.textContent = "학생이 조용히 공부하고 있습니다.";
        }
    }
}

function triggerCatch() {
    isGameOver = true;
    caughtCount++;
    caughtCountEl.textContent = caughtCount;
    
    student.className = 'student caught';
    statusText.textContent = "현행범 체포 완료!";
    if (player && player.pauseVideo) player.pauseVideo();
    
    setTimeout(() => {
        catchOverlay.classList.remove('hidden');
    }, 500);
}

function resetGame() {
    isGameOver = false;
    suspicionLevel = 0;
    student.className = 'student sitting';
    statusText.textContent = "다시 감시를 시작합니다.";
    catchOverlay.classList.add('hidden');
    updateSuspicion();
}

// Event Listeners
document.addEventListener('visibilitychange', handleVisibilityChange);

console.log("Game Initialized: Start to watch!");
