# Guía de uso actual de BoxPlanner

## Estado actual

BoxPlanner es una app SaaS para planificar entrenamientos de boxeo por organización.

Ahora mismo permite:

- crear cuenta e iniciar sesión con Supabase Auth
- crear una organización inicial si el usuario no tiene ninguna
- ver la organización activa en la navegación
- listar, crear y borrar bloques desde la API
- listar categorías reales de bloques desde la API
- añadir ejercicios a bloques desde la API
- crear, listar y borrar entrenamientos desde la API
- añadir bloques existentes a entrenamientos desde la API

La app todavía está en migración progresiva. Algunas partes siguen usando estado local con Zustand.

## Flujo de usuario nuevo

1. Entra en `/login`.
2. Cambia a `crear cuenta`.
3. Introduce email, contraseña y confirmación.
4. Si Supabase devuelve sesión activa, la app redirige a `/`.
5. Si Supabase requiere confirmar email, la app muestra un mensaje para revisar el correo.
6. Al entrar autenticado, el frontend llama a `GET /auth/me`.
7. El backend crea o asegura el Profile.
8. El frontend carga `GET /organizations`.
9. Si no hay organizaciones, aparece el onboarding para crear una.
10. Tras crear la organización, queda marcada como organización activa.

## Flujo de usuario existente

1. Entra en `/login`.
2. Usa `iniciar sesión`.
3. Supabase devuelve sesión y `access_token`.
4. La app redirige a `/`.
5. El frontend llama a `GET /auth/me`.
6. El frontend carga organizaciones.
7. Si ya hay organizaciones, selecciona la guardada en localStorage o la primera disponible.
8. El usuario puede usar la app.

## Cómo levantar backend

Repositorio backend:

```bash
cd E:\workspace\box-planner-api
npm install
npm run start:dev
```

Por defecto la API corre en:

```text
http://localhost:3001
```

Swagger está disponible en:

```text
http://localhost:3001/docs
```

Comandos útiles:

```bash
npm run test
npm run build
```

Si Prisma necesita regenerarse después de cambios de schema:

```bash
npx prisma generate
```

## Cómo levantar frontend

Repositorio frontend:

```bash
cd E:\workspace\box-planner
npm install
npm run dev
```

Por defecto Next corre en:

```text
http://localhost:3000
```

Comandos útiles:

```bash
npm run type-check
npm run build
```

## Variables de entorno

### Frontend

Archivo recomendado:

```text
.env.local
```

Variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

Estas variables son públicas porque se usan en el navegador.

### Backend

Archivo usado:

```text
.env
```

Variables necesarias:

```env
DATABASE_URL=<postgres-url>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<legacy-jwt-secret>
PORT=3001
FRONTEND_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_JWT_SECRET` son secretos. No deben exponerse al frontend ni subirse a repositorios públicos.

## Pantallas conectadas a API

### `/login`

Conectada a Supabase Auth:

- login con `supabase.auth.signInWithPassword`
- registro con `supabase.auth.signUp`
- mensaje cuando el registro requiere confirmar email
- logout desde la navegación principal

### Onboarding de organización

Conectado a:

- `GET /auth/me`
- `GET /organizations`
- `POST /organizations`

Si el usuario autenticado no tiene organizaciones, se muestra un formulario para crear una.

### `/blocks`

Conectada a:

- `GET /block-categories`
- `GET /organizations/:organizationId/blocks`
- `POST /organizations/:organizationId/blocks`
- `DELETE /organizations/:organizationId/blocks/:id`
- `GET /organizations/:organizationId/blocks/:blockId/exercises`
- `POST /organizations/:organizationId/blocks/:blockId/exercises`
- `DELETE /organizations/:organizationId/blocks/:blockId/exercises/:exerciseId`

También existen hooks preparados para actualizar bloques, actualizar ejercicios y reordenar ejercicios, aunque no toda esa UI está implementada.

### `/trainings`

Conectada a:

- `GET /organizations/:organizationId/trainings`
- `POST /organizations/:organizationId/trainings`
- `GET /organizations/:organizationId/trainings/:trainingId`
- `DELETE /organizations/:organizationId/trainings/:trainingId`
- `POST /organizations/:organizationId/trainings/:trainingId/blocks`
- `DELETE /organizations/:organizationId/trainings/:trainingId/blocks/:trainingBlockId`

También existen hooks para actualizar entrenamientos y reordenar bloques de entrenamiento, pero no hay UI completa para esas acciones.

## Qué sigue local o en transición

Sigue usando Zustand/localStorage o está parcialmente desconectado:

- Dashboard:
  - estadísticas locales
  - bloques recientes locales
- Settings:
  - objetivo semanal local
  - formulario de perfil no conectado
- Idioma:
  - guardado en localStorage y cookie
- Estado UI:
  - modales y algunos estados de interacción
- Store local:
  - todavía existe `lib/store.ts`
  - no se ha eliminado porque Dashboard y algunas piezas aún dependen de él

## Cómo usar bloques

1. Inicia sesión.
2. Asegúrate de tener una organización activa.
3. Ve a `/blocks`.
4. Pulsa `Nuevo bloque`.
5. Rellena:
   - nombre
   - categoría
   - descripción opcional
6. Guarda el bloque.

La categoría se carga desde `GET /block-categories` y se envía como `categoryId`.

La duración del bloque no se introduce manualmente. El backend calcula `estimatedDurationSec` a partir de los ejercicios del bloque.

Para borrar un bloque, usa el botón de papelera de la tarjeta.

## Cómo añadir ejercicios

1. Ve a `/blocks`.
2. En una tarjeta de bloque, pulsa `ejercicios`.
3. En el modal puedes ver los ejercicios existentes.
4. Para crear uno, rellena:
   - nombre
   - duración en segundos, opcional
   - reps, opcional
   - descanso en segundos
   - zona, opcional
   - notas, opcional
5. Pulsa `añadir ejercicio`.

Al crear o borrar ejercicios:

- se refresca la lista de ejercicios del bloque
- se refresca la lista de bloques
- el backend recalcula la duración estimada del bloque

## Cómo crear entrenamientos

1. Ve a `/trainings`.
2. Pulsa `Nuevo entrenamiento`.
3. Rellena:
   - título
   - tipo: personal o grupo
   - nivel
   - notas opcionales
4. Opcionalmente selecciona bloques existentes y pulsa `añadir`.
5. Pulsa `crear`.

El frontend primero crea el entrenamiento con `POST /trainings`.

Si se seleccionaron bloques, después llama a `POST /trainings/:trainingId/blocks` por cada bloque seleccionado.

La duración total se muestra usando `totalDurationSec`, calculado por backend.

## Cómo añadir bloques a entrenamientos

1. Ve a `/trainings`.
2. Pulsa el botón de edición de un entrenamiento.
3. Se abre un modal con los bloques actuales del entrenamiento.
4. Selecciona un bloque existente.
5. Pulsa `añadir bloque`.

Para quitar un bloque de un entrenamiento, usa la papelera dentro del modal.

Al añadir o quitar bloques:

- se refresca el detalle del entrenamiento
- se refresca la lista de entrenamientos
- el backend recalcula `totalDurationSec`

## Qué no existe todavía

No existe todavía:

- edición visual de metadatos de bloque
- edición visual de ejercicios
- reordenado visual de ejercicios
- edición visual de metadatos de entrenamiento
- reordenado visual de bloques dentro de entrenamientos
- selector de organización activa cuando hay varias organizaciones
- gestión de miembros o invitaciones
- creación o edición de categorías de bloque
- subida o gestión de media
- Dashboard remoto
- Settings conectados al backend
- protección server-side/middleware; la protección actual es client-side

## Próximos pasos recomendados

1. Conectar Dashboard a API real.
2. Conectar Settings/perfil a `GET /auth/me` y endpoints futuros de perfil.
3. Añadir selector de organización activa.
4. Implementar edición de bloques.
5. Implementar edición y reordenado de ejercicios.
6. Implementar edición y reordenado de entrenamientos.
7. Revisar `next.config.mjs` y eliminar `ignoreBuildErrors` cuando sea seguro.
8. Añadir tests de integración o e2e para login, onboarding, bloques y entrenamientos.
9. Crear `.env.example` seguro en backend, sin secretos reales.
10. Revisar seeds o datos iniciales para `block_categories`.
