import Landing from '@/components/landing/Landing';

export default function HomePage() {
  return (
    <Landing
      demoHref="/entrar?modo=explorer"
      buyHref="/#precios"
      premiumHref="/app/acompanamiento"
    />
  );
}
