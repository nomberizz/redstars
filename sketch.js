// --- 전역 변수 설정 ---
let cam;              // 웹캠 객체
let targetColor;      // 추적할 색상 (빨간색)
let threshold = 170;    // 색상 유사도 임계값
let checkCellSize = 20; // 색상 검출 격자 크기
let textStep = 10;        // 텍스트 출력 간격
let mosaicText = "*";   // 모자이크에 사용할 텍스트

// --- 잔상 효과를 위한 변수 ---
let presenceBuffer; // 각 격자의 "생명력"을 저장하는 2차원 배열
let numCols;        // 격자 열 수
let numRows;        // 격자 행 수

let maxPresence = 255.0; // 최대 생명력 값
let growRate = 60.0;    // 나타나는 속도
let fadeRate = 40.0;    // 사라지는 속도

const CAM_WIDTH = 640;
const CAM_HEIGHT = 480;

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
function setup() {
  createCanvas(CAM_WIDTH, CAM_HEIGHT); // 캔버스 크기 설정
  frameRate(15); // 프레임 속도 설정

  targetColor = color(255, 0, 0); // 추적할 색상 (빨간색)
  
  // 격자 크기 계산
  numCols = ceil(width / checkCellSize);
  numRows = ceil(height / checkCellSize);
  
  // 잔상 버퍼 초기화
  presenceBuffer = new Array(numCols);
  for (let i = 0; i < numCols; i++) {
    presenceBuffer[i] = new Array(numRows).fill(0);
  }

  // 웹캠 설정 (p5.js 방식 - 해상도 명시적 요청 추가)
  // 웹캠 연결 문제를 줄이기 위해 정확한 해상도를 요청합니다.
  cam = createCapture({
    video: {
      width: { exact: CAM_WIDTH }, 
      height: { exact: CAM_HEIGHT }
    },
    audio: false // 오디오는 필요 없으므로 false 설정
  });
  
  cam.size(CAM_WIDTH, CAM_HEIGHT);
  cam.hide(); // 웹캠 영상을 HTML 요소로 표시하지 않고 데이터만 사용
  
  textAlign(CENTER, CENTER);
  textSize(25);
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
function draw() {
  // cam.loadedmetadata는 웹캠이 성공적으로 로드되었는지 확인합니다.
  if (cam.loadedmetadata) {
    // 픽셀 데이터 로드
    cam.loadPixels();
    
    // --------------------------------------------------
    // Phase 1: 잔상 버퍼 업데이트 (감쇠)
    // --------------------------------------------------
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numRows; j++) {
        presenceBuffer[i][j] -= fadeRate; 
        presenceBuffer[i][j] = max(0, presenceBuffer[i][j]); 
      }
    }

    // --------------------------------------------------
    // Phase 2: 색상 검출 및 생명력 증가
    // --------------------------------------------------
    for (let x = 0; x < width; x += checkCellSize) {
      for (let y = 0; y < height; y += checkCellSize) {
        
        let i = floor(x / checkCellSize); 
        let j = floor(y / checkCellSize); 
        
        // 격자 중앙의 픽셀 색상 가져오기
        let pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2);
        
        // 색상 거리 계산
        let d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor));
        
        // 임계값보다 작으면 생명력 증가
        if (d < threshold) {
          presenceBuffer[i][j] += growRate;
          presenceBuffer[i][j] = min(maxPresence, presenceBuffer[i][j]);
        }
      }
    }

    // --------------------------------------------------
    // 2. 웹캠 이미지 출력 (흑백 필터와 좌우 반전 적용)
    // --------------------------------------------------
    
    // 좌우 반전을 위한 변환
    push();
    translate(width, 0);
    scale(-1, 1);
    
    // 반전된 컬러 영상을 캔버스에 그리고 흑백 필터 적용
    image(cam, 0, 0, width, height); 
    filter(GRAY); 
              
    pop();

    // --------------------------------------------------
    // Phase 3: 잔상 버퍼 값에 비례하여 텍스트 그리기
    // --------------------------------------------------
    noStroke();
    
    for (let x = 0; x < width; x += textStep) {
      for (let y = 0; y < height; y += textStep) {
        
        let i = floor(x / checkCellSize);
        let j = floor(y / checkCellSize);

        if (i >= numCols || j >= numRows) continue;

        let currentPresence = presenceBuffer[i][j];
        
        if (currentPresence > 0) {
          
          // 빨간색에 잔상 강도를 투명도로 적용
          fill(255, 0, 0, currentPresence);
          
          // 좌우 반전된 위치에 맞게 텍스트 출력 위치 계산
          let drawX = width - x; 
          let drawY = y;
          
          // 떨림 효과
          let jitterX = random(-textStep * 0.5, textStep * 0.5);
          let jitterY = random(-textStep * 0.5, textStep * 0.5);

          text(mosaicText, drawX + jitterX, drawY + jitterY);
        }
      }
    }
  } else {
      // 웹캠 로딩 중 대기 메시지
      background(0);
      fill(255);
      text("웹캠을 로드 중입니다. 카메라 권한을 확인하세요.", width / 2, height / 2);
  }
}
