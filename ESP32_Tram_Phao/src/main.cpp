// ========================================================================
// TRẠM PHAO ĐO MẶN - Phiên bản 4.0 (FreeRTOS Multi-Core: Không Bao Giờ Đơ)
// Core 1: Đọc cảm biến & Chớp LED (Chạy mượt 100% không phụ thuộc mạng)
// Core 0: Gửi Firebase & Quản lý WiFi (Chạy ngầm ở Background)
// ========================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <INA3221.h>
#include <esp_task_wdt.h>

// ========== CHÂN KẾT NỐI ==========
#define TDS_PIN         34   // Cảm biến độ mặn (Analog)
#define TEMP_PIN        14   // DS18B20 (1-Wire)
#define LDR_PIN         32   // Quang trở
#define LED_PIN         27   // LED báo ngày/đêm

// INA3221 (I2C: SDA=21, SCL=22)
#define INA_CHANNEL_BAT   0
#define INA_CHANNEL_SOLAR 1

// Ngưỡng Pin 1S (18650 / LiPo 3.7V)
#define BAT_VOLTAGE_MAX   4.2f  
#define BAT_VOLTAGE_MIN   3.3f  

// ========== NGƯỠNG & HẰNG SỐ CẢM BIẾN ==========
const int LIGHT_THRESHOLD  = 600; 
const float TEMP_COEFF     = 0.019f;
const float TEMP_REF       = 25.0f;
#define FILTER_SIZE          3
#define WDT_TIMEOUT          30 

// ========== ĐỐI TƯỢNG CẢM BIẾN & MẠNG ==========
OneWire           oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);
INA3221           ina3221(0x40);

// ========== CẤU TRÚC ESP-NOW ==========
uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

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
esp_now_peer_info_t peerInfo;

// ========== BIẾN TOÀN CỤC (THREAD-SAFE ATOMIC) ==========
float tdsBuffer[FILTER_SIZE];
int   tdsIndex = 0;
float tdsSum   = 0;
static float emaSalinity = -1.0f;

volatile float currentSalinity = 0.0f;
volatile float currentTemp     = 25.0f;
volatile float batteryVoltage  = 0.0f;
volatile float batteryPercent  = 0.0f;
volatile float solarVoltage    = 0.0f;
volatile float solarCurrent    = 0.0f; // Dòng sạc Solar (mA)
volatile float solarPower      = 0.0f; // Công suất sạc Solar (W)

volatile bool  darkMode        = false;

// Task Handles
TaskHandle_t TaskSensorHandle;
TaskHandle_t TaskNetworkHandle;

// ========== PROTOTYPE CÁC HÀM ==========
void  initWatchdog();
float readRawSalinity();
float filterSalinity(float raw);
float compensateTemperature(float salinityRaw, float temp);
void  readINA3221();
float calcBatteryPercent(float voltage);
void  handleLED(unsigned long now);
void  readAllSensors();

// ========================================================================
// 1. WATCHDOG TIMER
// ========================================================================
void initWatchdog() {
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_delete(xTaskGetIdleTaskHandleForCPU(0));
}
float readRawSalinity() {
  long sumRaw = 0;
  for (int i = 0; i < 30; i++) {
    sumRaw += analogRead(TDS_PIN);
    delay(2);
  }
  float voltage  = (sumRaw / 30.0f) * (3.3f / 4095.0f);
  float salinity = (133.42f * pow(voltage, 3) - 255.86f * pow(voltage, 2) + 857.39f * voltage) * 0.5f / 1000.0f;
  if (salinity < 0) salinity = 0;
  return salinity;
}

float filterSalinity(float raw) {
  tdsSum -= tdsBuffer[tdsIndex];
  tdsBuffer[tdsIndex] = raw;
  tdsSum += raw;
  tdsIndex = (tdsIndex + 1) % FILTER_SIZE;
  float avg = tdsSum / FILTER_SIZE;

  if (emaSalinity < 0.0f) {
    emaSalinity = avg;
  } else {
    emaSalinity = (emaSalinity * 0.75f) + (avg * 0.25f);
  }
  return emaSalinity;
}

float compensateTemperature(float salinityRaw, float temp) {
  float factor = 1.0f + TEMP_COEFF * (temp - TEMP_REF);
  if (factor <= 0.01f) factor = 0.01f;
  return salinityRaw / factor;
}

// ========================================================================
// 4. ĐỌC MẠCH INA3221 (PIN & SOLAR)
// ========================================================================
float calcBatteryPercent(float voltage) {
  if (voltage >= BAT_VOLTAGE_MAX) return 100.0f;
  if (voltage <= BAT_VOLTAGE_MIN) return 0.0f;
  return (voltage - BAT_VOLTAGE_MIN) / (BAT_VOLTAGE_MAX - BAT_VOLTAGE_MIN) * 100.0f;
}

void readINA3221() {
  // Đọc Kênh 0 (Pin Cục / Battery) + Hiệu chuẩn theo VOM đồng hồ đo thực tế (4.0V / 4.384V = 0.9124)
  float rawBatV = ina3221.getBusVoltage(INA_CHANNEL_BAT);
  if (rawBatV > 0.5f) { // Lọc nhiễu I2C (Error 263): Chỉ cập nhật khi đọc được điện áp hợp lệ > 0.5V
    batteryVoltage = rawBatV * 0.9124f; 
    batteryPercent = calcBatteryPercent(batteryVoltage);
  }

  // Đọc Kênh 1 (Solar Panel Năng Lượng Mặt Trời)
  float rawSolarV = ina3221.getBusVoltage(INA_CHANNEL_SOLAR);
  if (rawSolarV >= 0.0f) solarVoltage = rawSolarV;

  float mA = ina3221.getCurrent_mA(INA_CHANNEL_SOLAR);
  if (mA < 0.0f) mA = 0.0f; // Lọc nhiễu âm
  solarCurrent = mA;
  solarPower   = (solarVoltage * solarCurrent) / 1000.0f; // Tính Công suất sạc (Watts)

  // In Debug Serial mỗi 5s để dễ theo dõi trực tiếp trên máy tính
  static unsigned long lastInaLog = 0;
  if (millis() - lastInaLog >= 5000) {
    lastInaLog = millis();
    Serial.printf("[INA3221] 🔋 Pin: %.2fV (%.1f%%) | ☀️ Solar: %.2fV | Dòng Sạc: %.1fmA | Công Suất: %.2fW\n",
                  batteryVoltage, batteryPercent, solarVoltage, solarCurrent, solarPower);
  }
}

// ========================================================================
// 5. QUẢN LÝ LED THEO QUANG TRỞ (LDR)
// ========================================================================
void handleLED(unsigned long now) {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  int ldrValue = analogRead(LDR_PIN);
  if (ldrValue < LIGHT_THRESHOLD) darkMode = true;
  else if (ldrValue > LIGHT_THRESHOLD + 200) darkMode = false;

  if (darkMode) {
    if (now - lastBlink >= 500) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState);
      lastBlink = now;
    }
  } else {
    digitalWrite(LED_PIN, LOW);
    ledState = false;
  }
}

// ========================================================================
// 6. ĐỌC TOÀN BỘ CẢM BIẾN
// ========================================================================
void readAllSensors() {
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);
  if (t == -127.0f || t == DEVICE_DISCONNECTED_C) t = 25.0f;
  currentTemp = t;

  float raw      = readRawSalinity();
  float filtered = filterSalinity(raw);
  currentSalinity = compensateTemperature(filtered, currentTemp);

  readINA3221();
}

// ========================================================================
// TASK 1: QUẢN LÝ CẢM BIẾN & LED (CHẠY TRÊN CORE 1 - MƯỢT 100%)
// ========================================================================
void Task_Sensors(void *pvParameters) {
  unsigned long lastSensorRead = 0;
  esp_task_wdt_add(NULL); // Đăng ký Task_Sensors vào Watchdog

  for (;;) {
    esp_task_wdt_reset(); // Reset WDT định kỳ trong vòng lặp Task

    unsigned long now = millis();
    if (now - lastSensorRead >= 500) { // Đọc cảm biến siêu tốc mỗi 0.5s để quay Clip
      lastSensorRead = now;
      readAllSensors();
    }
    handleLED(now);

    vTaskDelay(pdMS_TO_TICKS(50)); // Nhả CPU 50ms
  }
}

// ========================================================================
// TASK 2: QUẢN LÝ MẠNG ESP-NOW (CHẠY TRÊN CORE 1)
// ========================================================================
void Task_Network(void *pvParameters) {
  unsigned long lastSend = 0;

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(); // Ngắt mọi kết nối WiFi cũ lưu trong NVS
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE); // ÉP CỨNG KÊNH SÓNG SỐ 1
  esp_wifi_set_promiscuous(false);
  
  WiFi.setTxPower(WIFI_POWER_15dBm); // Hạ công suất RF chống sụt áp nguồn

  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ [ESP-NOW] Lỗi khởi tạo!");
  } else {
    Serial.println("✅ [ESP-NOW] Đã khởi tạo thành công!");
  }

  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 1; // Khai báo rõ gửi vào kênh 1
  peerInfo.encrypt = false;
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("❌ [ESP-NOW] Lỗi thêm Peer Cống!");
  }

  for (;;) {
    unsigned long now = millis();

    // Bắn ESP-NOW siêu tốc mỗi 0.5s sang Cống
    if (now - lastSend >= 500) {
      lastSend = now;

      myData.salinity       = currentSalinity;
      myData.temp           = currentTemp;
      myData.batteryVoltage = batteryVoltage;
      myData.batteryPercent = batteryPercent;
      myData.solarVoltage   = solarVoltage;
      myData.solarCurrent   = solarCurrent;
      myData.solarPower     = solarPower;
      myData.darkMode       = darkMode ? 1 : 0;

      esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *) &myData, sizeof(myData));
      if (result == ESP_OK) {
        Serial.println("✅ [ESP-NOW] Đã bắn số liệu Trạm Phao sang Cống!");
      } else {
        Serial.println("⚠️ [ESP-NOW] Gửi thất bại, Cống đang ngoài tầm thu sóng!");
      }
    }

    vTaskDelay(pdMS_TO_TICKS(100)); // Nhả CPU 100ms
  }
}

// ========================================================================
// SETUP (TẠO 2 TASK CHẠY TRÊN 2 NHÂN ĐỘC LẬP)
// ========================================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  initWatchdog();

  // Khởi tạo phần cứng I2C (SDA=21, SCL=22)
  Wire.begin(21, 22);
  Wire.setTimeOut(100); // Set timeout I2C 100ms chống treo bus
  ina3221.begin();
  sensors.begin();

  for (int i = 0; i < FILTER_SIZE; i++) tdsBuffer[i] = 0;

  // Pin cả 2 Task sang Core 1 (App Core) để dành riêng Core 0 cho hệ thống WiFi của ESP32
  xTaskCreatePinnedToCore(Task_Sensors, "SensorTask", 4096, NULL, 3, &TaskSensorHandle, 1); // Core 1
  xTaskCreatePinnedToCore(Task_Network, "NetworkTask", 8192, NULL, 1, &TaskNetworkHandle, 1); // Core 1

  Serial.println("=== TRẠM PHAO V4.0 (FreeRTOS Dual-Core) SẴN SÀNG ===");
}

// ========================================================================
// LOOP (Bỏ qua vì FreeRTOS quản lý Task)
// ========================================================================
void loop() {
  vTaskDelete(NULL);
}
