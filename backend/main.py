import os
import uuid
import subprocess
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import whisper

app = FastAPI(title="AutoSub SaaS Engine API")

# Cấu hình CORS cho phép Cloudflare Pages & Localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.abspath("temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# Load mô hình Whisper (nhẹ phù hợp cho Server)
print("Loading Whisper model...")
whisper_model = whisper.load_model("base")
print("Whisper model loaded successfully!")

class SubtitleSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    translation: Optional[str] = ""

class TranslateRequest(BaseModel):
    segments: List[SubtitleSegment]
    target_lang: str = "vi"

class HardsubRequest(BaseModel):
    ass_content: str

def cleanup_file(filepath: str):
    """Xóa file tạm sau khi phản hồi hoàn tất"""
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error deleting temp file {filepath}: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "engine": "Whisper + FFmpeg + FastAPI"}

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Whisper AI Engine - Nhận dạng giọng nói ra phụ đề"""
    file_ext = os.path.splitext(file.filename)[1]
    temp_filename = f"{uuid.uuid4()}{file_ext}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        result = whisper_model.transcribe(temp_path)
        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "id": seg["id"],
                "start": round(seg["start"], 3),
                "end": round(seg["end"], 3),
                "text": seg["text"].strip(),
                "translation": ""
            })
        return {"language": result.get("language", "unknown"), "segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_file(temp_path)

@app.post("/api/translate")
async def translate_subtitles(req: TranslateRequest):
    """Context Translation Engine - Dịch phụ đề song ngữ"""
    translated_segments = []
    # Mô phỏng dịch tự động (hoặc tích hợp API Google Translate/OpenAI tại đây)
    for seg in req.segments:
        translated_text = f"[Dịch-{req.target_lang.upper()}]: {seg.text}"
        translated_segments.append({
            "id": seg.id,
            "start": seg.start,
            "end": seg.end,
            "text": seg.text,
            "translation": translated_text
        })
    return {"segments": translated_segments}

@app.post("/api/hardsub")
async def hardsub_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    ass_content: str = Form(...)
):
    """FFmpeg Worker Process - Burn-in ASS vào Video MP4"""
    task_id = str(uuid.uuid4())
    video_path = os.path.join(TEMP_DIR, f"{task_id}_input.mp4")
    ass_path = os.path.join(TEMP_DIR, f"{task_id}.ass")
    output_path = os.path.join(TEMP_DIR, f"{task_id}_output.mp4")

    with open(video_path, "wb") as f:
        f.write(await video.read())

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    # Chạy lệnh FFmpeg ghép cứng phụ đề ASS
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"ass={ass_path}",
        "-c:a", "copy",
        output_path
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        background_tasks.add_task(cleanup_file, video_path)
        background_tasks.add_task(cleanup_file, ass_path)
        background_tasks.add_task(cleanup_file, output_path)
        return FileResponse(output_path, media_type="video/mp4", filename="hardsubbed_video.mp4")
    except subprocess.CalledProcessError as e:
        cleanup_file(video_path)
        cleanup_file(ass_path)
        raise HTTPException(status_code=500, detail=f"FFmpeg error: {e.stderr.decode()}")
