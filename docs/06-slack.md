# Slack

## Qué hace

**Avisos que salen solos**

| Cuándo | Qué |
|---|---|
| 19:00 | Qué clientes faltan por registrar, con botón para hacerlo desde Slack |
| 09:00 | Hitos a 3 días, compromisos vencidos y por vencer, asuntos abiertos graves |
| 21:30 | Aviso solo si no registraste nada en todo el día |
| Lunes 09:00 | Una línea por cliente con el movimiento de la semana |
| Día 1, 09:00 | Cierre de mes: días registrados y objetivos que faltan |

Las horas salen de la tabla `ajuste`, clave `notificaciones`. Cambiarlas ahí las cambia
sin desplegar.

**Preguntar cómo va un cliente**

> cómo va Colsubsidio

Devuelve lo que tiene abierto, sus compromisos y sus próximos hitos, **numerados**.
También sirven `abiertos de …`, `estado de …`, `qué tiene …` y, sin nombrar cliente,
`qué tengo pendiente`.

Se exige una palabra de consulta además del nombre. *"Colsubsidio no ha podido salir por
temas legales"* menciona al cliente pero es una nota que registrar, no una pregunta.

**Preguntar cualquier cosa sobre lo registrado**

> ¿por qué se movió la fecha de salida de Colsubsidio?

Se arma el expediente del cliente —registros con sus hilos de actualización, hitos con el
historial de cambios de fecha y su motivo, compromisos, métricas, línea base y contactos—
y se responde con eso. Si algo no está registrado, se dice en vez de inventarlo.

Una pregunta **nunca se registra**. Se detecta antes que el clasificador por el signo de
interrogación o por empezar con una palabra interrogativa. *"El cliente preguntó cuándo
salimos"* no empieza por una, así que sigue siendo una nota.

Si la pregunta nombra un cliente, se usa su expediente completo; si no, una panorámica de
todos. Dentro de un hilo abierto por una consulta, se usa el cliente de ese hilo.

**Actuar sobre esa lista, respondiendo en el hilo**

| Escribes | Pasa |
|---|---|
| `el 1 ya lo resolvieron, TP habilitó la IP` | Añade la nota y lo cierra como resuelto |
| `el 2 sigue igual, esperando a legal` | Añade la nota y lo deja abierto |
| `cierra el 2` | Lo cierra sin nota |
| `borra el 3` | Pide confirmación con un botón aparte |

Los números son los de **esa** lista, aunque hayan pasado horas: se guarda tal como se
mostró. Si la lista tenía tres elementos y escribes `cierra el 9`, te lo dice en vez de
adivinar.

El bot solo actúa dentro de hilos donde él mismo mostró una lista. En cualquier otro hilo
calla, porque responder a todo convertiría cualquier conversación entre personas en
registros.

Cerrar es fácil a propósito y borrar no lo es. Un bloqueo resuelto no se borra: se cierra
con una nota de qué pasó, y eso es justo lo que hace valioso el histórico.

**Registro desde el canal**

Escribes en el canal como se lo contarías a alguien:

> TP Acme: se cayó el SIP 20 min, cliente molesto, piden postmortem el viernes

El bot responde en el hilo con lo que entendió —cliente, tipo, severidad, si hay que
seguirlo y si alguien quedó en hacer algo— y dos botones: Guardar o Descartar. Nada entra
sin que lo confirmes.

Si no identifica el cliente, lo dice y no deja guardar: un registro sin cliente no sirve
para nada.

**Registro de métricas**

El botón del aviso de las 19:00 abre un formulario con una línea por cliente pendiente.
Se escribe `nombre llamadas minutos contención`. Es el mismo parser determinista que el
pegado de la web — los números no pasan por el modelo.

## Ayuda dentro del propio canal

Escribe **`ayuda`** en el canal y el bot explica todo: cómo registrar, cómo funcionan los
botones, el formato del registro diario, qué avisos manda y a qué hora, y la lista de
clientes que reconoce. También responde a `help`, `qué puedo hacer` o `cómo funciona`.

Solo se activa si el mensaje es exactamente eso. *"Sura EPS: necesito ayuda con el
whitelisting"* es una nota que hay que registrar, no alguien preguntando cómo funciona.

Desde la app, en **Diagnóstico**, hay un botón para publicar la guía en el canal.

## Puesta en marcha

1. **api.slack.com/apps** → Create New App → **From a manifest** → pega
   `docs/slack-manifest.yaml`.
2. Instala la app en el workspace e invítala al canal (`/invite @PM Platform`).
3. Copia el **Bot User OAuth Token** (`xoxb-…`) y el **Signing Secret**.
4. Copia el ID del canal: clic derecho sobre el canal → Ver detalles → abajo del todo.
5. En Easypanel, añade:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CANAL=C01234567
APP_URL=https://stgpm.org
```

6. Despliega.

Sin esas variables la app funciona igual, simplemente no manda ni recibe nada.

## Decisiones

**Los envíos se reclaman en la base antes de mandarse.** El programador vive dentro del
contenedor, así que un reinicio a las 19:01 volvería a disparar el aviso de las 19:00.
La clave `(clave, fecha)` de `envio_slack` hace que solo quien consigue insertar la fila
mande el mensaje. Si el envío falla, la fila se borra para reintentar al minuto
siguiente: un fallo de red no debería costar el aviso del día entero.

**Se responde a Slack antes de clasificar.** Slack reintenta si no contesta en tres
segundos y el modelo tarda más. Se devuelve 200 de inmediato y el trabajo sigue en
segundo plano, que es posible porque el servidor es un proceso vivo.

**Las respuestas en hilo se ignoran.** Sin eso, el bot se contestaría a sí mismo en bucle.

**La firma se comprueba siempre**, con ventana de cinco minutos. Sin esa ventana, una
petición interceptada valdría para siempre.

## Si el bot no responde

Lo primero, el diagnóstico. Abre en el navegador, con sesión iniciada:

```
https://stgpm.org/api/slack/eventos
```

Devuelve qué variables están puestas (sin revelarlas), el canal, y qué proveedor de IA
está activo. Si algo sale en `false` o `null`, ahí está el problema.

Si todo está puesto y aun así no responde, en los logs del contenedor:

| Lo que ves | Qué significa |
|---|---|
| `Slack: mensaje recibido …` | Llega bien; el fallo está más adelante |
| `Slack: petición rechazada por firma inválida` | El Signing Secret no es el correcto |
| `Clasificación fallida:` | El modelo devolvió error — mira el motivo |
| Nada en absoluto | Slack no está llamando al endpoint |

Cuando no aparece nada, el problema está del lado de Slack y suele ser una de estas
cuatro, por orden de frecuencia:

1. **Event Subscriptions sin verificar.** En la app de Slack, esa sección debe mostrar
   *Verified* en verde junto a la Request URL. Si la app se creó antes de desplegar, la
   verificación falló y quedó desactivada. Pulsa *Retry* o vuelve a guardar la URL.
2. **El bot no está en el canal.** Escribe `/invite @PM Platform` en el canal.
3. **Falta el scope `channels:history`**, o se añadió después de instalar. Cualquier
   cambio de scopes exige reinstalar la app en el workspace.
4. **El canal es privado.** Entonces hacen falta `groups:history` y el evento
   `message.groups` en lugar de los de canales públicos.
