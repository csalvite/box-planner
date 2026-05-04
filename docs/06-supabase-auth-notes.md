# notas de autenticacion con supabase

## registro actual

BoxPlanner usa Supabase Auth desde el cliente browser. En la pantalla `/login`, el modo de crear cuenta llama a `supabase.auth.signUp` con email y contrasena.

Si Supabase devuelve una sesion activa, la app redirige directamente a `/`. Si el proyecto exige confirmacion de email, Supabase no devuelve sesion y la app muestra un aviso para revisar el correo.

## confirmacion de email

Cuando la confirmacion de email esta activada en Supabase, el usuario debe abrir el enlace recibido antes de iniciar sesion. Si intenta entrar antes, Supabase puede responder `Email not confirmed`; la app lo traduce a un mensaje claro en espanol.

La app incluye la ruta:

```text
/auth/callback
```

Esta ruta intercambia el `code` de Supabase por una sesion cuando el enlace usa PKCE. Si no llega codigo, vuelve a `/login?confirmed=1` para mostrar un estado de confirmacion simple.

## redirect urls recomendadas

En local, configura en Supabase:

```text
http://localhost:3000/auth/callback
```

Si usas otro puerto para Next, cambia `3000` por el puerto real.

En produccion, anade tambien:

```text
https://tu-dominio.com/auth/callback
```

## plantilla del email de confirmacion

El email se personaliza desde el panel de Supabase, no desde este frontend:

1. entra en Supabase Dashboard
2. abre Authentication
3. ve a Email Templates
4. edita Confirm signup
5. ajusta asunto, texto, marca y boton

Conviene que el texto explique que el usuario debe confirmar el correo para poder iniciar sesion en BoxPlanner.

## limite actual

La app no implementa todavia reenvio de email de confirmacion ni recuperacion de contrasena. Si hace falta, se puede anadir despues con `supabase.auth.resend` y `supabase.auth.resetPasswordForEmail`.
