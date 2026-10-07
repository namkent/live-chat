# Live Chat 3D Avatar - Hướng Dẫn Sử Dụng & Luồng Hoạt Động

Dự án này là một hệ thống tương tác trực tiếp (Live Chat) sử dụng mô hình 3D (Avatar) được đồng bộ hóa khẩu hình miệng (lip-sync) và cử chỉ dựa trên trí tuệ nhân tạo (AI) và Text-to-Speech (TTS).

---

## 1. Hướng Dẫn Sử Dụng Mô Hình `.glb`

Hệ thống sử dụng thư viện `three.js` và `@met4citizen/talkinghead` để render và điều khiển các mô hình 3D.

### Yêu cầu đối với Avatar `.glb`
Để Avatar có thể nói chuyện và cử động được, mô hình `.glb` phải đáp ứng các tiêu chuẩn sau:
- Phải có một bộ khung xương (Rig) cơ bản, bắt buộc phải có root bone tên là **`Armature`** và xương hông **`Hips`** (chuẩn của Mixamo hoặc ReadyPlayer.me).
- Nên có các blendshapes (shape keys) chuẩn ARKit để hỗ trợ biểu cảm khuôn mặt và nhép môi mượt mà.
- Dung lượng nên được tối ưu (dưới 15MB) để load trên trình duyệt nhanh chóng.

### Cách Convert File `.fbx` hoặc `.abc` sang `.glb`
Dự án có sẵn một công cụ tự động để sửa lỗi vật liệu (kính trong suốt) và scale của Blender:
1. Copy các file `.fbx` hoặc `.abc` vào thư mục `fbx_source/`.
2. Chạy file `convert_fbx.bat` ở thư mục gốc.
3. Tool sẽ tự động chạy ngầm Blender, tối ưu hoá và xuất ra file `.glb` vào thẳng thư mục `frontend/public/avatars/`.

### Cách Thêm Model Vào Giao Diện
1. Copy file `.glb` vào:
   - Thư mục `frontend/public/avatars/` đối với nhân vật.
   - Thư mục `frontend/public/backgrounds/` đối với hình nền/sân khấu 3D.
2. Mở file `frontend/src/components/AvatarStage.vue`.
3. Tìm đến mảng `avatarsList` hoặc `backgroundsList` và thêm ID (tên file không cần đuôi `.glb`) vào danh sách.
   ```javascript
   const avatarsList = [
     // ... các avatar cũ
     { id: 'ten_file_moi', name: 'Tên hiển thị trên UI', voice: 'Mỹ Duyên' }
   ];
   ```
4. Quay lại trình duyệt, tải lại trang và model của bạn sẽ xuất hiện trong danh sách!

---

## 2. Luồng Hoạt Động (Từ lúc Chat đến lúc Avatar cử động)

Quá trình tương tác diễn ra theo chu trình thời gian thực (Real-time) như sau:

1. **Người Dùng Gửi Tin Nhắn (Giao diện Vue):** 
   Người dùng nhập văn bản vào khung chat hoặc sử dụng giọng nói. Trình duyệt sẽ gửi chuỗi văn bản này xuống Backend (Node.js/Python).

2. **Xử Lý Văn Bản & Sinh Giọng Nói (Backend):**
   - Backend sẽ gửi văn bản đến AI (như ChatGPT hoặc Gemini) để lấy câu trả lời.
   - Sau khi có câu trả lời, Backend gọi API Text-to-Speech (TTS) để tổng hợp ra file âm thanh (Base64 hoặc URL).

3. **Chuyển Giao Cho Avatar (Frontend):**
   - File âm thanh (kèm text) được trả về cho Frontend.
   - Frontend đẩy dữ liệu này vào thư viện `TalkingHead` thông qua lệnh `head.speakAudio(...)`.

4. **Phân Tích Âm Thanh & Nhép Môi (Lip-sync):**
   - `TalkingHead` sử dụng Web Audio API để phân tích tần số và sóng âm theo thời gian thực.
   - Dựa trên cường độ và các âm vị (visemes), nó điều chỉnh các blendshapes (miệng, môi, lưỡi, cằm) trên model `.glb` để khớp hoàn hảo với tiếng nói.

5. **Cử Chỉ & Biểu Cảm (Motion Engine):**
   - Đồng thời, văn bản trả về cũng được phân tích để tìm kiếm các "cảm xúc" (ví dụ: vui, buồn, tức giận).
   - Hệ thống chèn các animation cử chỉ tay, lắc đầu hoặc thay đổi nét mặt tương ứng lên bộ xương (Bones) của Avatar.

6. **Render Lên Màn Hình:**
   - WebGL (thông qua Three.js) liên tục vẽ lại khung hình (60 FPS), kết hợp ánh sáng, bóng đổ (ShadowMap), và hệ thống Camera để cho ra hình ảnh sống động cuối cùng mà người dùng nhìn thấy.
