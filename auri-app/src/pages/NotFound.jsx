import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, LayoutDashboard, ArrowLeft, RefreshCw, Sparkles, 
  BookOpen, Compass, Shield, Scroll, Crown, Wallet
} from 'lucide-react';

const AURELIUS_QUOTES = [
  {
    quote: "No te dejes perturbar por el rumbo desconocido. Lo enfrentarás con la misma razón con la que gestionas tu presente. La página que buscas no existe, pero tu serenidad sí.",
    book: "Meditaciones — Libro VII, 8"
  },
  {
    quote: "Lo que impide la acción acelera la acción. Lo que se interpone en el camino se convierte en el camino. Un desvío 404 es solo otra oportunidad para ejercer el dominio propio.",
    book: "Meditaciones — Libro V, 20"
  },
  {
    quote: "Tienes poder sobre tu mente, no sobre los eventos externos. Comprende esto y encontrarás la verdadera riqueza y claridad financiera.",
    book: "Meditaciones — Libro IV, 3"
  },
  {
    quote: "No malgastes más tiempo argumentando cómo debe ser una buena página. Vuelve al centro de tu templo financiero.",
    book: "Meditaciones — Libro X, 16"
  },
  {
    quote: "La tranquilidad no es otra cosa que el buen orden de la mente. Mantén el orden en tu patrimonio sin importar los desvíos del camino.",
    book: "Meditaciones — Libro IV, 3"
  }
];

export default function NotFound() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isAnimatingQuote, setIsAnimatingQuote] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Efecto de partículas doradas en Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generar partículas de polvo de oro estético
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.5 - 0.1,
      alpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * 0.02 + 0.005
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += Math.sin(Date.now() * p.pulse) * 0.01;

        if (p.y < 0) p.y = canvas.height;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${Math.max(0.1, Math.min(0.8, p.alpha))})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#C9A84C';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Parallax sutil con el cursor
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 45;
    const moveY = (clientY - window.innerHeight / 2) / 45;
    setMousePos({ x: moveX, y: moveY });
  };

  const handleNextQuote = () => {
    setIsAnimatingQuote(true);
    setTimeout(() => {
      setQuoteIndex((prev) => (prev + 1) % AURELIUS_QUOTES.length);
      setIsAnimatingQuote(false);
    }, 200);
  };

  const currentQuoteObj = AURELIUS_QUOTES[quoteIndex];

  return (
    <div 
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0C0F17',
        color: 'var(--color-text, #EAEAEB)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'center',
        padding: '32px 20px',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Background Canvas para Partículas Estéticas */}
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />

      {/* Resplandor Aurum Central */}
      <div 
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201, 168, 76, 0.15) 0%, rgba(201, 168, 76, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 2,
          filter: 'blur(40px)'
        }}
      />

      <style>{`
        @keyframes floatBust {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .aurelius-glow-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .aurelius-glow-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201, 168, 76, 0.35);
        }
      `}</style>

      {/* Contenido Principal Elevado */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '720px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)`,
        transition: 'transform 0.1s ease-out'
      }}>

        {/* Emblema Marco Aurelio con Corona de Laurel */}
        <div style={{
          position: 'relative',
          animation: 'floatBust 5s ease-in-out infinite',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px'
        }}>
          {/* Anillo de resplandor dorado */}
          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            backgroundColor: 'rgba(201, 168, 76, 0.08)',
            border: '2px dashed rgba(201, 168, 76, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(201, 168, 76, 0.25)',
            animation: 'pulseGlow 4s ease-in-out infinite'
          }}>
            <Crown size={54} style={{ color: '#C9A84C', filter: 'drop-shadow(0 4px 12px rgba(201,168,76,0.5))' }} />
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            backgroundColor: 'rgba(12, 15, 23, 0.95)',
            border: '1px solid #C9A84C',
            borderRadius: '12px',
            padding: '2px 10px',
            fontSize: '0.7rem',
            color: '#C9A84C',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            MARCVS AVRELIVS
          </div>
        </div>

        {/* Gran Número 404 Estilo Estoico */}
        <h1 style={{
          fontSize: 'clamp(5rem, 14vw, 9.5rem)',
          fontWeight: 900,
          margin: 0,
          lineHeight: 0.9,
          letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #FFF 0%, #C9A84C 50%, #8A6E2F 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'shimmerText 8s linear infinite'
        }}>
          404
        </h1>

        <div style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#C9A84C',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginTop: '-12px'
        }}>
          Camino No Encontrado · Desvío Estoico
        </div>

        {/* Tarjeta de Meditación de Marco Aurelio */}
        <div style={{
          backgroundColor: 'rgba(20, 26, 40, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          borderRadius: '18px',
          padding: '24px 28px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
          width: '100%',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '10px'
          }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#C9A84C',
              fontWeight: 700,
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              <Scroll size={16} /> Meditación del Templo
            </span>

            <button
              onClick={handleNextQuote}
              title="Cambiar meditación estoica"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(201, 168, 76, 0.15)',
                color: '#C9A84C',
                border: '1px solid rgba(201, 168, 76, 0.3)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} style={{ transform: isAnimatingQuote ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              <span>Nueva Reflexión</span>
            </button>
          </div>

          <p style={{
            fontSize: '1.05rem',
            lineHeight: '1.6',
            fontStyle: 'italic',
            color: 'var(--color-text, #EAEAEB)',
            margin: '0 0 12px 0',
            opacity: isAnimatingQuote ? 0 : 1,
            transition: 'opacity 0.2s ease',
            fontFamily: 'Georgia, serif'
          }}>
            "{currentQuoteObj.quote}"
          </p>

          <div style={{
            textAlign: 'right',
            fontSize: '0.78rem',
            color: 'var(--color-text-muted, #8E95A5)',
            fontWeight: 600
          }}>
            — {currentQuoteObj.book}
          </div>
        </div>

        {/* Botones de Acción / Navegación */}
        <div style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '8px',
          width: '100%'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="aurelius-glow-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#C9A84C',
              color: '#0C0F17',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 26px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(201, 168, 76, 0.25)'
            }}
          >
            <LayoutDashboard size={20} />
            <span>Volver al Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/hogar')}
            className="aurelius-glow-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(20, 26, 40, 0.9)',
              color: '#FFF',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '14px 22px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <Home size={20} style={{ color: '#61AFEF' }} />
            <span>Control de Casa</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted, #8E95A5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px 18px',
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            <span>Volver atrás</span>
          </button>
        </div>

        {/* Footer Subtítulo Marca */}
        <div style={{
          marginTop: '16px',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={13} style={{ color: '#C9A84C' }} />
          <span>AURELIUS — Sistema de Gestión Financiera Estoica</span>
        </div>

      </div>
    </div>
  );
}
