// import React from 'react';
// import { MathJax } from 'better-react-mathjax';

// interface LatexRendererProps {
//   content: string;
// }

// const LatexRenderer: React.FC<LatexRendererProps> = ({ content }) => {
//   // Process the content to handle LaTeX blocks and regular text
//   const renderContent = () => {
//     // Split content into paragraphs
//     const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
//     return paragraphs.map((paragraph, index) => {
//       // Check if paragraph contains LaTeX (contains $ or \[ \])
//       const hasLatex = /(\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\))/.test(paragraph);
      
//       if (hasLatex) {
//         // For paragraphs with LaTeX, wrap the whole paragraph in MathJax
//         return (
//           <p key={index} className="mb-4">
//             <MathJax dynamic>{paragraph}</MathJax>
//           </p>
//         );
//       } else {
//         // For regular text paragraphs
//         return (
//           <p key={index} className="mb-4">
//             {paragraph}
//           </p>
//         );
//       }
//     });
//   };

//   return <div>{renderContent()}</div>;
// };

// export default LatexRenderer;


import React, { useEffect } from 'react';
import { MathJax } from 'better-react-mathjax';

interface LatexRendererProps {
  content: string;
}

// Declare MathJax types globally to avoid TypeScript errors
declare global {
  interface Window {
    MathJax?: {
      typeset?: () => void;
      typesetPromise?: () => Promise<void>;
    };
  }
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ content }) => {
  // Trigger MathJax processing when content changes
  useEffect(() => {
    const processMathJax = () => {
      if (typeof window !== 'undefined' && window.MathJax) {
        // Try both possible MathJax methods
        if (typeof window.MathJax.typeset === 'function') {
          window.MathJax.typeset();
        } else if (typeof window.MathJax.typesetPromise === 'function') {
          window.MathJax.typesetPromise();
        }
      }
    };

    // Add slight delay to ensure MathJax is loaded
    const timer = setTimeout(processMathJax, 100);
    return () => clearTimeout(timer);
  }, [content]);

  const renderContent = () => {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => {
      const hasLatex = /(\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\))/.test(paragraph);
      
      return (
        <p key={index} className="mb-4">
          {hasLatex ? (
            <MathJax dynamic>
              {paragraph
                .replace(/\$\$(.*?)\$\$/g, '\\[$1\\]')
                .replace(/\$(.*?)\$/g, '\\($1\\)')}
            </MathJax>
          ) : (
            paragraph
          )}
        </p>
      );
    });
  };

  return <div>{renderContent()}</div>;
};

export default LatexRenderer;