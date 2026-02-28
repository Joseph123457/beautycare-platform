import { useRef, useState, useCallback } from 'react';

/**
 * 드래그 앤 드롭 이미지 업로드 컴포넌트
 * - 드래그 & 드롭 또는 클릭으로 이미지 선택
 * - 미리보기 그리드 + 삭제 버튼
 * - 파일 크기 제한 (5MB)
 */

interface ImageUploaderProps {
  images: File[];
  onChange: (files: File[]) => void;
  maxImages?: number;
}

// 최대 파일 크기 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 파일 검증 및 추가
  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const newFiles: File[] = [];

      for (const file of Array.from(fileList)) {
        // 이미지 파일 확인
        if (!file.type.startsWith('image/')) {
          setError('이미지 파일만 업로드할 수 있습니다');
          continue;
        }
        // 크기 제한 확인
        if (file.size > MAX_FILE_SIZE) {
          setError('파일 크기는 5MB 이하여야 합니다');
          continue;
        }
        newFiles.push(file);
      }

      // 최대 개수 제한
      const combined = [...images, ...newFiles].slice(0, maxImages);
      if (images.length + newFiles.length > maxImages) {
        setError(`최대 ${maxImages}장까지 업로드할 수 있습니다`);
      }

      onChange(combined);
    },
    [images, maxImages, onChange]
  );

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // 파일 입력 변경 핸들러
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // input 초기화 (같은 파일 재선택 가능)
      e.target.value = '';
    },
    [addFiles]
  );

  // 이미지 삭제
  const removeImage = useCallback(
    (index: number) => {
      onChange(images.filter((_, i) => i !== index));
    },
    [images, onChange]
  );

  return (
    <div className="space-y-3">
      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-dashed border-2 rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#1E5FA8] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <svg
          className="w-8 h-8 mx-auto text-gray-400 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-gray-600">
          이미지를 드래그하거나 <span className="text-[#1E5FA8] font-medium">클릭하여 선택</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">최대 {maxImages}장, 파일당 5MB 이하</p>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 에러 메시지 */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* 선택된 이미지 수 */}
      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          {images.length}/{maxImages} 장 선택됨
        </p>
      )}

      {/* 미리보기 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`미리보기 ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-200"
              />
              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
