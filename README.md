# 🌊 HỆ THỐNG GIÁM SÁT & ĐIỀU KHIỂN CỐNG NGĂN MẶN THÔNG MINH (IOT STEM SCADA)
> **Dự Án Nghiên Cứu Khoa Học Kỹ Thuật / STEM Đạt Giải - NKN Labs**  
> Giải pháp thích ứng biến đổi khí hậu & xâm nhập mặn vùng Đồng bằng sông Cửu Long.

---

## 👥 Nhóm Tác Giả (Lớp 12A8 - Trường THPT Nguyễn Huệ)
* **Lê Trọng Nam**: Thiết kế cơ khí, mô hình cống thẳng đứng & tính toán thủy lực.
* **Trần Duy Khang**: Kiến trúc hệ thống IoT, nền tảng SCADA Web thời gian thực & Cloud.
* **Huỳnh Minh Ngọc**: Kỹ thuật mạch điều khiển vi xử lý ESP32, vẽ thiết kế 3D & cảm biến.
* **Giáo Viên Hướng Dẫn**: Cô **Trần Thị Hồng Hạnh**

---

## 📁 Cấu Trúc Toàn Bộ Dự Án
```text
Projects/
├── ESP32_Tram_Cong/       # Trạm Cống trung tâm + Hệ thống Web SCADA
│   ├── src/main.cpp       # Firmware điều khiển cửa cống, FreeRTOS, Firebase RTDB
│   ├── index.html         # Bảng điều khiển giám sát SCADA thời gian thực
│   ├── album.html         # Kho lưu trữ hình ảnh & kỷ niệm chế tạo
│   ├── contact.html       # Trang thông tin nhóm tác giả & hỗ trợ kỹ thuật
│   ├── login.html         # Trang phân quyền quản trị viên & khách
│   ├── platformio.ini     # Cấu hình nạp firmware Trạm Cống
│   └── firebase.json      # Cấu hình Cloud Firebase Hosting & Security Rules
│
└── ESP32_Tram_Phao/       # Trạm Phao quan trắc chất lượng nước từ xa
    ├── src/main.cpp       # Firmware đọc cảm biến độ mặn TDS, nhiệt độ, truyền dữ liệu
    └── platformio.ini     # Cấu hình nạp firmware Trạm Phao
```

---

## 📜 Bản Quyền
© 2026 Nhóm tác giả **Lê Trọng Nam - Trần Duy Khang - Huỳnh Minh Ngọc**.  
Mọi quyền được bảo lưu. Dự án phục vụ mục đích giáo dục, nghiên cứu khoa học kỹ thuật và cộng đồng.
