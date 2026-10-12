import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const idParamsSchema = z.object({ id: objectIdSchema });
