import React, { useLayoutEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minHeight = 56, maxHeight, style, value, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    useLayoutEffect(() => {
      const textarea = internalRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const nextHeight = Math.max(
        minHeight,
        Math.min(maxHeight ?? Number.MAX_SAFE_INTEGER, textarea.scrollHeight)
      );
      textarea.style.height = `${nextHeight}px`;
    }, [maxHeight, minHeight, value]);

    return (
      <textarea
        {...props}
        ref={setRefs}
        value={value}
        style={{
          ...style,
          minHeight,
          overflow: 'hidden',
          resize: 'vertical',
        }}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;
