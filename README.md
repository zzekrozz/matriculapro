# MatriculaPRO · Ivan Imports

Proyecto Next.js 14 (App Router) con la landing pública, la demo interactiva del recorrido ITV y el esqueleto completo del producto (centro de control + 11 módulos).

## Stack

- **Next.js 14.2** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** con tokens centralizados (`tailwind.config.js`)
- **Framer Motion** para animaciones (volante, aguja del medidor, sello…)
- **Lucide React** para iconos
- **Zustand** preparado (no usado en MVP, listo para estado global futuro)
- Tipografías: **Instrument Serif** (display), **Geist** (UI), **JetBrains Mono** (datos)

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Rutas

```
/                        Landing pública (TikTok → 10s de comprensión)
/demo                    Recorrido ITV (5 primeros pasos) sin login
/app/dashboard           Centro de control (entrada simulada con curso)
/app/recorrido-itv       Recorrido ITV completo (11 pasos)
/app/ruta                Ruta de matriculación        (Próximamente)
/app/simulador-576       Simulador 576                (Próximamente)
/app/ficha-tecnica       Ficha técnica 3D             (Próximamente)
/app/checklist/{antes-de-comprar, pre-itv, pre-dgt}   (Próximamente)
/app/casos-practicos     Casos prácticos              (Próximamente)
/app/biblioteca          Biblioteca de documentos     (Próximamente)
/app/plantillas-itv      Plantillas para ITV          (Próximamente)
/app/acompanamiento      Acompañamiento premium       (Próximamente)
/app/mis-cursos          Hub multi-curso              (Próximamente)
/legal/aviso-formativo   Aviso legal formativo
```

## Estructura

```
src/
  app/                      Rutas App Router
    layout.tsx              Layout raíz · providers
    page.tsx                Landing /
    demo/page.tsx           Demo /demo
    app/
      layout.tsx            AppShell wrapper (sidebar + topbar)
      dashboard/page.tsx    Centro de control
      recorrido-itv/page.tsx
      ... (10 placeholders más)
    legal/aviso-formativo/page.tsx

  components/
    landing/Landing.tsx     Landing entera (NavBar, Hero, Features, Pricing, FAQ…)
    shell/AppShell.tsx      Sidebar navy + topbar mobile
    modules/itv/RecorridoITV.tsx   Maqueta ITV con medidor de frenos
    ui/ComingSoon.tsx       Placeholder reutilizable

  data/
    modules.ts              Catálogo M.01 – M.11
    itv-steps.ts            11 pasos ITV (qué te piden / qué haces / qué revisar)

  lib/
    tokens.ts               Sistema de diseño (colores, sombras, fuentes)
    types.ts                Tipos compartidos
    cn.ts                   clsx wrapper
    usePersistentState.ts   Hook SSR-safe con localStorage

  providers/
    AccessProvider.tsx      Placeholder para Supabase Auth
    I18nProvider.tsx        Placeholder para next-intl (solo 'es' activo)
    CourseProvider.tsx      Progreso del curso en localStorage
```

## Conexiones CTA (en MVP)

- **Landing → Demo**: todos los botones "Probar demo gratis" → `/demo`
- **Landing → Curso**: botones "Comprar curso completo 89€" → `/app/dashboard` (en producción: Stripe Checkout)
- **Landing → Premium**: botones "Solicitar acompañamiento 499€" → `/app/acompanamiento`
- **Demo → Curso**: header sticky + CTA inferior llevan a `/app/dashboard`

## Sistema de diseño

Tokens en `src/lib/tokens.ts` y `tailwind.config.js`. Paleta:

- `ink #0B1F3A` (navy base)
- `accent #C8862E` (ámbar, sello de documento)
- `bg #F4F6FA` / `surface #FFFFFF`
- `ok / warn / danger` para estados

Tipografías: titulares con Instrument Serif (italic en acentos), UI con Geist, datos técnicos (E, B, V.7, bastidor) con JetBrains Mono.

## Estados de módulos

`pending | in-progress | completed | locked | alert | recommended | special | premium | demo`

Definidos en `src/lib/types.ts` y renderizados con `StateBadge` en el dashboard.

## Persistencia (MVP)

`usePersistentState` (SSR-safe) guarda en `localStorage`:
- `mpro:completed-modules`
- `mpro:completed-route`
- `mpro:completed-itv`

En producción se migrará a Supabase.

## Próximos pasos

1. **Módulos pendientes** (Fase 4): completar simulador 576, ficha 3D, ruta de matriculación, checklists, casos prácticos, biblioteca, plantillas, acompañamiento.
2. **Auth + pagos**: integrar Supabase Auth y Stripe Checkout. Conectar `AccessProvider` con verificación real.
3. **i18n**: activar next-intl con traducciones EN/RU/UK/FR/DE/IT cuando convenga.
4. **CMS/Admin**: si necesitas editar contenido sin tocar código.

## Comandos

```bash
npm run dev          Desarrollo en :3000
npm run build        Build de producción
npm run start        Servidor de producción
npm run lint         ESLint
npm run typecheck    TypeScript sin emit
```
