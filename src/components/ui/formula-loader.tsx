"use client";

import "./formula-loader.css";

interface FormulaLoaderProps {
  className?: string;
}

export function FormulaLoader({ className }: FormulaLoaderProps) {
  return (
    <div className={`formula-loader-card ${className || ""}`}>
      <div className="formula-loader">
        <p className="formula-loading-text">loading</p>
        <div className="formula-words">
          <span className="formula-word">projects</span>
          <span className="formula-word">scope lists</span>
          <span className="formula-word">drawings</span>
          <span className="formula-word">reports</span>
          <span className="formula-word formula-brand">FORMULA</span>
        </div>
      </div>
    </div>
  );
}
