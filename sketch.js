// --- 전역 변수 설정 ---
let cam;              // 웹캠 객체
let targetColor;      // 추적할 색상 (빨간색)
let threshold = 170;    // 색상 유사도 임계값 [cite: 2]
let checkCellSize = 20; // 색상 검출 격자 크기 [cite: 3]
let textStep = 10;        // 텍스트 출력 간격 [cite: 3]
let mosaicText = "*";   // 모자이크에 사용할 텍스트 [cite: 4]

// --- 잔상 효과를 위한 변수 ---
let presenceBuffer; // 각 격자의 "생명력"을 저장하는 2차원 배열 [cite: 4]
let numCols;        // 격자 열 수 [cite: 4]
let numRows;        // 격자 행 수 [cite: 4]

let maxPresence = 255.0; // 최대 생명력 값 [cite: 5]
let growRate = 60.0;    // 나타나는 속도 [cite: 6]
let fadeRate = 40.0;    // 사라지는 속도 [cite: 6]

const CAM_WIDTH = 640;
const CAM_HEIGHT = 480;

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
function setup() {
  createCanvas(CAM_WIDTH, CAM_HEIGHT); // 캔버스 크기 설정 [cite: 7]
  frameRate(15); // 프레임 속도 설정 [cite: 7]

  // p5.js의 색상 객체 설정
  targetColor = color(255, 0, 0); // 추적할 색상 (빨간색) [cite: 1, 2]
  
  // 격자 크기 계산 [cite: 7]
  numCols = ceil(width / checkCellSize);
  numRows = ceil(height / checkCellSize);
  
  // 잔상 버퍼 초기화 [cite: 8]
  presenceBuffer = new Array(numCols);
  for (let i = 0; i < numCols; i++) {
    presenceBuffer[i] = new Array(numRows).fill(0);
  }

  // 웹캠 설정 (p5.js 방식)
  // 웹캠 영상을 DOM에 추가하지만, hide()를 이용해 화면에는 표시하지 않고 데이터만 사용
  cam = createCapture(VIDEO);
  cam.size(CAM_WIDTH, CAM_HEIGHT);
  cam.hide();
  
  textAlign(CENTER, CENTER); [cite: 9]
  textSize(25); [cite: 10]
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
function draw() {
  if (cam.loadedmetadata) {
    // 픽셀 데이터 로드 [cite: 12]
    cam.loadPixels();
    
    // --------------------------------------------------
    // Phase 1: 잔상 버퍼 업데이트 (감쇠)
    // --------------------------------------------------
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numRows; j++) {
        // fadeRate만큼 감소 [cite: 13]
        presenceBuffer[i][j] -= fadeRate; 
        // 0 미만 방지 [cite: 13]
        presenceBuffer[i][j] = max(0, presenceBuffer[i][j]); 
      }
    }

    // --------------------------------------------------
    // Phase 2: 색상 검출 및 생명력 증가 (원본 컬러 픽셀로 분석)
    // --------------------------------------------------
    for (let x = 0; x < width; x += checkCellSize) {
      for (let y = 0; y < height; y += checkCellSize) {
        
        let i = floor(x / checkCellSize); // 격자 열 인덱스 [cite: 14]
        let j = floor(y / checkCellSize); // 격자 행 인덱스 [cite: 14]
        
        // 격자 중앙의 픽셀 색상 가져오기 [cite: 15]
        let pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2);
        
        // 색상 거리 계산 (p5.js의 dist()는 3차원 거리 측정 가능) [cite: 15]
        let d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor)); [cite: 15, 16]
        
        // 임계값보다 작으면 생명력 증가 [cite: 16]
        if (d < threshold) {
          presenceBuffer[i][j] += growRate; [cite: 17]
          // maxPresence 초과 방지 [cite: 17]
          presenceBuffer[i][j] = min(maxPresence, presenceBuffer[i][j]);
        }
      }
    }

    // --------------------------------------------------
    // 2. 웹캠 이미지 출력 (흑백 필터와 좌우 반전 적용)
    // --------------------------------------------------
    
    // 웹캠 좌우 반전 설정 [cite: 18]
    push();
    translate(width, 0);
    scale(-1, 1);
    
    // 흑백 필터 적용 및 웹캠 영상 출력 [cite: 19]
    // p5.js에서는 filter()를 image() 전에 사용하면 전체 캔버스에 적용되므로,
    // 먼저 캔버스를 이미지로 채운 후, 그 위에 텍스트를 그리는 방식으로 진행.
    // cam.filter(GRAY) 대신, 캔버스에 이미지를 그리고 필터 적용
    image(cam, 0, 0, width, height); // 반전된 컬러 영상을 그립니다.
    filter(GRAY); // 캔버스 전체에 흑백 필터 적용 [cite: 19]
              
    pop(); [cite: 20]

    // --------------------------------------------------
    // Phase 3: 잔상 버퍼 값에 비례하여 텍스트 그리기
    // --------------------------------------------------
    noStroke(); [cite: 21]
    
    for (let x = 0; x < width; x += textStep) {
      for (let y = 0; y < height; y += textStep) {
        
        let i = floor(x / checkCellSize); [cite: 22]
        let j = floor(y / checkCellSize); [cite: 22]

        if (i >= numCols || j >= numRows) continue;

        let currentPresence = presenceBuffer[i][j]; [cite: 23]
        
        if (currentPresence > 0) { [cite: 23]
          
          // fill(R, G, B, Alpha) -> Alpha = currentPresence [cite: 24]
          fill(255, 0, 0, currentPresence);
          
          // 좌우 반전된 위치에 맞게 텍스트 출력 위치 계산 (width - x) [cite: 24]
          let drawX = width - x; 
          let drawY = y;
          
          // 떨림 효과 (Jitter) [cite: 25]
          let jitterX = random(-textStep * 0.5, textStep * 0.5);
          let jitterY = random(-textStep * 0.5, textStep * 0.5);

          text(mosaicText, drawX + jitterX, drawY + jitterY); [cite: 26]
        }
      }
    }
  } else {
      // 웹캠 로딩 중 대기 메시지
      background(0);
      fill(255);
      text("웹캠을 로드 중입니다...", width / 2, height / 2);
  }
}
