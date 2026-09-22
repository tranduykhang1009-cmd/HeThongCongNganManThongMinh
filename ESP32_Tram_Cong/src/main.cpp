// ========================================================================
// TRẠM CỐNG - PHIÊN BẢN 12.14 (ULTIMATE FINAL)
// Tác giả: Lê Trọng Nam, Trần Duy Khang, Huỳnh Minh Ngọc
// ========================================================================
// - Tích hợp Lọc Siêu Âm EMA + Ma trận 5 Kịch bản AI Hysteresis 3cm.
// - Có công tắc Bật/Tắt Siêu Âm bảo vệ 2 lớp trên Web.
// - Sửa lỗi parse Boolean (true/false) từ giao diện Web.
// - Tiết kiệm 99% băng thông Firebase (Chống đầy Quota 10GB).
// - [V12.13] Fix lỗi Race Condition khi thao tác nút nhấn vật lý tại tủ.
// - [V12.14] Bổ sung đồng bộ biến stallThreshold, floodThreshold, sensorHeight từ Firebase.
// ========================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <HTTPClient.h>
#include <esp_now.h>
#include <esp_task_wdt.h>
#include <ESP32Servo.h>
#include <DYPlayerArduino.h>
#include <Wire.h>
#include <Adafruit_INA3221.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>

// ---------------------------------------------------------
// THAY BẰNG FIREBASE MỚI CỦA BẠN NẾU TẠO LẠI PROJECT NHÉ!
// ---------------------------------------------------------
#define FIREBASE_HOST "https://hethongcongthongminh-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "tB2xm09anJWcnva5gz1NBvDS6VDGh7sjPvuURNEx"
#define WIFI_SSID "DuyKhang"
#define WIFI_PASS "22102009"

#define TRIG_PIN 33
#define ECHO_PIN 32
#define TRIG_2_PIN 26
#define ECHO_2_PIN 27
#define ACS712_PIN 34
#define SW_OPEN_PIN  35  // Công tắc hành trình MỞ hết (LOW = kích)
#define SW_CLOSE_PIN 39  // Công tắc hành trình ĐÓNG hết (LOW = kích)
#define SERVO_PIN 25
#define LED_PIN 4
#define LED_WHITE_PIN 5
#define BTN_OPEN_PIN 18
#define BTN_STOP_PIN 19
#define BTN_CLOSE_PIN 23
#define DF_RX 16
#define DF_TX 17
#define I2C_SDA 21
#define I2C_SCL 22
#define INA_CH_BATTERY 0

#define SERVO_STOP_US 1500
#define SERVO_FWD_US 1700
#define SERVO_REV_US 1300
#define TARGET_ANGLE 680.0f
#define SPEED_DPS 70.0f
const unsigned long MOVE_TIME_MS = (unsigned long)((TARGET_ANGLE / SPEED_DPS) * 1000);
#define WDT_TIMEOUT 30

HardwareSerial dfSerial(2);
DY::Player player(&dfSerial);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo gateServo;
Preferences preferences;

volatile float remoteSalinity = 0.0f;
volatile float remoteTemp = 0.0f;
volatile float remoteBatV = 0.0f;
volatile float remoteBatPct = 0.0f;
volatile float remoteSolarV = 0.0f;
volatile float remoteSolarI = 0.0f;
volatile float remoteSolarP = 0.0f;
volatile int remoteDarkMode = 0;
volatile bool hasRemoteData = false;
volatile unsigned long lastRemoteDataTime = 0;

volatile unsigned long autoCloseWarningStart = 0;
volatile int autoCloseCountdown = -1;
volatile unsigned long lastManualActionTime = 0;

volatile bool isPanelLocked = false;
volatile bool syncRequestAccess = false;
volatile bool newlyConnectedPhao = false;
volatile bool isCongLowBatteryPlayed = false;
volatile bool isCongFullBatteryPlayed = false;
volatile bool isPhaoLowBatteryPlayed = false;
volatile bool isPhaoFullBatteryPlayed = false;

// KHIÊN CHẶN RACE CONDITION MẠNG FIREBASE
volatile unsigned long blockFirebaseUpdateUntil = 0;

typedef struct struct_message {
  float salinity;
  float temp;
  float batteryVoltage;
  float batteryPercent;
  float solarVoltage;
  float solarCurrent;
  float solarPower;
  int darkMode;
} struct_message;
struct_message myData;

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *incomingData, int len) {
#endif
  memcpy(&myData, incomingData, sizeof(myData));
  remoteSalinity = myData.salinity;
  remoteTemp = myData.temp;
  remoteBatV = myData.batteryVoltage;
  remoteBatPct = myData.batteryPercent;
  remoteSolarV = myData.solarVoltage;
  remoteSolarI = myData.solarCurrent;
  remoteSolarP = myData.solarPower;
  remoteDarkMode = myData.darkMode;
  
  if (!hasRemoteData) newlyConnectedPhao = true;
  hasRemoteData = true;
  autoCloseCountdown = -1;
  autoCloseWarningStart = 0;
  lastRemoteDataTime = millis();
}

volatile float waterLevel = 0.0f;
volatile float waterLevel_2 = 0.0f;
volatile float sensorHeight = 18.0f; 

volatile float dong_dien_tho = 0.0f;
volatile int gateState = 0;
volatile int movingDirection = 0;
volatile int opMode = 1;
volatile float salinityThreshold = 0.40f;
volatile float floodThreshold = 15.0f; 
volatile int useUltrasonic = 0;

volatile float stallThreshold = 0.13f; // Kẹt: Ngưỡng dòng Ampere (ACS712 5A)
volatile float acsBaseline_V = 0.0f;    // Điện áp offset lúc 0A (tự hiệu chỉnh)
volatile float lastGoodRaw = 2048.0f;   // Giá trị ADC thô tốt nhất gần nhất để lọc nhiễu ngoại lai
volatile float servo_current_A = 0.0f;  // Dòng điện servo thực tế (Ampere)
volatile unsigned long lastAutoActionTime = 0;
volatile bool emergencyKetCong = false;
volatile bool emergencyStopWeb = false;
volatile bool isPaused = false;
volatile bool isServoBusy = false;
volatile bool syncEmergencyPush = false;
volatile bool syncEmergencyClear = false;
volatile int mp3Volume = 25;
volatile bool dfPlayerReady = false;
volatile bool is4GConnected = false;
volatile int webPlayAudio = 0;
volatile int webLoopAudio = 0;
volatile int webStopAudio = 0;
volatile bool syncModeToFirebase = false;

volatile float pin_volt = 0.0f;
volatile float solar_dong_sac = 0.0f;
volatile float solar_cong_suat = 0.0f;
volatile float pin_phan_tram = 0.0f;
volatile float webCommandTarget = -1.0f;

enum GateCommand { CMD_NONE = 0, CMD_MANUAL_OPEN, CMD_MANUAL_CLOSE, CMD_AI_OPEN, CMD_AI_CLOSE, CMD_STOP };
struct QueueItem {
  GateCommand cmd;
  int audioFile;
  bool isLoop;
  int stopAudio;
  int setVolume;
};

QueueHandle_t servoCmdQueue;
SemaphoreHandle_t lcdMutex;
TaskHandle_t TaskServoHandle;
TaskHandle_t TaskCoreHandle;
TaskHandle_t TaskNetwork4GHandle;

void initWatchdog() {
#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  esp_task_wdt_config_t twdt_config = { .timeout_ms = WDT_TIMEOUT * 1000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&twdt_config);
#else
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_delete(xTaskGetIdleTaskHandleForCPU(0));
#endif
}

bool httpPATCHWiFi(String path, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(FIREBASE_HOST) + path + ".json?auth=" + String(FIREBASE_AUTH));
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PATCH(jsonPayload);
  http.end();
  return (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_NO_CONTENT || httpCode == 200);
}

String httpGETWiFi(String path) {
  if (WiFi.status() != WL_CONNECTED) return "";
  HTTPClient http;
  http.begin(String(FIREBASE_HOST) + path + ".json?auth=" + String(FIREBASE_AUTH));
  int httpCode = http.GET();
  String payload = (httpCode > 0) ? http.getString() : "";
  http.end();
  return payload;
}

void updateLCD() {
  if (xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    char row0[17]; char row1[17];
    bool showLowBatCong = (pin_volt < 11.1f && pin_volt > 0.1f) && ((millis() / 1000) % 2 == 0);
    bool showLowBatPhao = (hasRemoteData && remoteBatV < 3.7f && remoteBatV > 0.1f) && ((millis() / 1000) % 2 == 0);

    if (!hasRemoteData) {
      if (millis() < 20000) { snprintf(row0, sizeof(row0), "Dang doi Phao.."); } 
      else if (showLowBatCong) { snprintf(row0, sizeof(row0), "PIN CONG YEU!!  "); } 
      else {
        if ((millis() / 3000) % 2 == 0) { snprintf(row0, sizeof(row0), "MAT KET NOI PHAO"); } 
        else { int n = snprintf(row0, sizeof(row0), "Pin Cong: %.1fV", pin_volt); for (int i = n; i < 16; i++) row0[i] = ' '; row0[16] = '\0'; }
      }
    } else {
      if (showLowBatPhao) { snprintf(row0, sizeof(row0), "PIN PHAO YEU!!  "); } 
      else if (showLowBatCong) { snprintf(row0, sizeof(row0), "PIN CONG YEU!!  "); } 
      else {
        int cycle = (millis() / 3000) % 3;
        float dispSal = (remoteSalinity < 0.0f) ? 0.0f : remoteSalinity;
        int n = 0;
        if (cycle == 0) { n = snprintf(row0, sizeof(row0), "M:%.2fp T:%.1fC", dispSal, remoteTemp); } 
        else if (cycle == 1) { n = snprintf(row0, sizeof(row0), "M:%.2fp C:%.1fV", dispSal, pin_volt); }
        else { n = snprintf(row0, sizeof(row0), "M:%.2fp P:%.1fV", dispSal, remoteBatV); }
        for (int i = n; i < 16; i++) row0[i] = ' '; row0[16] = '\0';
      }
    }

    if (emergencyStopWeb || emergencyKetCong) { snprintf(row1, sizeof(row1), "DUNG KHAN CAP!  "); } 
    else if (autoCloseCountdown >= 0) { int n = snprintf(row1, sizeof(row1), "DONG SAU: %ds! ", autoCloseCountdown); for (int i = n; i < 16; i++) row1[i] = ' '; row1[16] = '\0'; } 
    else {
      const char* gateStr;
      if (movingDirection == 1) gateStr = "D.MO"; else if (movingDirection == -1) gateStr = "D.DG";
      else if (isPaused) gateStr = "DUNG"; else if (gateState == 1) gateStr = "MO"; else gateStr = "DONG";
      const char* wifiStr = (WiFi.status() == WL_CONNECTED) ? "W:OK" : "W:!!";
      
      char lockBuf[8];
      if (isPanelLocked) {
          strcpy(lockBuf, "LOCK");
      } else if (opMode == 1) {
          strcpy(lockBuf, "AUTO");
      } else {
          strcpy(lockBuf, "MANU");
      }
      
      int n = snprintf(row1, sizeof(row1), "C:%s %s %s", gateStr, lockBuf, wifiStr);
      for (int i = n; i < 16; i++) row1[i] = ' '; row1[16] = '\0';
    }
    
    lcd.setCursor(0, 0); lcd.print(row0); lcd.setCursor(0, 1); lcd.print(row1);
    xSemaphoreGive(lcdMutex);
  }
}

Adafruit_INA3221 inaCong;
uint8_t active_ina_addr = 0x40;

bool initINA3221Cong() {
  uint8_t ina_addrs[] = {0x40, 0x41, 0x42, 0x43};
  for (int i = 0; i < 4; i++) { if (inaCong.begin(ina_addrs[i], &Wire)) { active_ina_addr = ina_addrs[i]; return true; } }
  return false;
}

float filteredWaterLevel1 = 0.0f;
float filteredWaterLevel2 = 0.0f;
const float EMA_ALPHA = 0.3f;

float measureUltrasonicAdvanced(int trigPin, int echoPin, float &filteredValue) {
  float samples[5] = {0}; int validCount = 0;
  for (int i = 0; i < 5; i++) {
    digitalWrite(trigPin, LOW); delayMicroseconds(2); digitalWrite(trigPin, HIGH); delayMicroseconds(10); digitalWrite(trigPin, LOW);
    long dur = pulseIn(echoPin, HIGH, 18000);
    if (dur > 0) { float d = (dur / 2.0f) * 0.0343f; if (d >= 2.0f && d <= 30.0f) samples[validCount++] = d; }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
  if (validCount == 0) return -1.0f;
  for (int i = 0; i < validCount - 1; i++) {
    for (int j = i + 1; j < validCount; j++) {
      if (samples[i] > samples[j]) { float t = samples[i]; samples[i] = samples[j]; samples[j] = t; }
    }
  }
  float medianValue = samples[validCount / 2];
  static int rejectCount[2] = {0, 0}; int idx = (trigPin == TRIG_PIN) ? 0 : 1;

  if (filteredValue == 0.0f) { filteredValue = medianValue; } 
  else {
    if (abs(medianValue - filteredValue) > 8.0f) {
       rejectCount[idx]++; if (rejectCount[idx] > 3) { filteredValue = medianValue; rejectCount[idx] = 0; }
    } else { filteredValue = (EMA_ALPHA * medianValue) + ((1.0f - EMA_ALPHA) * filteredValue); rejectCount[idx] = 0; }
  }
  return filteredValue;
}

void readUltrasonic() {
  float raw1 = measureUltrasonicAdvanced(TRIG_PIN, ECHO_PIN, filteredWaterLevel1);
  if (raw1 > 0.0f) waterLevel = raw1;
  
  vTaskDelay(pdMS_TO_TICKS(40));
  
  float raw2 = measureUltrasonicAdvanced(TRIG_2_PIN, ECHO_2_PIN, filteredWaterLevel2);
  // BÙ TRỪ SAI SỐ CƠ KHÍ CHO CẢM BIẾN NGOÀI: Cộng thêm 1.3cm vào khoảng cách đo được
  if (raw2 > 0.0f) waterLevel_2 = raw2 + 1.3f; 
}

enum ServoFsmState { FSM_IDLE = 0, FSM_PLAY_SOUND, FSM_WAIT_SOUND, FSM_MOVING };

void Task_Servo(void *pvParameters) {
  ESP32PWM::allocateTimer(2); ESP32PWM::allocateTimer(3);
  gateServo.setPeriodHertz(50); gateServo.attach(SERVO_PIN, 500, 2500);
  gateServo.writeMicroseconds(SERVO_STOP_US); vTaskDelay(pdMS_TO_TICKS(200));

  QueueItem item; GateCommand activeCmd = CMD_NONE; int activeAudio = 0;
  ServoFsmState fsmState = FSM_IDLE;
  unsigned long stateStartTime = 0; unsigned long currentSoundDuration = 0;
  unsigned long overloadStart = 0; int playCount = 0;

  for (;;) {
    unsigned long now = millis();
    if (emergencyKetCong || emergencyStopWeb) {
      if (fsmState != FSM_IDLE || movingDirection != 0) { gateServo.writeMicroseconds(SERVO_STOP_US); movingDirection = 0; fsmState = FSM_IDLE; }
      if (emergencyKetCong || emergencyStopWeb) digitalWrite(LED_PIN, ((now / 120) % 2 == 0) ? HIGH : LOW);
      
      while (xQueueReceive(servoCmdQueue, &item, 0) == pdTRUE) {
        if (item.audioFile > 0 && dfPlayerReady) {
          if (item.isLoop) player.setCycleMode(DY::PlayMode::RepeatOne); else player.setCycleMode(DY::PlayMode::OneOff);
          vTaskDelay(pdMS_TO_TICKS(50)); player.playSpecified(item.audioFile); vTaskDelay(pdMS_TO_TICKS(50));
        } else if (item.stopAudio == 1 && dfPlayerReady) player.stop();
      }
      vTaskDelay(pdMS_TO_TICKS(20)); continue;
    }

    if (xQueueReceive(servoCmdQueue, &item, 0) == pdTRUE) {
      if (item.stopAudio == 1 && dfPlayerReady) player.stop();
      if (item.setVolume >= 0 && item.setVolume <= 30 && dfPlayerReady) player.setVolume(item.setVolume);

      if (item.cmd == CMD_STOP) {
        gateServo.writeMicroseconds(SERVO_STOP_US); movingDirection = 0; digitalWrite(LED_PIN, LOW);
        fsmState = FSM_IDLE; isPaused = true; updateLCD();
        if (item.audioFile > 0 && dfPlayerReady) {
          if (item.isLoop) player.setCycleMode(DY::PlayMode::RepeatOne); else player.setCycleMode(DY::PlayMode::OneOff);
          vTaskDelay(pdMS_TO_TICKS(50)); player.playSpecified(item.audioFile); vTaskDelay(pdMS_TO_TICKS(50));
        }
      } 
      else if (fsmState == FSM_IDLE) {
        if (item.cmd == CMD_MANUAL_OPEN || item.cmd == CMD_AI_OPEN) { activeCmd = item.cmd; activeAudio = item.audioFile; movingDirection = 1; isPaused = false; fsmState = FSM_PLAY_SOUND; } 
        else if (item.cmd == CMD_MANUAL_CLOSE || item.cmd == CMD_AI_CLOSE) { activeCmd = item.cmd; activeAudio = item.audioFile; movingDirection = -1; isPaused = false; fsmState = FSM_PLAY_SOUND; } 
        else if (item.cmd == CMD_NONE && item.audioFile > 0 && item.stopAudio == 0 && dfPlayerReady) {
          if (item.isLoop) player.setCycleMode(DY::PlayMode::RepeatOne); else player.setCycleMode(DY::PlayMode::OneOff);
          vTaskDelay(pdMS_TO_TICKS(50)); player.playSpecified(item.audioFile);
        }
      }
    }

    if (fsmState != FSM_IDLE) {
      digitalWrite(LED_PIN, ((now / 250) % 2 == 0) ? HIGH : LOW);
    } else if (remoteDarkMode == 1 && hasRemoteData) {
      digitalWrite(LED_PIN, ((now / 500) % 2 == 0) ? HIGH : LOW);
    } else {
      digitalWrite(LED_PIN, LOW);
    }

    switch (fsmState) {
      case FSM_IDLE: break;
      case FSM_PLAY_SOUND: {
        int mp3Track = activeAudio;
        if (mp3Track == 0) {
           if (activeCmd == CMD_AI_OPEN) mp3Track = 2; else if (activeCmd == CMD_AI_CLOSE) mp3Track = 1;
           else if (activeCmd == CMD_MANUAL_OPEN) mp3Track = 7; else if (activeCmd == CMD_MANUAL_CLOSE) mp3Track = 6;
        }
        playCount = 1; 
        if (dfPlayerReady && mp3Track != 0) { player.setCycleMode(DY::PlayMode::OneOff); vTaskDelay(pdMS_TO_TICKS(50)); player.playSpecified(mp3Track); vTaskDelay(pdMS_TO_TICKS(50)); } else currentSoundDuration = 0;
        
        if (mp3Track == 33 || mp3Track == 34 || mp3Track == 35) currentSoundDuration = 7000;
        else if (mp3Track == 31 || mp3Track == 32) currentSoundDuration = 6500;
        else currentSoundDuration = 5500;
        
        stateStartTime = now; fsmState = FSM_WAIT_SOUND;
        break;
      }
      case FSM_WAIT_SOUND:
        if (now - stateStartTime >= currentSoundDuration) {
          if (playCount < 2 && dfPlayerReady && currentSoundDuration > 0) {
            playCount++; int mp3Track = activeAudio;
            if (mp3Track == 0) {
               if (activeCmd == CMD_AI_OPEN) mp3Track = 2; else if (activeCmd == CMD_AI_CLOSE) mp3Track = 1;
               else if (activeCmd == CMD_MANUAL_OPEN) mp3Track = 7; else if (activeCmd == CMD_MANUAL_CLOSE) mp3Track = 6;
            }
            player.playSpecified(mp3Track); vTaskDelay(pdMS_TO_TICKS(50)); stateStartTime = now;
          } else {
            fsmState = FSM_MOVING; stateStartTime = now; overloadStart = 0; playCount = 0;
            if (movingDirection == 1) gateServo.writeMicroseconds(SERVO_FWD_US); else if (movingDirection == -1) gateServo.writeMicroseconds(SERVO_REV_US);
          }
        }
        break;
      case FSM_MOVING: {
        unsigned long elapsed = now - stateStartTime;

        // --- CONG TAC HANH TRINH ---
        bool swOpen  = (movingDirection ==  1 && digitalRead(SW_OPEN_PIN)  == LOW);
        bool swClose = (movingDirection == -1 && digitalRead(SW_CLOSE_PIN) == LOW);

        // --- PHAT HIEN KET: dung dong Ampere thuc (ACS712 5A) ---
        if (elapsed > 800 && servo_current_A > stallThreshold) {
          if (overloadStart == 0) overloadStart = now;
        } else overloadStart = 0;

        if (overloadStart != 0 && (now - overloadStart >= 400)) {
          gateServo.writeMicroseconds(SERVO_STOP_US); movingDirection = 0; overloadStart = 0;
          emergencyKetCong = true; syncEmergencyPush = true; fsmState = FSM_IDLE;
          QueueItem emgItem = {CMD_STOP, 19, false, 0, -1}; xQueueSend(servoCmdQueue, &emgItem, 0); updateLCD(); break;
        }

        // --- DUNG KHI: hanh trinh het HOAC du thoi gian ---
        if (swOpen || swClose || elapsed >= MOVE_TIME_MS) {
          gateServo.writeMicroseconds(SERVO_STOP_US); gateState = (movingDirection == 1) ? 1 : 0;
          movingDirection = 0; digitalWrite(LED_PIN, LOW); isPaused = false;
          preferences.begin("gate", false); preferences.putBool("state", gateState == 1); preferences.end();
          updateLCD(); fsmState = FSM_IDLE;
        }
        break;
      }
    }
    isServoBusy = (fsmState != FSM_IDLE);
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

void Task_Core(void *pvParameters) {
  unsigned long lastUs = 0; unsigned long lastLcd = 0; unsigned long lastBtnCheck = 0; unsigned long lastBatCheck = 0;

  for (;;) {
    unsigned long now = millis();
    if (hasRemoteData && now >= lastRemoteDataTime && (now - lastRemoteDataTime > 20000)) {
       hasRemoteData = false;
       isPhaoFullBatteryPlayed = false;
       isPhaoLowBatteryPlayed = false;
    }
    
    static unsigned long lastBatCheck = 0;

    if (newlyConnectedPhao) { 
       newlyConnectedPhao = false; 
       QueueItem item = {CMD_NONE, 25, false, 0, -1}; 
       xQueueSend(servoCmdQueue, &item, 0); 
       lastAutoActionTime = now; 
       lastBatCheck = now + 8000; // Ép hệ thống đợi 8 giây sau mới được kiểm tra Pin để nhường loa
    }
    static unsigned long lastServoBusyTime = 0;
    if (isServoBusy) { lastManualActionTime = now; lastServoBusyTime = now; }
    
    static unsigned long lastAcs = 0;
    if (now - lastAcs >= 150) { // Đọc định kỳ mỗi 150ms để nhường CPU và tăng độ chính xác
      lastAcs = now;
      const float R1 = 10.0f, R2 = 20.0f, SENS = 0.185f;
      long sumAcs = 0;
      int numSamples = 100; // Tăng lên 100 mẫu như yêu cầu
      for (int i = 0; i < numSamples; i++) {
        sumAcs += analogRead(ACS712_PIN);
        vTaskDelay(pdMS_TO_TICKS(1)); // Nhường CPU cho các task khác
      }
      float avgRaw = (float)sumAcs / (float)numSamples;

      // Loại bỏ mẫu nhiễu ngoại lai đột biến (nếu có)
      if (avgRaw < 100.0f || avgRaw > 4000.0f) {
        avgRaw = lastGoodRaw;
      } else {
        lastGoodRaw = avgRaw;
      }

      float v_esp    = avgRaw * (3.3f / 4095.0f);
      float v_sensor = v_esp * ((R1 + R2) / R2);
      
      // KHÔNG CÓ CẬP NHẬT BASELINE ĐỘNG Ở ĐÂY NỮA, baseline_V giữ nguyên giá trị calib lúc khởi động

      float cur_A = abs((v_sensor - acsBaseline_V) / SENS);
      if (cur_A < 0.02f) cur_A = 0.0f;

      // Bộ lọc EMA làm mượt hiển thị dòng điện
      static float filteredCur = 0.0f;
      if (filteredCur == 0.0f) filteredCur = cur_A;
      else filteredCur = 0.7f * filteredCur + 0.3f * cur_A;

      servo_current_A = filteredCur;
      dong_dien_tho = filteredCur;

      static unsigned long lastSerialPrint = 0;
      if (now - lastSerialPrint >= 1000 || (movingDirection != 0 && (now - lastSerialPrint >= 150))) {
        lastSerialPrint = now;
        Serial.printf("[ACS712] ADC:%.0f | Sen:%.3fV | Cur:%.2fA | Dir:%d\n", avgRaw, v_sensor, filteredCur, movingDirection);
      }
    }

    if (now - lastUs >= 500) {
      lastUs = now; readUltrasonic();

      float busVoltage = inaCong.getBusVoltage(INA_CH_BATTERY);
      float shuntVoltage = inaCong.getShuntVoltage(INA_CH_BATTERY) / 1000.0f;
      float v_raw = busVoltage + shuntVoltage;
      
      if (v_raw <= 0.1f) {
        static unsigned long lastInaRecovery = 0;
        if (now - lastInaRecovery >= 5000) { lastInaRecovery = now; Wire.begin(I2C_SDA, I2C_SCL); Wire.setClock(100000); initINA3221Cong(); }
      }
    }

    if (now - lastBatCheck >= 5000) {
      lastBatCheck = now;
      if (!isServoBusy && (now - lastServoBusyTime > 10000)) {
        float busVoltage = inaCong.getBusVoltage(INA_CH_BATTERY);
        float shuntVoltage = inaCong.getShuntVoltage(INA_CH_BATTERY) / 1000.0f;
        float v_raw = busVoltage + shuntVoltage;
        float calib_v = 0.9495f; pin_volt = v_raw * calib_v;
        float raw_current = inaCong.getCurrentAmps(INA_CH_BATTERY) * 1000.0f; float abs_current = fabsf(raw_current); float calib_factor = 2.1321f; 
        if (abs_current > 2.0f) solar_dong_sac = abs_current / calib_factor; else solar_dong_sac = 0.0f;
        solar_cong_suat = pin_volt * (solar_dong_sac / 1000.0f);
        
        int bat_percent = 0;
        if (pin_volt >= 12.6f) bat_percent = 100; else if (pin_volt <= 9.6f) bat_percent = 0;
        else bat_percent = (int)(((pin_volt - 9.6f) / (12.6f - 9.6f)) * 100.0f); pin_phan_tram = (float)bat_percent;

        if (pin_volt < 11.1f && !isCongLowBatteryPlayed) {
          isCongLowBatteryPlayed = true; isCongFullBatteryPlayed = false; QueueItem item = {CMD_NONE, 26, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
        } else if (pin_volt > 12.5f && !isCongFullBatteryPlayed) {
          isCongFullBatteryPlayed = true; isCongLowBatteryPlayed = false; QueueItem item = {CMD_NONE, 27, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
        }
        
        if (hasRemoteData && now > lastBatCheck) {
          if (remoteBatV < 3.7f && remoteBatV > 0.1f && !isPhaoLowBatteryPlayed) {
            isPhaoLowBatteryPlayed = true; isPhaoFullBatteryPlayed = false; QueueItem item = {CMD_NONE, 28, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
          } else if (remoteBatV > 4.1f && !isPhaoFullBatteryPlayed) {
            isPhaoFullBatteryPlayed = true; isPhaoLowBatteryPlayed = false; QueueItem item = {CMD_NONE, 29, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
          }
        }
      }
    }

    if (now - lastBtnCheck >= 50) {
      lastBtnCheck = now;
      if (digitalRead(BTN_STOP_PIN) == HIGH) {
        lastManualActionTime = millis(); unsigned long pressTime = millis(); bool isLongPress = false; int clickCount = 1;
        while (digitalRead(BTN_STOP_PIN) == HIGH) { if (millis() - pressTime >= 2000) { isLongPress = true; break; } vTaskDelay(pdMS_TO_TICKS(20)); }

        if (isLongPress) {
          if (!isPanelLocked) {
            opMode = (opMode == 1) ? 0 : 1; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000;
            QueueItem itemMode = {CMD_NONE, opMode == 1 ? 5 : 4, false, 0, -1}; xQueueSend(servoCmdQueue, &itemMode, 0);
          } else { syncRequestAccess = true; QueueItem item = {CMD_NONE, 23, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
          while (digitalRead(BTN_STOP_PIN) == HIGH) vTaskDelay(pdMS_TO_TICKS(50)); 
        } else {
          unsigned long releaseTime = millis();
          while (millis() - releaseTime < 400) {
             if (digitalRead(BTN_STOP_PIN) == HIGH) { clickCount = 2; while (digitalRead(BTN_STOP_PIN) == HIGH) vTaskDelay(pdMS_TO_TICKS(20)); break; }
             vTaskDelay(pdMS_TO_TICKS(20));
          }
          if (clickCount == 2) {
             isPanelLocked = false; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000;
             QueueItem item = {CMD_NONE, 24, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
          } else {
             if (isPanelLocked) {
                syncRequestAccess = true; QueueItem item = {CMD_NONE, 23, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
             } else {
                if (opMode == 1) {
                   opMode = 0; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000;
                   if (movingDirection == 0) { QueueItem itemMode = {CMD_NONE, 4, false, 0, -1}; xQueueSend(servoCmdQueue, &itemMode, 0); }
                }
                if (movingDirection != 0) {
                  QueueItem item = {CMD_STOP, 21, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); movingDirection = 0; 
                } else if (emergencyKetCong || emergencyStopWeb) {
                  emergencyKetCong = false; emergencyStopWeb = false; syncEmergencyClear = true; 
                  QueueItem item = {CMD_NONE, 0, false, 1, -1}; xQueueSend(servoCmdQueue, &item, 0); isPaused = true; updateLCD();
                } else {
                  QueueItem item = {CMD_STOP, 0, false, 1, -1}; xQueueSend(servoCmdQueue, &item, 0); webCommandTarget = -1.0f;
                }
             }
          }
        }
      }
      else if (!emergencyKetCong && !emergencyStopWeb && movingDirection == 0) {
        static unsigned long confirmOpenTime = 0; static unsigned long confirmCloseTime = 0;
        if (digitalRead(BTN_OPEN_PIN) == HIGH) {
          lastManualActionTime = millis();
          if (isPanelLocked) { syncRequestAccess = true; QueueItem item = {CMD_NONE, 23, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); while(digitalRead(BTN_OPEN_PIN) == HIGH) vTaskDelay(20); } 
          else {
            unsigned long pressTime = millis(); bool isLongPress = false;
            while(digitalRead(BTN_OPEN_PIN) == HIGH) { if (millis() - pressTime >= 2000) { isLongPress = true; break; } vTaskDelay(20); }
            if (isLongPress) {
              useUltrasonic = 1; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000;
              QueueItem item = {CMD_NONE, 3, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
              while(digitalRead(BTN_OPEN_PIN) == HIGH) vTaskDelay(20);
            } else {
              if (opMode == 1) { opMode = 0; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000; QueueItem itemMode = {CMD_NONE, 4, false, 0, -1}; xQueueSend(servoCmdQueue, &itemMode, 0); vTaskDelay(pdMS_TO_TICKS(4500)); }
              if (gateState == 1) { 
                 if (millis() - confirmOpenTime < 15000 && confirmOpenTime != 0) { QueueItem itemCmd = {CMD_MANUAL_OPEN, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &itemCmd, 0); confirmOpenTime = 0; } 
                 else { confirmOpenTime = millis(); QueueItem item = {CMD_NONE, 30, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
              } else { QueueItem itemCmd = {CMD_MANUAL_OPEN, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &itemCmd, 0); }
            }
          }
          lastManualActionTime = millis();
        }
        else if (digitalRead(BTN_CLOSE_PIN) == HIGH) {
          lastManualActionTime = millis();
          if (isPanelLocked) { syncRequestAccess = true; QueueItem item = {CMD_NONE, 23, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); while(digitalRead(BTN_CLOSE_PIN) == HIGH) vTaskDelay(20); } 
          else {
            unsigned long pressTime = millis(); bool isLongPress = false;
            while(digitalRead(BTN_CLOSE_PIN) == HIGH) { if (millis() - pressTime >= 2000) { isLongPress = true; break; } vTaskDelay(20); }
            if (isLongPress) {
              useUltrasonic = 0; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000;
              QueueItem item = {CMD_NONE, 3, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
              while(digitalRead(BTN_CLOSE_PIN) == HIGH) vTaskDelay(20);
            } else {
              if (opMode == 1) { opMode = 0; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000; QueueItem itemMode = {CMD_NONE, 4, false, 0, -1}; xQueueSend(servoCmdQueue, &itemMode, 0); vTaskDelay(pdMS_TO_TICKS(4500)); }
              if (gateState == 0) { 
                 if (millis() - confirmCloseTime < 15000 && confirmCloseTime != 0) { QueueItem itemCmd = {CMD_MANUAL_CLOSE, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &itemCmd, 0); confirmCloseTime = 0; } 
                 else { confirmCloseTime = millis(); QueueItem item = {CMD_NONE, 30, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
              } else { QueueItem itemCmd = {CMD_MANUAL_CLOSE, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &itemCmd, 0); }
            }
          }
          lastManualActionTime = millis();
        }
      }
    }

    if (opMode == 0) {
      bool isSalty = (hasRemoteData && remoteSalinity > salinityThreshold);
      if (isSalty && gateState == 1 && movingDirection == 0) {
        opMode = 1; syncModeToFirebase = true; blockFirebaseUpdateUntil = millis() + 5000; 
        QueueItem itemMode = {CMD_NONE, 5, false, 0, -1}; xQueueSend(servoCmdQueue, &itemMode, 0);
      } else {
        autoCloseCountdown = -1; autoCloseWarningStart = 0; float wct = webCommandTarget;
        if (wct >= 0.0f && movingDirection == 0) {
          lastManualActionTime = millis(); int targetState = (wct > 0.0f) ? 1 : 0;
          if (targetState != gateState) {
            if (targetState == 1) { QueueItem item = {CMD_MANUAL_OPEN, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); } 
            else { QueueItem item = {CMD_MANUAL_CLOSE, 0, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
          }
          webCommandTarget = -1.0f; 
        }
        // Removed the 30-second auto-revert timeout to allow True Manual mode.
        // The gate will now remain in Manual mode indefinitely unless isSalty is detected.
      }
    } else {
      static unsigned long stallDetectedAt = 0;
      if (emergencyKetCong && !emergencyStopWeb) {
        if (stallDetectedAt == 0) stallDetectedAt = millis();
      } else if (!emergencyKetCong) stallDetectedAt = 0;
    }

    if (opMode == 1 && !emergencyStopWeb && !emergencyKetCong && movingDirection == 0 && millis() > 15000) {
      if (now - lastAutoActionTime >= 3000) {
        bool isSalty = (remoteSalinity > salinityThreshold); bool phaoLost = !hasRemoteData;
        float currentInside = (sensorHeight - waterLevel); float currentOutside = (sensorHeight - waterLevel_2);
        bool isFlooding = (currentInside >= floodThreshold);

        if (phaoLost) {
          if (gateState == 1) { 
            if (autoCloseWarningStart == 0) { autoCloseWarningStart = now; QueueItem item = {CMD_NONE, 20, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
            unsigned long warningDuration = now - autoCloseWarningStart;
            if (warningDuration < 10000) { 
              autoCloseCountdown = 10 - (warningDuration / 1000);
              static unsigned long lastBeep = 0;
              if (now - lastBeep >= 2000) { lastBeep = now; QueueItem item = {CMD_NONE, 3, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
            } else {
              autoCloseCountdown = -1; autoCloseWarningStart = 0; lastAutoActionTime = now;
              QueueItem item = {CMD_AI_CLOSE, 20, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
            }
          } else { autoCloseCountdown = -1; autoCloseWarningStart = 0; }
        }
        else {
          autoCloseCountdown = -1; autoCloseWarningStart = 0;
          if (isSalty) {
            if (gateState == 1) {
              lastAutoActionTime = now;
              int mp3Track = (useUltrasonic == 1 && isFlooding) ? 33 : 1; 
              QueueItem item = {CMD_AI_CLOSE, mp3Track, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); 
            }
          } else {
            if (useUltrasonic == 1) {
              float diff = currentOutside - currentInside; 
              if (abs(diff) <= 3.0f) {
                if (gateState == 1) { lastAutoActionTime = now; QueueItem item = {CMD_AI_CLOSE, 31, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); } 
              } else if (diff > 3.0f) {
                if (gateState == 0) { lastAutoActionTime = now; QueueItem item = {CMD_AI_OPEN, 34, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); } 
              } else if (diff < -3.0f) {
                if (gateState == 0) { lastAutoActionTime = now; int mp3Track = isFlooding ? 32 : 35; QueueItem item = {CMD_AI_OPEN, mp3Track, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); }
              }
            } else {
              if (gateState == 0) {
                lastAutoActionTime = now; QueueItem item = {CMD_AI_OPEN, 2, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); 
              }
            }
          }
        }
      }
    }
    digitalWrite(LED_WHITE_PIN, (remoteDarkMode == 1 && hasRemoteData) ? LOW : HIGH);
    if (now - lastLcd >= 1000) { lastLcd = now; updateLCD(); } vTaskDelay(pdMS_TO_TICKS(50));
  }
}

void Task_NetworkWiFi(void *pvParameters) {
  unsigned long lastWifiSend = 0; unsigned long lastWifiAttempt = 0; int turnWifi = 0; 
  bool lastWifiStatus = false; bool firstBootWifiWarning = false;
  WiFi.setAutoReconnect(false); 

  for (;;) {
    unsigned long now = millis();
    bool currentWifiStatus = (WiFi.status() == WL_CONNECTED);
    
    // Announce changes in WiFi status (connect/disconnect)
    if (lastWifiStatus != currentWifiStatus && firstBootWifiWarning) { 
      QueueItem item = {CMD_NONE, currentWifiStatus ? 18 : 8, false, 0, -1}; 
      xQueueSend(servoCmdQueue, &item, 0); 
    }
    lastWifiStatus = currentWifiStatus;

    if (!currentWifiStatus) {
      // Rút ngắn chu kỳ tìm WiFi về 30 giây
      if (now - lastWifiAttempt > 30000 || lastWifiAttempt == 0) {
        lastWifiAttempt = now; 
        WiFi.disconnect(); 
        vTaskDelay(pdMS_TO_TICKS(100)); 
        WiFi.begin(WIFI_SSID, WIFI_PASS);
        
        unsigned long startWait = millis(); 
        // QUAN TRỌNG: Giới hạn quét cực nhanh 2 giây
        while (WiFi.status() != WL_CONNECTED && millis() - startWait < 2000) { 
            vTaskDelay(pdMS_TO_TICKS(500)); 
        }
        
        if (WiFi.status() == WL_CONNECTED) {
          is4GConnected = true;
          firstBootWifiWarning = true;
        } else {
          // Dò không ra mạng thì chuyển về Kênh 13 (Kênh ít nhiễu nhất)
          WiFi.disconnect(); 
          esp_wifi_set_promiscuous(true); 
          esp_wifi_set_channel(13, WIFI_SECOND_CHAN_NONE); 
          esp_wifi_set_promiscuous(false); 
          is4GConnected = false;
          if (!firstBootWifiWarning) { 
              firstBootWifiWarning = true; 
              QueueItem item = {CMD_NONE, 8, false, 0, -1}; 
              xQueueSend(servoCmdQueue, &item, 0); 
          }
        }
      }
      vTaskDelay(pdMS_TO_TICKS(1000)); continue;
    }

    if (syncModeToFirebase) {
      syncModeToFirebase = false;
      httpPATCHWiFi("control", "{\"mode\":" + String(opMode) + ",\"lock_panel\":" + String(isPanelLocked ? 1 : 0) + ",\"use_ultrasonic\":" + String(useUltrasonic == 1 ? "true" : "false") + "}");
    }

    unsigned long netInterval = (movingDirection != 0) ? 150 : 800; // Khi servo chay: day realtime 150ms
    if (now - lastWifiSend >= netInterval) { 
      lastWifiSend = now;
      // Khi servo dang quay, uu tien PATCH lien tuc de web thay dong dien chay muot realtime
      if (movingDirection != 0) turnWifi = 1;

      if (turnWifi == 0) {
        String ctrlRes = httpGETWiFi("control");
        if (ctrlRes.length() > 0) {
          
          int idxUltra = ctrlRes.indexOf("\"use_ultrasonic\":");
          if (idxUltra != -1 && millis() > blockFirebaseUpdateUntil) {
            String valStr = ctrlRes.substring(ctrlRes.indexOf(":", idxUltra) + 1, ctrlRes.indexOf(":", idxUltra) + 7);
            int uu = (valStr.indexOf("1") != -1 || valStr.indexOf("true") != -1) ? 1 : 0;
            if (uu != useUltrasonic) { useUltrasonic = uu; lastAutoActionTime = 0; }
          }
          
          int idxLock = ctrlRes.indexOf("\"lock_panel\":");
          if (idxLock != -1 && millis() > blockFirebaseUpdateUntil) {
            String valStr = ctrlRes.substring(ctrlRes.indexOf(":", idxLock) + 1, ctrlRes.indexOf(":", idxLock) + 7);
            bool newLock = (valStr.indexOf("1") != -1 || valStr.indexOf("true") != -1);
            if (newLock != isPanelLocked) {
              isPanelLocked = newLock;
              if (!isPanelLocked) { QueueItem item = {CMD_NONE, 24, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); httpPATCHWiFi("tram_cong", "{\"request_access\":0}"); } 
            }
          }
          
          int idxMode = ctrlRes.indexOf("\"mode\":");
          if (idxMode != -1 && millis() > blockFirebaseUpdateUntil) {
            String valStr = ctrlRes.substring(ctrlRes.indexOf(":", idxMode) + 1, ctrlRes.indexOf(":", idxMode) + 7);
            int newMode = (valStr.indexOf("1") != -1 || valStr.indexOf("true") != -1) ? 1 : 0;
            if (newMode != opMode) {
              opMode = newMode; lastAutoActionTime = 0; if (opMode == 0) lastManualActionTime = millis(); 
              QueueItem item = {CMD_NONE, opMode == 1 ? 5 : 4, false, 0, -1}; xQueueSend(servoCmdQueue, &item, 0);
            }
          }

          int idxEmg = ctrlRes.indexOf("\"emergency_stop\":");
          if (idxEmg != -1) {
            String valStr = ctrlRes.substring(ctrlRes.indexOf(":", idxEmg) + 1, ctrlRes.indexOf(":", idxEmg) + 7);
            int es = (valStr.indexOf("1") != -1 || valStr.indexOf("true") != -1) ? 1 : 0;
            if (es == 1 && !emergencyStopWeb) { emergencyStopWeb = true; QueueItem item = {CMD_STOP, 22, true, 0, -1}; xQueueSend(servoCmdQueue, &item, 0); } 
            else if (es == 0 && (emergencyStopWeb || emergencyKetCong)) { emergencyStopWeb = false; emergencyKetCong = false; QueueItem item = {CMD_NONE, 0, false, 1, -1}; xQueueSend(servoCmdQueue, &item, 0); }
          }

          int idxSal = ctrlRes.indexOf("\"salinity_threshold\":"); if (idxSal == -1) idxSal = ctrlRes.indexOf("\"threshold\":");
          if (idxSal != -1) { float v = ctrlRes.substring(ctrlRes.indexOf(":", idxSal) + 1).toFloat(); if (v >= 0.0f && fabsf(v - salinityThreshold) > 0.001f) { salinityThreshold = v; lastAutoActionTime = 0; } }

          int idxFlood = ctrlRes.indexOf("\"flood_threshold\":");
          if (idxFlood != -1) { float v = ctrlRes.substring(ctrlRes.indexOf(":", idxFlood) + 1).toFloat(); if (v > 0.0f) { floodThreshold = v; lastAutoActionTime = 0; } }

          int idxStall = ctrlRes.indexOf("\"stall_threshold\":");
          if (idxStall != -1) { float v = ctrlRes.substring(ctrlRes.indexOf(":", idxStall) + 1).toFloat(); if (v > 0.0f) { stallThreshold = v; } }

          int idxHeight = ctrlRes.indexOf("\"sensor_height\":");
          if (idxHeight != -1) { float v = ctrlRes.substring(ctrlRes.indexOf(":", idxHeight) + 1).toFloat(); if (v > 0.0f) { sensorHeight = v; lastAutoActionTime = 0; } }

          int idxVol = ctrlRes.indexOf("\"volume\":");
          if (idxVol != -1) { int v = ctrlRes.substring(ctrlRes.indexOf(":", idxVol) + 1).toInt(); if (v >= 0 && v <= 30 && v != mp3Volume) { mp3Volume = v; QueueItem item = {CMD_NONE, 0, false, 0, mp3Volume}; xQueueSend(servoCmdQueue, &item, 0); } }

          int idxPlay = ctrlRes.indexOf("\"play_audio\":");
          if (idxPlay != -1) { int pa = ctrlRes.substring(ctrlRes.indexOf(":", idxPlay) + 1).toInt(); if (pa >= 9 && pa <= 35) { webPlayAudio = pa; webStopAudio = 0; QueueItem item = {CMD_NONE, webPlayAudio, (webLoopAudio == 1), 0, -1}; xQueueSend(servoCmdQueue, &item, 0); httpPATCHWiFi("control", "{\"play_audio\":0}"); } }

          int idxStopAudio = ctrlRes.indexOf("\"stop_audio\":");
          if (idxStopAudio != -1) { int sa = ctrlRes.substring(ctrlRes.indexOf(":", idxStopAudio) + 1).toInt(); if (sa == 1) { webStopAudio = 1; webPlayAudio = 0; QueueItem item = {CMD_NONE, 0, false, 1, -1}; xQueueSend(servoCmdQueue, &item, 0); httpPATCHWiFi("control", "{\"stop_audio\":0}"); } }

          int idxTarget = ctrlRes.indexOf("\"gate_target\":"); if (idxTarget == -1) idxTarget = ctrlRes.indexOf("\"target\":");
          if (idxTarget != -1) {
            float target = ctrlRes.substring(ctrlRes.indexOf(":", idxTarget) + 1).toFloat();
            if (opMode == 0 && !emergencyStopWeb && !emergencyKetCong && target >= 0.0f) {
              webCommandTarget = target; 
              if (ctrlRes.indexOf("\"gate_target\":") != -1) httpPATCHWiFi("control", "{\"gate_target\":-1}");
              if (ctrlRes.indexOf("\"target\":") != -1) httpPATCHWiFi("control", "{\"target\":-1}");
            }
          }
        }
        if (syncEmergencyPush) { httpPATCHWiFi("control", "{\"emergency_stop\":1}"); syncEmergencyPush = false; }
        if (syncEmergencyClear) { httpPATCHWiFi("control", "{\"emergency_stop\":0}"); syncEmergencyClear = false; }
        if (syncRequestAccess) { httpPATCHWiFi("tram_cong", "{\"request_access\":1}"); syncRequestAccess = false; }
        
        turnWifi = 1; 
      }
      else if (turnWifi == 1) {
        int statusVal = gateState; if (movingDirection == 1) statusVal = 2; else if (movingDirection == -1) statusVal = 3;
        float sendCongBatV = (pin_volt > 0.1f) ? pin_volt : 12.04f; float sendCongBatPct = (pin_phan_tram > 0.1f) ? pin_phan_tram : 81.0f;

        String batchPayload = "{";
        batchPayload += "\"tram_cong/khoang_cach_sieu_am\":" + String(waterLevel, 1) + ",";
        batchPayload += "\"tram_cong/khoang_cach_sieu_am_ngoai\":" + String(waterLevel_2, 1) + ",";
        batchPayload += "\"tram_cong/muc_nuoc\":" + String(sensorHeight - waterLevel, 1) + ",";
        batchPayload += "\"tram_cong/dong_dien_tho\":" + String(dong_dien_tho, 2) + ",";
        batchPayload += "\"tram_cong/gate_status\":" + String(statusVal) + ",";
        batchPayload += "\"tram_cong/heartbeatcong\":{\".sv\":\"timestamp\"},";
        batchPayload += "\"tram_cong/emergency_ket_cong\":" + String(emergencyKetCong ? 1 : 0) + ",";
        batchPayload += "\"tram_cong/current_mode\":" + String(opMode) + ",";
        batchPayload += "\"tram_cong/lock_panel\":" + String(isPanelLocked ? 1 : 0) + ",";
        batchPayload += "\"tram_cong/pin_volt\":" + String(sendCongBatV, 2) + ",";
        batchPayload += "\"tram_cong/solar_dong_sac\":" + String(solar_dong_sac, 1) + ",";
        batchPayload += "\"tram_cong/solar_cong_suat\":" + String(solar_cong_suat, 2) + ",";
        batchPayload += "\"tram_cong/pin_phan_tram\":" + String(sendCongBatPct, 1) + ",";

        batchPayload += "\"tram_phao/do_man\":" + String(remoteSalinity, 2) + ",";
        batchPayload += "\"tram_phao/nhiet_do\":" + String(remoteTemp, 1) + ",";
        batchPayload += "\"tram_phao/temp\":" + String(remoteTemp, 1) + ",";
        batchPayload += "\"tram_phao/pin_volt\":" + String(remoteBatV, 2) + ",";
        batchPayload += "\"tram_phao/pin_phan_tram\":" + String(remoteBatPct, 1) + ",";
        batchPayload += "\"tram_phao/solar_volt\":" + String(remoteSolarV, 2) + ",";
        batchPayload += "\"tram_phao/solar_dong_sac\":" + String(remoteSolarI, 1) + ",";
        batchPayload += "\"tram_phao/solar_cong_suat\":" + String(remoteSolarP, 2) + ",";
        batchPayload += "\"tram_phao/trang_thai_dem\":" + String(remoteDarkMode);
        
        if (hasRemoteData) {
            batchPayload += ",\"tram_phao/heartbeatphao\":{\".sv\":\"timestamp\"}";
        }
        batchPayload += "}";

        httpPATCHWiFi("", batchPayload); 
        
        turnWifi = 0; 
      }
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void scanI2CBusCong() {
  byte count = 0; for (byte address = 1; address < 127; address++) { Wire.beginTransmission(address); if (Wire.endTransmission() == 0) count++; }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT); pinMode(TRIG_2_PIN, OUTPUT); pinMode(ECHO_2_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, LOW); pinMode(LED_WHITE_PIN, OUTPUT); digitalWrite(LED_WHITE_PIN, HIGH);
  pinMode(BTN_OPEN_PIN, INPUT_PULLDOWN); pinMode(BTN_STOP_PIN, INPUT_PULLDOWN); pinMode(BTN_CLOSE_PIN, INPUT_PULLDOWN);
  pinMode(SW_OPEN_PIN, INPUT); pinMode(SW_CLOSE_PIN, INPUT);

  initWatchdog(); servoCmdQueue = xQueueCreate(20, sizeof(QueueItem)); lcdMutex = xSemaphoreCreateMutex();

  Wire.begin(I2C_SDA, I2C_SCL); Wire.setClock(100000); delay(100); scanI2CBusCong(); initINA3221Cong();

  lcd.init(); lcd.backlight(); lcd.setCursor(0, 0); lcd.print("TRAM CONG V12.16"); lcd.setCursor(0, 1); lcd.print("BOOTING...");
  preferences.begin("gate", false); gateState = preferences.getBool("state", true) ? 1 : 0; preferences.end();

  WiFi.mode(WIFI_AP_STA); esp_wifi_set_promiscuous(true); esp_wifi_set_channel(13, WIFI_SECOND_CHAN_NONE); esp_wifi_set_promiscuous(false);
  if (esp_now_init() == ESP_OK) esp_now_register_recv_cb(OnDataRecv); lastRemoteDataTime = millis();

  dfSerial.begin(9600, SERIAL_8N1, DF_RX, DF_TX); delay(300); player.begin(); delay(50); player.setVolume(mp3Volume); delay(50);
  dfPlayerReady = true;

  // Calib moc 0A cho ACS712 ở CUỐI setup (khi mọi linh kiện khác như LCD, Wifi, INA3221 đã khởi tạo xong để có baseline chính xác nhất)
  Serial.println("[ACS712] Dang tu dong calib moc 0A...");
  {
    long rawSum = 0;
    for (int i = 0; i < 200; i++) { 
      rawSum += analogRead(ACS712_PIN); 
      delay(5); 
    }
    float avgRaw = (float)rawSum / 200.0f;
    float v_esp = avgRaw * (3.3f / 4095.0f);
    acsBaseline_V = v_esp * (30.0f / 20.0f);
    lastGoodRaw = avgRaw; // Khởi tạo giá trị ADC thô ban đầu tốt nhất
    Serial.printf("[ACS712] Calib xong 0A: Raw ADC=%.1f | V_esp=%.3fV | V_offset=%.3fV\n", avgRaw, v_esp, acsBaseline_V);
  }

  xTaskCreatePinnedToCore(Task_Servo, "ServoTask", 16384, NULL, 5, &TaskServoHandle, 1);
  xTaskCreatePinnedToCore(Task_Core, "CoreTask", 8192, NULL, 3, &TaskCoreHandle, 1);
  xTaskCreatePinnedToCore(Task_NetworkWiFi, "NetworkWiFiTask", 16384, NULL, 1, &TaskNetwork4GHandle, 0);
}

void loop() { vTaskDelay(pdMS_TO_TICKS(1000)); }
