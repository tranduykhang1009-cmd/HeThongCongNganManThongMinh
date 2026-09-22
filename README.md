# 🌊 HỆ THỐNG GIÁM SÁT & ĐIỀU KHIỂN CỐNG NGĂN MẶN THÔNG MINH
> **Giải Pháp IoT Tự Động Hóa Thích Ứng Biến Đổi Khí Hậu & Phòng Chống Xâm Nhập Mặn Vùng Đồng Bằng Sông Cửu Long**  
> *Một sản phẩm nghiên cứu ứng dụng thực tiễn theo định hướng giáo dục STEM của nhóm học sinh NKN Labs.*

---

## 🏆 THÀNH TÍCH ĐẠT ĐƯỢC
* 🥇 **GIẢI NHẤT** - Cuộc thi Sáng tạo Dành cho Thanh thiếu niên Nhi đồng tỉnh Vĩnh Long lần thứ I (Năm học 2025 - 2026).
* 🥇 **GIẢI NHẤT** - Ngày hội STEM cấp Trường - THPT Nguyễn Huệ.

---

# 👥 Nhóm Tác Giả (Lớp 11A8 - Trường THPT Nguyễn Huệ)
* **Lê Trọng Nam**: Thiết Kế Mô Hình Cống
* **Trần Duy Khang**: Kiến Trúc Hệ Thống & Nền Tảng Số
* **Huỳnh Minh Ngọc**: Kỹ Thuật Phần Cứng & Vẽ 3D

* **Giáo Viên Hướng Dẫn**: Cô **Trần Thị Hồng Hạnh**

---

## 💡 Ý TƯỞNG SÁNG TẠO & TÍNH CẤP THIẾT
* **Bối cảnh thực tiễn**: Tình trạng biến đổi khí hậu khiến nước mặn xâm nhập ngày càng sâu vào nội đồng Đồng bằng sông Cửu Long, đe dọa trực tiếp nguồn nước ngọt tưới tiêu và sinh hoạt. Trong khi đó, việc vận hành cống ngăn mặn truyền thống chủ yếu làm thủ công, phụ thuộc vào kinh nghiệm, khó kịp thời ứng phó đỉnh triều mặn bất ngờ.
* **Giải pháp đề xuất**: Xây dựng mô hình cống thông minh ứng dụng công nghệ vi điều khiển ESP32, cụm cảm biến và trạm phao năng lượng mặt trời độc lập. Hệ thống liên tục đo nồng độ mặn (ngưỡng an toàn 0,4‰) và mực nước theo thời gian thực, tự động ra quyết định Đóng/Mở cống bảo vệ nội đồng mà không cần con người có mặt tại hiện trường.

---

## 🚀 TÍNH MỚI & ĐIỂM SÁNG TẠO NỔI BẬT
1. **Tích hợp "Tất cả trong một" với giá thành thấp**: Kết hợp đồng bộ giữa đo độ mặn, đo mực nước, camera quan sát thực địa, cảnh báo còi/đèn tại trạm và thông báo trực tuyến tức thời qua ứng dụng Telegram.
2. **Nền tảng Web điều khiển & Giám sát đám mây thời gian thực**:
   * Kết nối cơ sở dữ liệu thời gian thực đám mây (Firebase Realtime Database) với độ trễ truyền nhận dưới 500ms.
   * Giao diện thiết kế hiện đại, tương thích đa thiết bị (Máy tính, Máy tính bảng, Điện thoại iPhone Safari và Android).
   * Tích hợp kho hình ảnh kỷ niệm (Album Gallery) áp dụng thuật toán nén ảnh Canvas tối ưu băng thông (giảm 98% dung lượng tải).
3. **Trạm phao quan trắc năng lượng mặt trời độc lập**: Sử dụng nguồn pin sạc từ tấm pin năng lượng mặt trời, đảm bảo khả năng hoạt động liên tục 24/7 ngay cả trong điều kiện sông nước ngoài đồng ruộng hẻo lánh.
4. **Vận dụng kiến thức liên môn STEM**: Ứng dụng nhuần nhuyễn Vật lí (cơ chế truyền động, mạch điện quang trở), Tin học (thuật toán FreeRTOS, lập trình mạng), Sinh học (ngưỡng mặn sinh thái 0,4‰) và Công nghệ thiết kế 3D.

---

## 📁 CẤU TRÚC DỰ ÁN
```text
HeThongCongNganManThongMinh/
├── ESP32_Tram_Cong/       # Trạm Cống trung tâm + Hệ thống Web Giám Sát
│   ├── src/main.cpp       # Firmware vi điều khiển ESP32 (FreeRTOS đa nhân, Servo, Firebase)
│   ├── index.html         # Bảng điều khiển giám sát & điều khiển cống thời gian thực
│   ├── album.html         # Kho lưu trữ tư liệu, hình ảnh & kỷ niệm chế tạo mô hình
│   ├── contact.html       # Trang thông tin nhóm tác giả & kênh gửi phản hồi Telegram
│   ├── login.html         # Hệ thống xác thực & phân quyền (Quản trị viên / Chế độ Khách)
│   ├── platformio.ini     # Tệp cấu hình nạp firmware PlatformIO
│   └── firebase.json      # Cấu hình máy chủ đám mây & luật bảo mật thời gian thực
│
└── ESP32_Tram_Phao/       # Trạm Phao quan trắc chất lượng nước từ xa
    ├── src/main.cpp       # Firmware đọc cảm biến độ mặn TDS, siêu âm & truyền dữ liệu
    └── platformio.ini     # Tệp cấu hình nạp firmware Trạm Phao
```

---

## 🛠️ CÔNG NGHỆ ÁP DỤNG
* **Phần cứng**: ESP32-WROOM-32D (Dual-Core 240MHz, FreeRTOS), Cảm biến TDS , Cảm biến siêu âm, Động cơ Servo , Mạch đo công suất INA3221, Màn hình LCD I2C, Pin năng lượng mặt trời.
* **Giao thức & Đám mây**: Firebase Realtime Database (WebSocket), Telegram Bot API, ESP-NOW / WiFi Telemetry.
* **Giao diện Web**: HTML5 Responsive, Tailwind CSS, Lucide Icons, Canvas Image Processing.

---

## 📜 BẢN QUYỀN & THÔNG TIN DỰ ÁN
© 2026 Nhóm tác giả **Lê Trọng Nam - Trần Duy Khang - Huỳnh Minh Ngọc** (GVHD: **Cô Trần Thị Hồng Hạnh**).  
Dự án được nghiên cứu, chế tạo và bảo vệ bản quyền vì mục đích phát triển giáo dục STEM và phụng sự cộng đồng.
