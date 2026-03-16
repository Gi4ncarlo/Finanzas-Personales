export default function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      backgroundColor: 'var(--color-surface-2)',
      animation: 'pulse 1.5s infinite ease-in-out',
      ...style
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
