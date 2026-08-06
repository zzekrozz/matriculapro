import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 512;

export const emailSchema = z
  .string({ required_error: 'Introduce tu email.' })
  .trim()
  .min(1, 'Introduce tu email.')
  .email('Introduce un email válido.')
  .max(254, 'El email es demasiado largo.')
  .transform((email) => email.toLowerCase());

export const passwordSchema = z
  .string({ required_error: 'Introduce una contraseña.' })
  .min(
    PASSWORD_MIN_LENGTH,
    `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  )
  .max(PASSWORD_MAX_LENGTH, 'La contraseña es demasiado larga.');

export const registrationSchema = z
  .object({
    displayName: z
      .string({ required_error: 'Introduce tu nombre.' })
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(120, 'El nombre es demasiado largo.'),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string({
      required_error: 'Repite la contraseña.',
    }),
    next: z.string().max(1_024).optional(),
    acceptedTerms: z
      .boolean()
      .refine((accepted) => accepted, 'Debes aceptar los términos de uso.'),
    acceptedPrivacy: z
      .boolean()
      .refine((accepted) => accepted, 'Debes confirmar que has leído la política de privacidad.'),
  })
  .superRefine((input, context) => {
    if (input.password !== input.passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirmation'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  next: z.string().max(1_024).optional(),
});

export const recoveryRequestSchema = z.object({ email: emailSchema });

export const resendConfirmationSchema = z.object({
  email: emailSchema,
  next: z.string().max(1_024).optional(),
});

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string({
      required_error: 'Repite la contraseña.',
    }),
  })
  .superRefine((input, context) => {
    if (input.password !== input.passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirmation'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export function firstValidationMessage(
  error: z.ZodError,
  fallback = 'Revisa los datos introducidos.',
): string {
  return error.issues[0]?.message ?? fallback;
}
