// Thay đổi URL này thành URL server thực tế của bạn. 
// Nếu bạn chạy server Node.js ở máy cá nhân, bạn phải dùng NGROK (VD: https://a1b2-c3.ngrok-free.app)
// KHÔNG dùng 'http://localhost:3000' nếu frontend đã up lên Cloudflare Workers.
const API_BASE_URL = 'https://<ĐỊA-CHỈ-BACKEND-CỦA-BẠN>.com';

export async function fetchTranscription(videoData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoData)
    });

    if (!response.ok) {
      throw new Error(`Server trả về mã lỗi: ${response.status}`);
    }

    const data = await response.json();
    
    // Gán trực tiếp data.segments vào state của giao diện để sửa lỗi[cite: 11] và[cite: 12]
    return data.segments; 

  } catch (error) {
    console.error("Lỗi mạng:", error);
    // Bắt lỗi chính xác thay vì chỉ hiện "Failed to fetch" chung chung
    alert(`Lỗi kết nối Backend: ${error.message}. Vui lòng kiểm tra API_BASE_URL hoặc xem Backend đã chạy chưa.`);
    return [];
  }
}
