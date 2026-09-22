# 🌊 HỆ THỐNG GIÁM SÁT & ĐIỀU KHIỂN CỐNG NGĂN MẶN THÔNG MINH
> **Dự Án Khoa Học Kỹ Thuật / STEM Đạt Giải - NKN Labs**  
> Giải pháp IoT & SCADA tự động hóa thích ứng biến đổi khí hậu vùng Đồng bằng sông Cửu Long.

---

## 👥 Đội Ngũ Phát Triển (12A8 - THPT Nguyễn Huệ)
* **Lê Trọng Nam**: Thiết Kế Cơ Khí & Mô Hình Cống Thẳng Đứng
* **Trần Duy Khang**: Kiến Trúc Hệ Thống, Lập Trình SCADA Web & Điện Toán Đám Mây
* **Huỳnh Minh Ngọc**: Kỹ Thuật Phần Cứng, Mạch Vi Điều Khiển & Thiết Kế 3D
* **Giáo Viên Hướng Dẫn**: Cô **Trần Thị Hồng Hạnh**

---

## 🚀 Tính Năng Nổi Bật

### 1. Phần Cứng & Vi Điều Khiển (ESP32 Firmware)
* **Vi điều khiển ESP32-WROOM Dual Core**: Chạy hệ điều hành thời gian thực **FreeRTOS** đa luồng.
* **Cảm biến độ mặn TDS & Siêu âm JSN**: Đo nồng độ ion muối và mực nước triều dâng theo thời gian thực.
* **Động cơ Servo kéo cửa van thẳng đứng**: Tích hợp công tắc hành trình kép (Limit Switch) và thuật toán bảo vệ quá tải.
* **Mô hình AI Hysteresis 5 kịch bản**: Tự động đưa ra quyết định Đóng/Mở cống chống xâm nhập mặn mà không cần con người can thiệp.

### 2. Nền Tảng Web SCADA & Đám Mây (Cloud Architecture)
* **Firebase Realtime Database**: Độ trễ truyền nhận telemetry < 500ms qua kết nối WebSocket bảo mật.
* **Giao diện SCADA Glassmorphism Dark Theme**: Tự động thích ứng trên mọi thiết bị (Laptop, iPad, iPhone Safari, Android Chrome).
* **Album Ảnh Dự Án Tối Ưu Băng Thông**: Tự động nén ảnh qua HTML5 Canvas (~40KB/ảnh), tiết kiệm 98% băng thông lưu trữ.
* **Tích hợp Webhook Telegram**: Tự động gửi cảnh báo khẩn cấp khi độ mặn vượt ngưỡng báo động đỏ.

---

## 📂 Cấu Trúc Dự Án
```text
├── src/
│   └── main.cpp           # Firmware ESP32 chính (FreeRTOS, Cảm biến, Servo, Firebase)
├── index.html             # Bảng điều khiển giám sát SCADA thời gian thực
├── album.html             # Kho lưu trữ hình ảnh & kỷ niệm chế tạo dự án
├── contact.html           # Thông tin liên hệ nhóm tác giả & hòm thư hỗ trợ
├── login.html             # Trang đăng nhập & phân quyền tài khoản Quản trị / Khách
├── platformio.ini         # Cấu hình nạp mã nguồn & thư viện PlatformIO
└── firebase.json          # Cấu hình Firebase Hosting & Realtime Database Rules
```

---

## 📜 Bản Quyền & Giấy Phép
© 2026 Nhóm tác giả **Lê Trọng Nam - Trần Duy Khang - Huỳnh Minh Ngọc**.  
Mọi quyền được bảo lưu. Dự án được nghiên cứu và phát triển vì mục đích giáo dục và cộng đồng.
