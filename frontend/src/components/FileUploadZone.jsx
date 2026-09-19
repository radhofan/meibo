import React from "react";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const FileUploadZone = ({ onFileSelect, onError }) => {
  const validateAndSelect = (file) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      if (onError) onError("Invalid file type. File must be a .csv file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      if (onError) onError("File size exceeds the maximum limit of 50 MB.");
      return;
    }
    onFileSelect(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="card">
      <div
        className="upload-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csvFileInput")?.click()}
      >
        <div className="upload-icon">📄</div>
        <h3>Upload CSV File</h3>
        <p className="subtitle">
          Drag & drop your CSV file here, or click to browse
        </p>
        <input
          id="csvFileInput"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <span className="upload-btn-label">Select File</span>
      </div>
    </div>
  );
};
