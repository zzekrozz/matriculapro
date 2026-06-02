import Landing from '@/components/landing/Landing';

export default function HomePage() {
  return (
    <Landing
      // demoHref ahora activa modo explorer y va al dashboard
      demoHref="/entrar?modo=explorer"
      buyHref="/app/dashboard"
      premiumHref="/app/acompanamiento"
    />
  );
}
