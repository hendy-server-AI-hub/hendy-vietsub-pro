import React, { useState } from 'react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/vietsub/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslatedText(data.translated);
      } else {
        alert('Lỗi xử lý: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối tới Hendy Server AI Hub');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem'
    }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#6366f1', margin: '0 0 0.5rem 0' }}>Hendy Vietsub Pro</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>Trình dịch & xử lý phụ đề điện ảnh tự động</p>
      </header>

      <main style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Nội dung phụ đề gốc:</label>
          <textarea
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập câu thoại hoặc đoạn phụ đề..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleTranslate}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Đang xử lý AI...' : 'Tạo Vietsub Điện Ảnh'}
        </button>

        {translatedText && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #10b981' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Kết quả Vietsub:</h3>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>{translatedText}</p>
          </div>
        )}
      </main>
    </div>
  );
}
