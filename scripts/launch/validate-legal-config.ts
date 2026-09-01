import { getLegalConfigurationIssues } from '../../src/config/legal';
import { isPublicBetaEnabled } from '../../src/config/public-beta';

const args = new Set(process.argv.slice(2));
const productionLike =
  args.has('--production') ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.MATRICULAPRO_DEPLOY_TARGET === 'production' ||
  process.env.DEPLOYMENT_ENV === 'production' ||
  process.env.APP_ENV === 'production';

const issues = getLegalConfigurationIssues(process.env);
const publicBeta = isPublicBetaEnabled();

if (issues.length === 0) {
  console.log('LEGAL_CONFIG_STATUS=VALID');
  console.log('LEGAL_REVIEW_COMPLETED=true');
  process.exit(0);
}

if (publicBeta) {
  console.warn('LEGAL_CONFIG_STATUS=PUBLIC_BETA_WITH_WARNINGS');
  for (const issue of issues) {
    console.warn(`- ${issue}`);
  }
  console.warn('La beta pública sin cobros puede construirse; estos datos siguen siendo obligatorios antes de reactivar el modo comercial.');
  process.exit(0);
}

console.error(`LEGAL_CONFIG_STATUS=${productionLike ? 'BLOCKED' : 'INCOMPLETE'}`);
for (const issue of issues) {
  console.error(`- ${issue}`);
}

if (productionLike) {
  console.error('El build o despliegue de producción queda bloqueado hasta completar y revisar la información legal.');
  process.exit(1);
}

console.warn('Desarrollo permitido con marcadores visibles. Ejecuta con --production para comprobar el bloqueo de lanzamiento.');
