import { getLegalConfigurationIssues } from '../../src/config/legal';

const args = new Set(process.argv.slice(2));
const productionLike =
  args.has('--production') ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.MATRICULAPRO_DEPLOY_TARGET === 'production' ||
  process.env.DEPLOYMENT_ENV === 'production' ||
  process.env.APP_ENV === 'production';

const issues = getLegalConfigurationIssues(process.env);

if (issues.length === 0) {
  console.log('LEGAL_CONFIG_STATUS=VALID');
  console.log('LEGAL_REVIEW_COMPLETED=true');
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
