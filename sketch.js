import processing.video.*;

// --- 전역 변수 설정 ---
Capture cam;              // 웹캠 객체
color targetColor = color(255, 0, 0); // 추적할 색상 (빨간색)
float threshold = 160;    // 색상 유사도 임계값
int checkCellSize = 20;   // 색상 검출 격자 크기
int textStep = 20;        // 텍스트 출력 간격 (도트처럼 보이는 현상 완화를 위해 20으로 설정)
String mosaicText = "*";  // 모자이크에 사용할 텍스트

// --- 잔상 효과를 위한 변수 ---
float[][] presenceBuffer; // 각 격자의 "생명력"을 저장하는 2차원 배열
int numCols;              // 격자 열 수
int numRows;              // 격자 행 수

float maxPresence = 255.0; // 최대 생명력 값
float growRate = 60.0;    // 나타나는 속도
float fadeRate = 40.0;    // 사라지는 속도

// --- 비율 유지 및 중앙 배치 변수 ---
float displayW, displayH; // 실제로 웹캠이 그려질 크기
float translateX, translateY; // 중앙 배치를 위한 이동 값

// ----------------------------------------------------
// 1. 초기 설정 (setup)
// ----------------------------------------------------
void setup() {
  size(1280, 720); // 원하는 해상도로 설정 (높게 설정하여 선명도 유지)
  frameRate(15);
  
  // 잔상 버퍼 크기 계산 및 초기화
  numCols = ceil(width / (float)checkCellSize);
  numRows = ceil(height / (float)checkCellSize);
  presenceBuffer = new float[numCols][numRows];
  
  // 웹캠 설정
  String[] cameras = Capture.list();
  if (cameras.length == 0) {
    println("사용 가능한 카메라가 없습니다.");
    exit();
  } else {
    // 웹캠 객체 생성 (기본 해상도로 생성)
    cam = new Capture(this, cameras[0]); 
    cam.start();
  }
  
  // 텍스트 설정
  textAlign(CENTER, CENTER);
  textSize(25);
  
  // 비율 유지 계산 초기화 (draw()에서 매번 다시 계산합니다.)
  calculateAspectRatio();
}

// 윈도우 크기 변경 시 비율 재계산 (Processing에서는 필요 없지만, 안정성을 위해 유지)
void calculateAspectRatio() {
    float camRatio = (float)cam.width / cam.height;
    float windowRatio = (float)width / height;
    
    if (windowRatio > camRatio) {
        // 창이 웹캠보다 가로로 더 길 경우: 높이(H)를 기준으로 맞춥니다.
        displayH = height;
        displayW = displayH * camRatio;
        translateX = (width - displayW) / 2;
        translateY = 0;
    } else {
        // 창이 웹캠보다 세로로 더 길거나 같을 경우: 가로(W)를 기준으로 맞춥니다.
        displayW = width;
        displayH = displayW / camRatio;
        translateX = 0;
        translateY = (height - displayH) / 2;
    }
}

// ----------------------------------------------------
// 2. 그리기 루프 (draw)
// ----------------------------------------------------
void draw() {
  if (cam.available()) {
    cam.read(); // 새 프레임 읽기
  }
  
  background(0); // 검은색 배경 (레터박스 여백)
  
  // ⭐ 픽셀 분석은 흑백 필터 전에 원본 컬러로 진행해야 합니다.
  cam.loadPixels(); 

  // --------------------------------------------------
  // Phase 1: 잔상 버퍼 업데이트
  // --------------------------------------------------
  for (int i = 0; i < numCols; i++) {
    for (int j = 0; j < numRows; j++) {
      presenceBuffer[i][j] -= fadeRate; 
      presenceBuffer[i][j] = max(0, presenceBuffer[i][j]); 
    }
  }

  // --------------------------------------------------
  // Phase 2: 색상 검출 및 생명력 증가 (원본 컬러 픽셀로 분석)
  // --------------------------------------------------
  for (int x = 0; x < width; x += checkCellSize) {
    for (int y = 0; y < height; y += checkCellSize) {
      
      int i = x / checkCellSize;
      int j = y / checkCellSize;
      
      // cam.get()은 필터 적용과 무관하게 원본 프레임의 색상을 가져옵니다.
      color pixelColor = cam.get(x + checkCellSize/2, y + checkCellSize/2); 
      float d = dist(red(pixelColor), green(pixelColor), blue(pixelColor), 
                     red(targetColor), green(targetColor), blue(targetColor));
      
      if (d < threshold) {
        presenceBuffer[i][j] += growRate; 
        presenceBuffer[i][j] = min(maxPresence, presenceBuffer[i][j]); 
      }
    }
  }

  // --------------------------------------------------
  // 3. 웹캠 이미지 출력 (흑백 필터와 좌우 반전 적용)
  // --------------------------------------------------
  pushMatrix();
  
  // ⭐ 중앙 배치 및 좌우 반전을 위해 좌표계를 이동합니다. ⭐
  translate(translateX + displayW, translateY); // 중앙 배치 후 좌우 반전을 위한 이동
  scale(-1, 1); // 좌우 반전
  
  // ⭐ 확실한 흑백 변환 ⭐
  cam.filter(GRAY); 
  
  // 계산된 크기(displayW, displayH)로 흑백 영상을 그립니다.
  image(cam, 0, 0, displayW, displayH); 
            
  popMatrix();
  
  // --------------------------------------------------
  // Phase 4: 잔상 버퍼 값에 비례하여 텍스트 그리기 (빨간색 컬러 유지)
  // --------------------------------------------------
  noStroke(); 
  
  for (int x = 0; x < cam.width; x += textStep) {
    for (int y = 0; y < cam.height; y += textStep) {
      
      int i = x / checkCellSize;
      int j = y / checkCellSize;

      if (i >= numCols || j >= numRows) continue;

      float currentPresence = presenceBuffer[i][j];
      
      if (currentPresence > 0) {
        
        fill(255, 0, 0, currentPresence); // 빨간색과 투명도 설정
        
        // ⭐ 좌표 계산: 중앙 배치된 영상 위에 텍스트를 정확히 그립니다. ⭐
        // 텍스트는 캔버스 좌표계에 맞춰 계산되어야 합니다.
        float drawX = width - x; 
        float drawY = y;
        
        // 텍스트의 좌표를 화면 확대 비율에 맞춰 조정합니다.
        float scaleX = displayW / cam.width;
        float scaleY = displayH / cam.height;
        
        drawX = width - (translateX + x * scaleX);
        drawY = translateY + y * scaleY;
        
        float jitterX = random(-textStep * 0.2, textStep * 0.2) * scaleX;
        float jitterY = random(-textStep * 0.2, textStep * 0.2) * scaleY;

        text(mosaicText, drawX + jitterX, drawY + jitterY);
      }
    }
  }
}