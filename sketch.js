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

  // 웹캠 설정 (p5.js 방식 - 해상도 명시적 요청과 문법 수정)
  // SyntaxError를 방지하기 위해 쉼표(,)를 정확히 확인합니다.
  cam = createCapture({
    video: {
      width: { exact: CAM_WIDTH }, 
      height: { exact: CAM_HEIGHT }
    }, // <--- 이 콤마가 필수입니다! 
    audio: false 
  });
  
  cam.size(CAM_WIDTH, CAM_HEIGHT);
  cam.hide(); 
  
  textAlign(CENTER, CENTER);
  textSize(25);
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
function draw() {
  
  // 매 프레임 배경을 지웁니다.
  background(0); 

  // 웹캠 로딩 상태 확인
  if (cam && cam.loadedmetadata) {
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
        
        let pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2);
        
        let d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor));
        
        if (d < threshold) {
          presenceBuffer[i][j] += growRate;
          presenceBuffer[i][j] = min(maxPresence, presenceBuffer[i][j]);
        }
      }
    }

    // --------------------------------------------------
    // 2. 웹캠 이미지 출력 (흑백 필터와 좌우 반전 적용)
    // --------------------------------------------------
    
    push();
    translate(width, 0);
    scale(-1, 1);
    
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
          
          fill(255, 0, 0, currentPresence);
          
          let drawX = width - x; 
          let drawY = y;
          
          let jitterX = random(-textStep * 0.5, textStep * 0.5);
          let jitterY = random(-textStep * 0.5, textStep * 0.5);

          text(mosaicText, drawX + jitterX, drawY + jitterY);
        }
      }
    }
  } else {
      // cam 객체가 정의되었지만 로드가 안 된 경우 (로딩 중)
      if (cam) {
          fill(255, 255, 0); // 노란색
          text("웹캠 로드 중... 브라우저 권한 및 시스템 설정을 확인하세요.", width / 2, height / 2);
      } else {
          // cam 객체 생성 자체가 실패한 경우 (일반적이지 않은 심각한 에러)
          fill(255, 0, 0); // 빨간색
          text("오류: 웹캠 객체 생성 실패 - 콘솔 확인 필요", width / 2, height / 2);
      }
  }
}
