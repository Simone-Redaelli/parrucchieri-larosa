import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ROSA, SCRITTA, MOTTO } from '../../condivisi/logo.js';

const tuttaLaRosa = ROSA.petali.map(p => p.d).join('');

export function Rosa({ className = '', titolo }) {
  return (
    <svg className={className} viewBox={`0 0 ${ROSA.w} ${ROSA.h}`} role={titolo ? 'img' : undefined} aria-label={titolo} aria-hidden={titolo ? undefined : true}>
      <path fill="currentColor" fillRule="evenodd" d={tuttaLaRosa} />
    </svg>
  );
}

export function Scritta({ className = '' }) {
  return (
    <svg className={className} viewBox={`0 0 ${SCRITTA.w} ${SCRITTA.h}`} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={SCRITTA.lettere.join('')} />
    </svg>
  );
}

export function Motto({ className = '' }) {
  return (
    <svg className={className} viewBox={`0 0 ${MOTTO.w} ${MOTTO.h}`} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={MOTTO.d} />
    </svg>
  );
}

export function Oro({ id }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#8A6426" />
      <stop offset=".28" stopColor="#E7C06A" />
      <stop offset=".5" stopColor="#FFF0B5" />
      <stop offset=".72" stopColor="#D6A445" />
      <stop offset="1" stopColor="#7C561D" />
    </linearGradient>
  );
}

export function LogoOro({ className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`logo-oro ${className}`} role="img" aria-label="Larosa, hairstyle with passion since 1990">
      <svg viewBox={`0 0 ${ROSA.w} ${ROSA.h}`} className="logo-oro__rosa" aria-hidden="true">
        <defs><Oro id={`o${id}`} /></defs>
        <path fill={`url(#o${id})`} fillRule="evenodd" d={tuttaLaRosa} />
      </svg>
      <svg viewBox={`0 0 ${SCRITTA.w} ${SCRITTA.h}`} className="logo-oro__scritta" aria-hidden="true">
        <defs><Oro id={`s${id}`} /></defs>
        <path fill={`url(#s${id})`} fillRule="evenodd" d={SCRITTA.lettere.join('')} />
      </svg>
      <Motto className="logo-oro__motto" />
    </div>
  );
}

const CENTRO = `${ROSA.w / 2}px ${ROSA.h / 2}px`;

export function Caricamento({ pronto }) {
  const ridotto = useReducedMotion();
  const t = (x) => (ridotto ? 0 : x);
  return (
    <motion.div className="carica" role="status" aria-live="polite" aria-label="Caricamento del sito Larosa"
      initial={{ opacity: 1 }}
      exit={ridotto ? { opacity: 0, transition: { duration: 0.3 } } : { clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } }}
      style={{ clipPath: 'inset(0 0 0% 0)' }}>
      <motion.div className="carica__logo" exit={ridotto ? {} : { y: -60, opacity: 0, transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } }}>
        <motion.div className="carica__fluttua" animate={ridotto ? {} : { y: [0, -8, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
          <svg viewBox={`0 0 ${ROSA.w} ${ROSA.h}`} className="carica__rosa" aria-hidden="true">
            <defs>
              <Oro id="caricaOro" />
              <linearGradient id="caricaLuce" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox" gradientTransform="translate(-1 0)">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset=".45" stopColor="#fff" stopOpacity="0" />
                <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
                <stop offset=".55" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
                {!ridotto && <animateTransform attributeName="gradientTransform" type="translate" values="-1 0; 1 0" dur="2.2s" begin="1.1s" repeatCount="indefinite" />}
              </linearGradient>
            </defs>
            <g>
              {ROSA.petali.map((p, i) => (
                <motion.path key={i} d={p.d} fill="url(#caricaOro)" fillRule="evenodd"
                  style={{ transformOrigin: CENTRO, transformBox: 'view-box' }}
                  initial={ridotto ? { opacity: 0 } : { opacity: 0, scale: 0.55, rotate: -70 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: t(0.1 + i * 0.11), duration: t(0.9) || 0.3, ease: [0.22, 1, 0.36, 1] }} />
              ))}
            </g>
            <path d={tuttaLaRosa} fill="url(#caricaLuce)" fillRule="evenodd" style={{ mixBlendMode: 'screen' }} />
          </svg>
        </motion.div>
        <motion.div className="carica__ombra" aria-hidden="true"
          initial={{ opacity: 0 }} animate={ridotto ? { opacity: 0.5 } : { opacity: [0.55, 0.3, 0.55], scaleX: [1, 0.82, 1] }}
          transition={ridotto ? {} : { opacity: { duration: 2.6, repeat: Infinity, delay: 1.2 }, scaleX: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 } }} />
        <svg viewBox={`0 0 ${SCRITTA.w} ${SCRITTA.h}`} className="carica__scritta" aria-hidden="true">
          <defs><Oro id="caricaOroScritta" /></defs>
          {SCRITTA.lettere.map((d, i) => (
            <motion.path key={i} d={d} fill="url(#caricaOroScritta)" fillRule="evenodd"
              initial={ridotto ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: t(0.75 + i * 0.08), duration: t(0.7) || 0.3, ease: [0.22, 1, 0.36, 1] }} />
          ))}
        </svg>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: t(1.35), duration: 0.6 }}>
          <Motto className="carica__motto" />
        </motion.div>
        <div className="carica__barra" aria-hidden="true">
          <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: pronto ? 1 : 0.7 }} transition={{ duration: pronto ? 0.35 : 1.6, ease: 'easeOut' }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
