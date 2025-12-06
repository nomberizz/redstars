// --- 전역 변수 설정 ---
let cam;              
let targetColor;      
let threshold = 170;    
let checkCellSize = 20; // ⭐ 초기 값 유지
let textStep = 10;        
let mosaicText = "*";   

// --- 잔상 효과를 위한 변수 ---
let presenceBuffer; 
let numCols;        
let numRows;        

let maxPresence = 255.0; 
let growRate = 60.0;    
let fadeRate = 40.0;    

const CAM_WIDTH = 640;
const CAM_HEIGHT = 480;

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
function setup() {
  createCanvas(CAM_WIDTH, CAM_HEIGHT); 
  frameRate(15); // ⭐ 초기 값 유지

  targetColor = color(255, 0, 0); 
  
  numCols = ceil(width / checkCellSize);
  numRows = ceil(height / checkCellSize);
  
  presenceBuffer = new Array(numCols);
  for (let i = 0; i < numCols; i++) {
    presenceBuffer[i] = new Array(numRows).fill(0);
  }

  // 웹캠 설정: 해상도와 비율(4:3) 강제 요청 (왜곡 방지)
  cam = createCapture({
    video: {
      width: { exact: CAM_WIDTH }, 
      height: { exact: CAM_HEIGHT },
      aspectRatio: { min: CAM_WIDTH / CAM_HEIGHT, max: CAM_WIDTH / CAM_HEIGHT } 
    }, 
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
  
  background(0); 

  if (cam && cam.loadedmetadata) {
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
    // Phase 2: 색상 검출 및 생명력 증가 (cam.pixels 직접 접근으로 개선)
    // --------------------------------------------------
    for (let x = 0; x < width; x += checkCellSize) {
      for (let y = 0; y < height; y += checkCellSize) {
        
        let i = floor(x / checkCellSize); 
        let j = floor(y / checkCellSize); 
        
        // ⭐ 성능 개선: cam.pixels 배열 인덱스를 계산하여 R, G, B 값을 직접 읽음
        let pixelIndex = 4 * ( (y + checkCellSize/2) * width + (x + checkCellSize/2) );
        
        let r_pixel = cam.pixels[pixelIndex];
        let g_pixel = cam.pixels[pixelIndex + 1];
        let b_pixel = cam.pixels[pixelIndex + 2];
        
        // cam.get() 대신 직접 읽은 값으로 거리 계산
        let d = dist(r_pixel, g_pixel, b_pixel, 
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
      if (cam) {
          fill(255, 255, 0); 
          text("웹캠 로드 중... 권한을 확인하세요.", width / 2, height / 2);
      } else {
          fill(255, 0, 0); 
          text("오류: 웹캠 객체 생성 실패 - 콘솔 확인 필요", width / 2, height / 2);
      }
  }
}
