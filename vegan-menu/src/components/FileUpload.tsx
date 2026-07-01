import React, { useState, useRef } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
}

export function FileUpload({ onFilesSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      validateAndSelect(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      validateAndSelect(files);
    }
  };

  const validateAndSelect = (files: File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
    
    if (validFiles.length !== files.length) {
      alert('Alguns fitxers no eren vàlids. Si us plau, puja només PDFs o imatges (JPEG, PNG, WEBP).');
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-3xl p-12 text-center transition-colors cursor-pointer ${
        isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#d1d0cb] hover:border-emerald-400 hover:bg-white/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />
      <div className="flex justify-center gap-4 mb-6 text-[#8c8b88]">
        <FileText size={40} strokeWidth={1.5} />
        <ImageIcon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-serif font-semibold mb-2">Puja el teu menú</h3>
      <p className="text-sm text-[#8c8b88] max-w-xs mx-auto">
        Arrossega i deixa anar PDFs o imatges d'un menú de restaurant, o fes clic per cercar. Pots pujar múltiples fitxers.
      </p>
    </div>
  );
}
