# PM Platform

Centro de control de producto de VoicingAI. Next.js 16 + Postgres, pensado para correr
en un contenedor de Easypanel.

Documentación de producto en `docs/`: concepto, modelo de datos y alcance por fases.

## Estado

**Fase 1 — Registrar.** Clientes con fase, timeline de eventos con estado e hilo de
actualizaciones, hitos con historial de cambios de fecha, compromisos y contactos.

**Fase 2 — Medir (en curso).** Captura diaria de llamadas, minutos y contención;
totales mensuales históricos; objetivos por mes; tabla mensual con deltas. Cambio de
contraseña desde la interfaz.

**Slack.** Avisos programados, registro por texto libre clasificado con IA y captura de
métricas desde un modal. Ver `docs/06-slack.md`.

Pendiente: curvas con eventos superpuestos, motor de banderas y dashboard filtrable
(resto de Fase 2), ingesta de transcripts con LLM (Fase 3), stack histórico (Fase 4).

## Desarrollo local

```bash
npm install
cp .env.example .env.local     # rellena DATABASE_URL, SESSION_SECRET, PM_EMAIL, PM_PASSWORD
npm run db:migrate
npm run db:seed
npm run dev
```

`SESSION_SECRET` con `openssl rand -base64 48`.

## Despliegue en Easypanel

### 1. Servicio de Postgres

Crea un servicio Postgres en tu proyecto de Easypanel. Anota el nombre del servicio: la
app lo alcanza por el host interno, no por `localhost`.

**Configura los backups automáticos antes de meter datos reales.** Un Postgres en
contenedor sin backup es una pérdida de datos esperando su turno.

### 2. Servicio de la app

Crea un servicio de tipo App apuntando al repo de GitHub. Easypanel detecta el
`Dockerfile` de la raíz.

Variables de entorno:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgres://usuario:clave@<servicio-postgres>:5432/pm_platform` |
| `SESSION_SECRET` | cadena aleatoria de 32+ caracteres |
| `TZ_APP` | `America/Bogota` |
| `PM_EMAIL` / `PM_PASSWORD` / `PM_NOMBRE` | solo para la semilla inicial |
| `RESEND_API_KEY` | clave de Resend, para el correo de recuperar contraseña |
| `CORREO_DESDE` | remitente, en un dominio verificado en Resend |

Asigna el dominio y deja que Easypanel emita el certificado.

### 3. Migraciones

**Se aplican solas al arrancar el contenedor.** Son idempotentes, así que un reinicio no
repite nada. Si una falla, el contenedor no levanta: es preferible a servir la app contra
un esquema a medias, y en Easypanel eso significa un deploy fallido, no una app caída.

La semilla sí es manual, y solo hace falta la primera vez. Desde la consola del
contenedor:

```bash
node db/seed.mjs
```

Necesita `PM_EMAIL` y `PM_PASSWORD` como variables de entorno. Volver a correrla actualiza
la contraseña del usuario existente, que es la vía para cambiarla mientras no exista la
pantalla de perfil.

## Estructura

```
app/
  (app)/            páginas autenticadas — Hoy, Clientes, Hitos, Compromisos
  login/            entrada
  acciones.ts       server actions (toda la escritura pasa por aquí)
components/         piezas de UI reutilizables
lib/
  db.ts             pool de Postgres y helper de transacciones
  auth.ts           sesión con cookie firmada
  dominio.ts        enum del dominio con etiquetas y colores
  fechas.ts         formato y aritmética de fechas en la zona de la app
  consultas/        lectura, una por agregado
db/
  migrations/       SQL numerado, se aplica en orden
  migrate.mjs       aplicador idempotente, corre al arrancar el contenedor
  seed.mjs          usuario, partner, reglas y catálogo iniciales
  verificar.ts      prueba de humo contra una base real
proxy.ts            protege las rutas verificando la cookie de sesión
```

## Decisiones que conviene no deshacer

**El timeline es la espina dorsal.** Incidencias, decisiones, despliegues, cambios de
stack y cambios de fase son todos `evento` con fecha. Eso es lo que permitirá superponer
lo que pasó sobre las curvas de métricas en la Fase 2.

**Compromiso ≠ nota.** Solo hitos y compromisos disparan alertas. Si las notas también
alertaran, el canal de Slack sería ruido y se dejaría de leer.

**Las fechas de hito no se sobreescriben.** Moverlas exige un motivo y deja fila en
`hito_cambio_fecha`. Es lo que a los seis meses permite decir con datos por qué se
retrasan las salidas.

**El contenido traducido se cachea por hash del original.** La clave de `traduccion` es
el hash del texto, no la fila que lo contiene: el mismo texto en dos clientes se traduce
una vez, y editarlo genera otro hash, así que la entrada vieja deja de usarse sin
invalidación manual.

**Los formularios de edición nunca muestran contenido traducido.** Si lo hicieran, guardar
sobreescribiría el original con su traducción. Traducir es para leer, no para editar.

**Un solo módulo habla con el modelo.** `lib/llm.ts` elige proveedor por variable de
entorno — Gemini si hay `GEMINI_API_KEY`, Claude si hay `ANTHROPIC_API_KEY`. Cambiar de
uno a otro es cambiar una variable, no tocar código.

**Línea base y objetivo mensual son cosas distintas.** `linea_base` son los supuestos
únicos con los que el partner dimensionó el proyecto antes de producción, y es contra lo
que se contrasta la realidad. `objetivo_mes` es el compromiso comercial de un mes
concreto. Mezclarlos obligaría a recargar la línea base cada mes y se perdería la
referencia original.

**Un mes histórico no es un día suelto.** Los totales mensuales cargados a mano viven en
`metrica_mes`, no como una fila de `metrica_dia` el día 1. Guardarlos ahí falsearía el
promedio diario, el conteo de días con actividad y cualquier gráfica futura. Al consultar,
el mes cargado a mano tiene prioridad sobre la suma de sus días.

**Tipo y seguimiento son ejes independientes.** El tipo dice qué clase de cosa es un
registro; `estado_seguimiento` dice si sigue viva. Un despliegue puede estar pendiente y
una incidencia puede nacer resuelta, así que quien registra decide, con el tipo aportando
solo el valor por defecto de la casilla. Un `estado_seguimiento` nulo significa que no se
persigue, no que no pueda perseguirse.
