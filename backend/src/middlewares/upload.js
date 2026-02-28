/**
 * 파일 업로드 미들웨어 (Multer)
 *
 * 피드 콘텐츠 사진 업로드를 처리한다.
 * - 저장 경로: ./uploads
 * - 허용 파일: 이미지 (jpeg, jpg, png, gif, webp)
 * - 최대 크기: 5MB
 * - 최대 개수: 10장
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 생성 (없으면)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 고유 파일명 생성: 타임스탬프-난수.확장자
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  },
});

// 파일 필터: 이미지만 허용
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Multer 인스턴스 생성
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// 최대 10장 사진 업로드 미들웨어
const uploadPhotos = upload.array('photos', 10);

module.exports = { upload, uploadPhotos };
