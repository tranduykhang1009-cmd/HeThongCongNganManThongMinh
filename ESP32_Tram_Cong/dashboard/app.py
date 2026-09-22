# -*- coding: utf-8 -*-
"""
Flask Backend — Smart Salinity Barrier Gate (GRAND MERGE)
Ultra-Low Latency UI via Background Caching & Async Writes.
"""

import os
import time
import threading
import requests
import datetime
import pytz
from flask import Flask, jsonify, request

app = Flask(__name__)

# ==================== CẤU HÌNH ====================
FIREBASE_URL = "https://he-thong-cong-man-default-rtdb.asia-southeast1.firebasedatabase.app"
FIREBASE_SECRET = "RnU4uZfeEFzlB77nYtZXgJxVedKJzJA0Zf7bxNdd"
DEFAULT_SALINITY_THRESHOLD = 0.4
DEFAULT_FLOOD_THRESHOLD = 10.0

TELEGRAM_TOKEN = "8223426710:AAFlDj65g4IXjapIfoHMzOdET_BH8yGII6Q"
ADMIN_ID = "6439403685"
USER_ID  = ["7539395589", "7831605237"]

GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz4WUwslPtoQ5M-lZr4aFb03cS8_CCQ2MgAnzKDP08aM24J3GOezNNO-tt8bhs14PVM/exec"

# ==================== GLOBAL CACHE (LOW LATENCY) ====================
DATA_CACHE = {
    "do_man": 0, "temp": 0, "muc_nuoc": 0, "khoang_cach_sieu_am": 0,
    "gate_status": 0, "mode": 0, "salinity_threshold": DEFAULT_SALINITY_THRESHOLD,
    "heartbeat_cong": "0", "heartbeat_phao": "0", "esp_now_link": 0,
    "speaker_status": 0, "led_status": 0, "is_night": 0, "panel_unlocked": 0,
    "stall_threshold": 700, "emergency_stop": 0, "flood_threshold": DEFAULT_FLOOD_THRESHOLD,
    "volume": 20
}

# Requests session for HTTP Keep-Alive (faster polling)
req_session = requests.Session()

def fb_get(path):
    url = f"{FIREBASE_URL}/{path}.json?auth={FIREBASE_SECRET}"
    try:
        r = req_session.get(url, timeout=5)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print(f"[Firebase GET /{path}] Error: {e}")
        return None

def fb_set(path, value):
    url = f"{FIREBASE_URL}/{path}.json?auth={FIREBASE_SECRET}"
    try:
        r = req_session.put(url, json=value, timeout=5)
        return r.status_code == 200
    except Exception as e:
        print(f"[Firebase SET /{path}] Error: {e}")
        return False

def fb_update(path, value):
    """PATCH method to update specific keys without deleting existing sibling nodes"""
    url = f"{FIREBASE_URL}/{path}.json?auth={FIREBASE_SECRET}"
    try:
        r = req_session.patch(url, json=value, timeout=5)
        return r.status_code == 200
    except Exception as e:
        print(f"[Firebase UPDATE /{path}] Error: {e}")
        return False

def fb_delete(path):
    url = f"{FIREBASE_URL}/{path}.json?auth={FIREBASE_SECRET}"
    try:
        r = req_session.delete(url, timeout=5)
        return r.status_code == 200
    except Exception as e:
        print(f"[Firebase DELETE /{path}] Error: {e}")
        return False

def bg_fb_set(path, value):
    """Fire-and-forget Firebase write (PUT)"""
    threading.Thread(target=fb_set, args=(path, value), daemon=True).start()

def bg_fb_update(path, value):
    """Fire-and-forget Firebase update (PATCH - Merge keys)"""
    threading.Thread(target=fb_update, args=(path, value), daemon=True).start()

# ==================== BACKGROUND POLLER ====================
def firebase_poller():
    """Continuously caches Firebase data to serve /api/data instantly using a single root fetch"""
    while True:
        try:
            # OPTIMIZATION 1: Single GET request for the entire root to prevent API spam
            root = fb_get("") or {}
            tram_phao = root.get("tram_phao") or {}
            tram_cong = root.get("tram_cong") or {}
            control   = root.get("control")   or {}

            DATA_CACHE["do_man"] = tram_phao.get("do_man", 0)
            DATA_CACHE["temp"] = tram_phao.get("temp", 0)
            DATA_CACHE["muc_nuoc"] = tram_cong.get("muc_nuoc", 0)
            DATA_CACHE["khoang_cach_sieu_am"] = tram_cong.get("khoang_cach_sieu_am", 0)
            DATA_CACHE["gate_status"] = tram_cong.get("gate_status", 0)
            DATA_CACHE["heartbeat_cong"] = str(tram_cong.get("heartbeatcong", "0"))
            DATA_CACHE["heartbeat_phao"] = str(tram_phao.get("heartbeatphao", "0"))
            DATA_CACHE["esp_now_link"] = tram_cong.get("esp_now_link", 0)
            DATA_CACHE["speaker_status"] = tram_cong.get("speaker_status", 0)
            DATA_CACHE["led_status"] = tram_cong.get("led_status", 0)
            DATA_CACHE["is_night"] = tram_cong.get("is_night", 0)

            if "mode" in control: DATA_CACHE["mode"] = control["mode"]
            if "emergency_stop" in control: DATA_CACHE["emergency_stop"] = control["emergency_stop"]
            if "salinity_threshold" in control: DATA_CACHE["salinity_threshold"] = control["salinity_threshold"]
            if "flood_threshold" in control: DATA_CACHE["flood_threshold"] = control["flood_threshold"]
            if "stall_threshold" in control: DATA_CACHE["stall_threshold"] = control["stall_threshold"]
            if "panel_unlocked" in control: DATA_CACHE["panel_unlocked"] = control["panel_unlocked"]
            if "volume" in control: DATA_CACHE["volume"] = control["volume"]
            if "ai_decision" in control: DATA_CACHE["ai_decision"] = control["ai_decision"]

        except Exception as e:
            print(f"❌ Poller error: {e}")
        time.sleep(1.0) 

# ==================== TELEGRAM & SHEETS ====================
def send_telegram_admin(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {'chat_id': ADMIN_ID, 'text': text, 'parse_mode': 'HTML'}
    threading.Thread(target=lambda: requests.post(url, json=payload, timeout=5)).start()

def send_telegram_user(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    for u_id in USER_ID:
        payload = {'chat_id': u_id, 'text': text, 'parse_mode': 'HTML'}
        threading.Thread(target=lambda p=payload: requests.post(url, json=p, timeout=5)).start()

def send_telegram_all(text):
    send_telegram_admin(text)
    send_telegram_user(text)

def send_to_sheet(salinity, temp, water_level, gate_status, reason, mode, emergency, wifi_cong, wifi_phao, sent_admin, sent_user):
    def post_sheet():
        try:
            now_vn = datetime.datetime.now(pytz.timezone('Asia/Ho_Chi_Minh'))
            sheet_name = now_vn.strftime("%Y-%m-%d")
            detail_status = "Dừng khẩn cấp" if emergency == 1 else "Mở" if gate_status == 1 else "Đóng" if gate_status == 0 else "Đang chuyển động"
            mode_text = "Tự động" if mode == 0 else "Thủ công"
            gate_status_text = "🟢 ĐÃ MỞ" if gate_status == 1 else "🔴 ĐÃ ĐÓNG" if gate_status == 0 else "🟡 ĐANG CHUYỂN"
            wifi_cong_text = "🟢 Đã kết nối" if wifi_cong == 1 else "🔴 Mất kết nối" if wifi_cong == 0 else "N/A"
            wifi_phao_text = "🟢 Đã kết nối" if wifi_phao == 1 else "🔴 Mất kết nối" if wifi_phao == 0 else "N/A"

            payload = {
                "salinity": str(round(salinity, 2)), "temp": str(round(temp, 1)), "water_level": str(round(water_level, 2)),
                "gate_status_text": gate_status_text, "reason": reason, "mode_text": mode_text,
                "detail_status": detail_status, "wifi_cong": wifi_cong_text, "wifi_phao": wifi_phao_text,
                "sent_admin": "Đã gửi" if sent_admin else "Chưa", "sent_user": "Đã gửi" if sent_user else "Chưa"
            }
            requests.post(GOOGLE_SHEET_URL, data=payload, timeout=10)
        except Exception as e:
            print(f"⚠️ Lỗi Google Sheets: {e}")
    threading.Thread(target=post_sheet, daemon=True).start()

# ==================== HEARTBEAT MONITOR ====================
def heartbeat_monitor():
    """OPTIMIZATION 2: Passive Heartbeat Detection without WRITING to Firebase"""
    last_cong_status = None
    last_phao_status = None
    last_hb_cong_val = None
    last_hb_phao_val = None

    while True:
        try:
            time.sleep(12)
            
            # Read from cache instead of querying Firebase
            hb_cong = DATA_CACHE.get("heartbeat_cong", "0")
            hb_phao = DATA_CACHE.get("heartbeat_phao", "0")

            # If the value hasn't changed in 12s, the device is offline
            is_cong_alive = (hb_cong != "0" and hb_cong != last_hb_cong_val)
            is_phao_alive = (hb_phao != "0" and hb_phao != last_hb_phao_val)

            last_hb_cong_val = hb_cong
            last_hb_phao_val = hb_phao

            if is_cong_alive:
                if last_cong_status == False: send_telegram_admin("✅ <b>TRẠM CỐNG ĐÃ KẾT NỐI LẠI WIFI</b>")
                last_cong_status = True
            else:
                if last_cong_status != False: send_telegram_admin("🚨 <b>CẢNH BÁO MẤT KẾT NỐI</b>\nTrạm Cống mất tín hiệu Wifi/Nguồn!")
                last_cong_status = False

            if is_phao_alive:
                if last_phao_status == False: send_telegram_admin("✅ <b>TRẠM PHAO ĐÃ KẾT NỐI LẠI WIFI</b>")
                last_phao_status = True
            else:
                if last_phao_status != False: send_telegram_admin("🚨 <b>CẢNH BÁO MẤT KẾT NỐI</b>\nTrạm Phao mất tín hiệu Wifi/Nguồn!")
                last_phao_status = False

        except Exception as e:
            print(f"❌ Lỗi heartbeat: {e}")

# ==================== AI LOGIC ====================
def run_ai_logic():
    last_state = {}
    last_daily = {"6": "", "18": ""}
    system_initialized = False
    log_counter = 0

    while True:
        try:
            current_mode = DATA_CACHE.get('mode', 1)
            current_emergency = DATA_CACHE.get('emergency_stop', 0)
            salinity = DATA_CACHE.get('do_man', 0)
            temp = DATA_CACHE.get('temp', 0)
            water_level = DATA_CACHE.get('muc_nuoc', 0)
            gate_status = DATA_CACHE.get('gate_status', 0)
            wifi_cong = 1 if DATA_CACHE.get('heartbeat_cong') != "0" else 0
            wifi_phao = 1 if DATA_CACHE.get('heartbeat_phao') != "0" else 0
            
            salinity_threshold = DATA_CACHE.get('salinity_threshold', DEFAULT_SALINITY_THRESHOLD)
            flood_threshold = DATA_CACHE.get('flood_threshold', DEFAULT_FLOOD_THRESHOLD)

            # AI Decision Logic
            if salinity > salinity_threshold:
                target = 0
                short_reason = f"Đóng do mặn={salinity:.2f}‰ > {salinity_threshold}‰"
            elif water_level > flood_threshold:
                target = 1
                short_reason = f"Mở xả lũ do nước={water_level:.1f}cm > {flood_threshold}cm"
            else:
                target = 1
                short_reason = f"Mở do mặn={salinity:.2f}‰ <= {salinity_threshold}‰"

            pretty_reason = (f"🚨 <b>CẢNH BÁO MẶN XÂM NHẬP (TỰ ĐỘNG)</b>\n🌊 Độ mặn: {salinity:.2f}‰ (ngưỡng {salinity_threshold}‰)\n💧 Mực nước: {water_level:.1f} cm\n🔒 Hệ thống tự động <b>ĐÓNG CỐNG</b> bảo vệ nội đồng.") if target == 0 else \
                            (f"✅ <b>THÔNG BÁO TÌNH HÌNH (TỰ ĐỘNG)</b>\n🌊 Độ mặn: {salinity:.2f}‰ (an toàn)\n💧 Mực nước: {water_level:.1f} cm\n🔓 Hệ thống tự động <b>MỞ CỐNG</b> xả lũ / thau chua.")

            sheet_changed = False
            if not system_initialized:
                sheet_changed = True
                system_initialized = True
            elif (last_state.get('mode') != current_mode): sheet_changed = True
            elif (last_state.get('emergency') != current_emergency): sheet_changed = True
            elif (current_mode == 0 and last_state.get('target') != target): sheet_changed = True
            elif (last_state.get('gate_status') != gate_status): sheet_changed = True
            else:
                log_counter += 1
                if log_counter >= 600:
                    sheet_changed = True
                    log_counter = 0

            if sheet_changed:
                sent_admin = False; sent_user = False
                if current_emergency == 1:
                    send_telegram_all("🚨 Dừng khẩn cấp được kích hoạt!")
                    sent_admin = True; sent_user = True
                elif current_mode == 0 and last_state.get('target') != target:
                    send_telegram_user(pretty_reason)
                    sent_user = True
                elif current_mode == 1 and last_state.get('mode') != current_mode:
                    send_telegram_all("🔧 Chuyển sang chế độ THỦ CÔNG")
                    sent_admin = True; sent_user = True

                send_to_sheet(salinity, temp, water_level, gate_status, short_reason, current_mode, current_emergency, wifi_cong, wifi_phao, sent_admin, sent_user)
                log_counter = 0

            # OPTIMIZATION 3: Strict Separation of Manual/Auto and Batched Updates
            if current_mode == 0:
                current_decision = DATA_CACHE.get("ai_decision", -1)
                
                # Only write to Firebase if the AI decision ACTUALLY changes
                if current_decision != target:
                    DATA_CACHE["ai_decision"] = target
                    
                    # Batch all updates into a single PATCH request
                    updates = {
                        "ai_decision": target,
                        "ly_do_ai": short_reason,
                        "gate_target": 1 if target == 1 else 0  # Standardized Target (0/1)
                    }
                    bg_fb_update("control", updates)

                    now_vn = datetime.datetime.now(pytz.timezone('Asia/Ho_Chi_Minh'))
                    log_entry = {'timestamp': now_vn.isoformat(), 'salinity': salinity, 'water_level': water_level, 'ai_decision': target, 'reason': short_reason}
                    bg_fb_set(f"history/{now_vn.strftime('%Y%m%d%H%M%S')}", log_entry)

                    def prune_history():
                        all_logs = fb_get("history")
                        if all_logs and len(all_logs) > 100:
                            sorted_keys = sorted(all_logs.keys(), key=lambda k: all_logs[k].get('timestamp', ''))
                            for old_key in sorted_keys[:-100]: fb_delete(f"history/{old_key}")
                    threading.Thread(target=prune_history, daemon=True).start()

            last_state = {'mode': current_mode, 'target': target, 'emergency': current_emergency, 'gate_status': gate_status}

            now_vn = datetime.datetime.now(pytz.timezone('Asia/Ho_Chi_Minh'))
            hour = now_vn.hour
            date = now_vn.strftime("%Y-%m-%d")
            if hour == 6 and last_daily["6"] != date:
                send_telegram_user(f"📊 <b>BÁO CÁO SÁNG</b>\n🌊 Mặn: {salinity:.2f}‰\n💧 Nước: {water_level:.1f} cm\n🚪 Cống: {'MỞ' if target==1 else 'ĐÓNG'}\n💡 {short_reason}")
                last_daily["6"] = date
            if hour == 18 and last_daily["18"] != date:
                send_telegram_user(f"📊 <b>BÁO CÁO CHIỀU</b>\n🌊 Mặn: {salinity:.2f}‰\n💧 Nước: {water_level:.1f} cm\n🚪 Cống: {'MỞ' if target==1 else 'ĐÓNG'}\n💡 {short_reason}")
                last_daily["18"] = date

        except Exception as e:
            print(f"❌ Lỗi luồng AI: {e}")
        time.sleep(1)

# ==================== FLASK SERVER ====================
@app.route("/")
def index():
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    with open(html_path, "r", encoding="utf-8") as f: return f.read()

@app.route("/api/data")
def get_data():
    return jsonify(DATA_CACHE) # 0ms latency

# Route xử lý cập nhật Firebase sử dụng PATCH (.update) chỉ sửa key được truyền lên
@app.route("/api/control", methods=["POST"])
@app.route("/api/set_mode", methods=["POST"])
def set_mode():
    payload = request.json or {}
    updates = {}

    # === 1. Xử lý Chế độ (Mode) ===
    if "mode" in payload:
        new_mode = int(payload["mode"])
        DATA_CACHE["mode"] = new_mode
        updates["mode"] = new_mode
        if new_mode == 1:
            target_val = 7 if DATA_CACHE["gate_status"] == 1 else 0
            updates["gate_target"] = target_val
            DATA_CACHE["gate_target"] = target_val

    # === 2. Xử lý Âm lượng Loa (Volume) ===
    if "volume" in payload:
        vol = max(0, min(30, int(payload["volume"])))
        DATA_CACHE["volume"] = vol
        updates["volume"] = vol  # CHỈ CẬP NHẬT KEY VOLUME

    # === 3. Xử lý Ngưỡng mặn (Threshold) ===
    if "threshold" in payload:
        sal_thresh = float(payload["threshold"])
        DATA_CACHE["salinity_threshold"] = sal_thresh
        updates["salinity_threshold"] = sal_thresh
        msg = f"🔧 CẬP NHẬT CÀI ĐẶT: Ngưỡng mặn đã thay đổi thành {sal_thresh}‰"
        send_telegram_all(msg)
        send_to_sheet(DATA_CACHE["do_man"], DATA_CACHE["temp"], DATA_CACHE["muc_nuoc"], DATA_CACHE["gate_status"], f"Đổi ngưỡng mặn: {sal_thresh}", DATA_CACHE["mode"], DATA_CACHE["emergency_stop"], 1 if DATA_CACHE["heartbeat_cong"]!="0" else 0, 1 if DATA_CACHE["heartbeat_phao"]!="0" else 0, True, True)

    # === 4. Xử lý Điều khiển cống (Gate Target) ===
    if "target" in payload:
        target = float(payload["target"])
        DATA_CACHE["gate_target"] = target
        updates["gate_target"] = target
        action = "MỞ CỐNG (7cm)" if target == 7 else "ĐÓNG CỐNG"
        msg = f"🧑‍💻 <b>ĐIỀU KHIỂN THỦ CÔNG</b>\nLệnh: <b>{action}</b>\n🌊 Mặn: {DATA_CACHE['do_man']:.2f}‰\n💧 Nước: {DATA_CACHE['muc_nuoc']:.1f} cm"
        send_telegram_all(msg)

    # === 5. Xử lý Dừng khẩn cấp (Emergency Stop) ===
    if "emergency" in payload:
        emergency = int(payload["emergency"])
        DATA_CACHE["emergency_stop"] = emergency
        updates["emergency_stop"] = emergency
        msg = "🚨 <b>DỪNG KHẨN CẤP ĐÃ KÍCH HOẠT!</b>" if emergency == 1 else "✅ <b>HỦY DỪNG KHẨN CẤP</b>"
        send_telegram_all(msg)

    # 🔥 DÙNG PHƯƠNG THỨC PATCH (bg_fb_update): Chỉ sửa các key trong `updates` 
    # TỰ ĐỘNG BẢO VỆ GIỮ NGUYÊN các key khác như mode, gate_target, emergency_stop trên Firebase!
    if updates:
        bg_fb_update("control", updates)

    return jsonify({"status": "ok"})

@app.route("/api/set_stall_threshold", methods=["POST"])
def set_stall_threshold():
    val = float(request.json["stall_threshold"])
    DATA_CACHE["stall_threshold"] = val
    bg_fb_update("control", {"stall_threshold": val})
    msg = f"🔧 CẬP NHẬT CÀI ĐẶT: Kẹt motor (ACS712) đã thay đổi thành {val}"
    send_telegram_all(msg)
    send_to_sheet(DATA_CACHE["do_man"], DATA_CACHE["temp"], DATA_CACHE["muc_nuoc"], DATA_CACHE["gate_status"], f"Đổi ACS712: {val}", DATA_CACHE["mode"], DATA_CACHE["emergency_stop"], 1 if DATA_CACHE["heartbeat_cong"]!="0" else 0, 1 if DATA_CACHE["heartbeat_phao"]!="0" else 0, True, True)
    return jsonify({"status": "ok"})

@app.route("/api/set_panel_lock", methods=["POST"])
def set_panel_lock():
    val = int(request.json["panel_unlocked"])
    DATA_CACHE["panel_unlocked"] = val
    bg_fb_update("control", {"panel_unlocked": val})
    msg = f"🔧 CẬP NHẬT CÀI ĐẶT: Quyền điều khiển tại cống đã {'Cho phép' if val == 1 else 'Vô hiệu hóa'}"
    send_telegram_all(msg)
    send_to_sheet(DATA_CACHE["do_man"], DATA_CACHE["temp"], DATA_CACHE["muc_nuoc"], DATA_CACHE["gate_status"], f"Panel lock: {val}", DATA_CACHE["mode"], DATA_CACHE["emergency_stop"], 1 if DATA_CACHE["heartbeat_cong"]!="0" else 0, 1 if DATA_CACHE["heartbeat_phao"]!="0" else 0, True, True)
    return jsonify({"status": "ok"})

@app.route("/api/set_flood_threshold", methods=["POST"])
def set_flood_threshold():
    val = float(request.json["flood_threshold"])
    DATA_CACHE["flood_threshold"] = val
    bg_fb_update("control", {"flood_threshold": val})
    msg = f"🔧 CẬP NHẬT CÀI ĐẶT: Ngưỡng xả lũ đã thay đổi thành {val} cm"
    send_telegram_all(msg)
    send_to_sheet(DATA_CACHE["do_man"], DATA_CACHE["temp"], DATA_CACHE["muc_nuoc"], DATA_CACHE["gate_status"], f"Đổi xả lũ: {val}", DATA_CACHE["mode"], DATA_CACHE["emergency_stop"], 1 if DATA_CACHE["heartbeat_cong"]!="0" else 0, 1 if DATA_CACHE["heartbeat_phao"]!="0" else 0, True, True)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    threading.Thread(target=firebase_poller, daemon=True).start()
    threading.Thread(target=run_ai_logic, daemon=True).start()
    threading.Thread(target=heartbeat_monitor, daemon=True).start()
    print("=" * 60)
    print("🚀 Smart Salinity Barrier Gate — Backend Started (Low Latency)")
    print("🌍 Dashboard URL: http://0.0.0.0:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
