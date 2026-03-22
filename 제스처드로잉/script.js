const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');

let isInitialized = false;

function onResults(results) {
    if (!isInitialized) {
        loadingElement.style.display = 'none';
        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 480;
        isInitialized = true;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // 원본 웹캠 영상을 투명도 없이 그려줌
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // 손이 인식되었다면 화면에 랜드마크 뼈대를 그리기 (어떤 제스처 앱이든 기본으로 잘 돌아가는지 확인용)
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#e52e71', lineWidth: 1, radius: 2});
            
            /*
            ======================================================================
            앞으로 추가할 기능(가위바위보 판별, 스와이프 등)은 
            이곳에서 landmarks 배열(0~20)의 좌푯값(x, y, z)을 이용해 코딩하세요!
            
            [예시] 검지 손가락 끝은 landmarks[8] 입니다.
            const indexTipX = landmarks[8].x * canvasElement.width;
            const indexTipY = landmarks[8].y * canvasElement.height;
            console.log("검지 좌표:", indexTipX, indexTipY);
            ======================================================================
            */
        }
    }

    canvasCtx.restore();
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // 테스트 시 2개로 늘려도 됩니다
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start();
