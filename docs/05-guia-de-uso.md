# Guía de uso

## El modelo mental

Todo cuelga de un **cliente**. Lo que registras es una de tres cosas, y la diferencia
está en qué quieres que pase después:

| Qué | Cuándo usarlo | Qué provoca |
|---|---|---|
| **Evento** | Algo que pasó y quieres recordar | Se acumula en el timeline. Si es de los que siguen vivos, además se puede seguir |
| **Compromiso** | Alguien tiene que hacer algo | Aparece en Hoy y, más adelante, en Slack |
| **Hito** | Una fecha grande del proyecto | Aviso anticipado + historial de cambios de fecha |

La pregunta al registrar es una sola: **¿hay algo que alguien deba hacer?**
Si sí, compromiso. Si no, evento.

Esa separación es la que sostiene el sistema. Si todo fuera nota, nada te avisaría.
Si todo fuera compromiso, el aviso sería ruido y dejarías de mirarlo.

## Seguimiento de un evento

Hay cosas que no son un punto en el tiempo: siguen vivas hasta que dejan de estarlo. Al
registrar, la casilla **Hacer seguimiento** decide si ese registro queda como asunto
abierto.

El tipo y el seguimiento son ejes distintos. El tipo dice *qué clase de cosa es*; el
seguimiento, *si sigue viva*. Un despliegue pendiente de coordinar con el cliente
necesita seguimiento, y una incidencia que ya estaba resuelta cuando la registras, no.
Por eso la casilla viene marcada por defecto en incidencia, bloqueo, riesgo y cambio de
scope, pero puedes cambiarla siempre — en cualquier tipo.

Si registraste algo sin seguimiento y luego resulta que sí hay que perseguirlo, en la
entrada del timeline tienes **Hacer seguimiento** para abrirlo.

Con el seguimiento activo aparece un hilo de actualizaciones. Cada vez que sepas algo
nuevo, añades una línea con lo que pasó; si eso cambia la situación, eliges también el
estado nuevo: *en curso*, *resuelto* o *descartado*. La actualización guarda de dónde
venía, así que el hilo se lee como una historia.

En **Hoy**, la sección *Asuntos abiertos* reúne todo lo que sigue sin cerrarse de todos
los clientes, con lo más grave arriba.

## Archivos

Cualquier registro admite archivos: el pantallazo del error, el acta de la reunión, el
PDF del contrato. Se suben al crearlo o después, desde *Adjuntar archivo* en la entrada
del timeline, y se descargan pulsando su nombre.

El límite es de 10 MB por archivo y 3 por envío. Se guardan dentro de la base de datos,
no en disco aparte, para que entren en el mismo backup que todo lo demás.

## Métricas

En **Métricas** registras el día: llamadas, minutos y % de contención por cada cliente en
producción. Los clientes en fases anteriores no aparecen — pedirles números a diario sería
fricción a cambio de ceros.

Si un cliente no tuvo actividad, marca *Sin actividad* en vez de escribir ceros: así no
ensucia los promedios ni el conteo de días.

**Pegar bloque** acepta líneas tipo `Acme 1240 3720 71` y rellena los campos solo. Sirve
pegar directo desde una hoja de cálculo. El nombre puede llevar espacios; se toman los
números del final de la línea.

Abajo aparecen los **días incompletos** de las últimas dos semanas, para rellenar los que
te saltaste antes de que llegue el cierre de mes.

### Meses históricos

Para meses de los que tienes el total pero no el día a día, en la ficha del cliente está
*Cargar un mes completo*. Se guardan aparte de los datos diarios y tienen prioridad sobre
la suma de días de ese mes, así que puedes cargar el histórico sin inventar días falsos.

En la tabla mensual, cada fila indica su origen: `mensual` si se cargó a mano, o el
número de días registrados si sale de la captura diaria.

### Línea base del partner

En la pestaña de Métricas de cada cliente, *Línea base del partner* guarda los supuestos
que entrega TP antes de salir a producción: volumen mensual, AHT promedio, concurrencia
media y máxima, y la meta de contención cuando la dan.

Con eso, arriba de la tabla aparece **mes en curso contra línea base** — esperado, real y
desvío. En el AHT el color se invierte: quedarse por debajo de lo esperado es bueno.

El AHT se escribe como `5:10` o como segundos (`310`). Cambiar un valor que ya existía
deja un evento en el timeline, porque que el partner revise el forecast a mitad de
proyecto es información de producto, no una corrección silenciosa.

### Objetivo del mes

Lo vendido al cliente para ese mes. Con él, la tabla muestra el porcentaje de
cumplimiento.

## Puesta en marcha

1. **Clientes → Nuevo cliente** para cada uno de los clientes bajo TP, con su nombre
   legal y su fase actual.
2. En cada ficha, añade la fecha de salida a producción como hito tipo
   *Salida a producción*.
3. Los contactos, cuando los necesites — sirven para asignar responsables.

Con solo eso, la pantalla Hoy ya tiene sentido.

## El día a día

**Por la mañana, abres Hoy.** Responde cuatro cosas: hitos de los próximos 30 días,
compromisos abiertos y vencidos, clientes sin registro en dos semanas, y los últimos
movimientos.

**Cuando pasa algo, lo registras** en el bloque de arriba de la ficha del cliente. Tipo
con un clic, qué pasó, guardar. Si alguien quedó de hacer algo, añádelo también como
compromiso con fecha.

El apartado *clientes sin novedad* es el que más rinde con el tiempo. Un cliente en
silencio tres semanas rara vez es un cliente tranquilo — suele ser uno del que te
desconectaste.

## Dos hábitos que pagan a los seis meses

**Mover las fechas dentro de la app.** El hito tiene un desplegable *Mover fecha* que
exige un motivo. Es un segundo de fricción que hoy parece innecesario.

A los seis meses, la pantalla de Hitos dirá algo como "8 hitos con fecha movida, 2.4
veces de media", cada uno con su historial. Eso convierte una sensación en un dato que
se puede poner sobre la mesa. Es exactamente lo que un PM echa de menos cuando lleva un
año sin registrarlo.

**Cambiar la fase cuando cambie de verdad.** Se registra sola como evento. Cuando estén
las curvas de volumen, el paso a producción aparecerá marcado encima de la gráfica.

## Tema e idioma

En **Cuenta** eliges tema —claro, oscuro o según el sistema— e idioma entre español e
inglés. Las dos preferencias se guardan en cookie y las lee el servidor al renderizar, así
que no hay parpadeo al cargar.

En inglés se traduce tanto la interfaz como **lo que tú escribes**: títulos y detalles de
eventos, actualizaciones, notas de hitos y descripciones de compromisos. La traducción la
hace un modelo la primera vez y queda guardada, de modo que solo se paga una vez por
texto; si editas el texto, se retraduce.

Los nombres de cliente no se traducen, porque son nombres propios. Y los formularios de
edición muestran siempre tu texto original: si mostraran la traducción, guardar
sobreescribiría lo que escribiste con su versión en inglés.

Si no hay proveedor de IA configurado, el inglés se aplica solo a la interfaz y tu
contenido se ve tal como lo escribiste.

## La pantalla Hoy

Arriba, cuatro cifras: asuntos abiertos, hitos en 7 días, compromisos vencidos y clientes
sin novedad. Es la lectura de dos segundos antes de decidir dónde mirar.

Debajo, dos columnas: a la izquierda lo que exige leer despacio —los asuntos abiertos—, y
a la derecha lo que se comprueba de un vistazo. Los últimos registros quedan plegados al
final, porque casi siempre repiten lo que ya está arriba.

## Cómo se crean las cosas

Todo lo que se crea —un registro, un hito, un compromiso, un contacto, un mes de
métricas— se abre en un modal desde su botón, con el fondo desenfocado. Antes eran
formularios fijos que empujaban hacia abajo lo que había que leer y competían con ello.

El foco entra solo al primer campo, se cierra con Escape o clic fuera, y al guardar se
cierra solo con un aviso de confirmación abajo a la derecha. Si algo falla, el modal se
queda abierto con lo escrito dentro.

La excepción es el *Registrar* del menú lateral: como puede ser para cualquier cliente,
al guardar te lleva a su timeline. Ahí ver la entrada en su sitio es mejor confirmación
que un aviso.

## Atajos que ahorran clics

**Registrar** — el botón verde del menú lateral abre el registro sin tener que buscar el
cliente primero: eliges a cuál va y, al guardar, te lleva a su timeline para que veas
dónde aterrizó.

**⌘K** (o Ctrl+K) abre el buscador desde cualquier pantalla. Encuentra clientes,
registros, hitos y compromisos, y te lleva directo a la pestaña correspondiente. Con las
flechas eliges y con Enter saltas.

## Equipo y permisos

En **Equipo**, un administrador invita a alguien con un rol:

| Rol | Puede |
|---|---|
| Administrador | Todo, incluido invitar, borrar clientes y cambiar ajustes |
| Editor | Registrar, editar y borrar registros |
| Lector | Solo ver |

La invitación genera un enlace que caduca en 7 días y **se muestra una sola vez**: en la
base solo queda su hash, así que ni con acceso a los datos se puede reconstruir. Si se
pierde, se revoca y se crea otro.

El rol se consulta en cada petición, no se guarda en la sesión: quitarle permisos a
alguien surte efecto al momento y no cuando caduque su sesión.

## La agenda

**Contactos** reúne a todas las personas registradas en todos los proyectos, con la
etiqueta del proyecto o proyectos en los que está cada una. Se filtra escribiendo —el
nombre, el rol, el correo o el proyecto donde la conociste— y por lado.

En la base un contacto pertenece a un cliente, así que la misma persona existe una vez
por proyecto. Aquí se juntan **por nombre**, no por correo: el correo de una misma
persona cambia entre proyectos (TP usa `@tp.com` y `@teleperformance.com`), y agrupar
por correo la partiría en dos justo cuando lo que querías era verla una vez.

Cuando alguien tiene varios correos registrados se muestran todos, marcados. Casi
siempre es una ficha copiada con el buzón equivocado, y así se ve en lugar de quedar
enterrada.

## Información del proyecto

Cada cliente tiene una pestaña **Información**: el sitio donde se *define* qué es el
proyecto, frente a las demás pestañas, que registran lo que le va pasando.

Reúne cuatro cosas:

1. **La ficha** — código del inventario, caso de uso, tipo de contacto (entrante o
   saliente), ambiente y país, más la descripción de qué hace el agente.
2. **Métricas esperadas** — la línea base que entrega el partner. Estaba en Métricas;
   se movió aquí porque es una definición, no una medición. La captura diaria y las
   series siguen en Métricas.
3. **El inventario técnico** — servidores de aplicación, telefonía SIP e integraciones
   externas, con los campos del inventario que mantiene el partner: host, IP, protocolo,
   puerto, tipo de comunicación, trunk, DID, SBC, códec, sistema integrado.
4. **Contactos** — quién aprueba y quién bloquea. También estaba en su propia pestaña;
   la ruta antigua redirige aquí. La agenda general de `/contactos` sigue existiendo
   para la pregunta contraria: en qué proyectos está una persona.

Cada pieza del inventario tiene un **estado** (activo, inactivo, planeado). Lo inactivo
no desaparece —hace falta para entender un incidente viejo— pero baja al final de la
lista.

### Qué no se guarda aquí

**Contraseñas, tokens ni claves.** La plataforma no cifra a nivel de columna: lo que se
escriba en un campo de notas queda en claro para cualquiera con acceso a la base o al
ZIP de descarga. Los campos son de identificación —host, puerto, usuario, endpoint—, que
es lo que hace falta para diagnosticar. La credencial vive donde ya viva.

### Cargar el inventario

Los campos se rellenan a mano desde la pestaña. La primera carga se hizo desde el Excel
`Inventario_Gestion_Agentes_Autonomos`, mapeando por nombre de proyecto: los nombres de
la hoja no coinciden con los de la plataforma (`ARL-SAC` es `Sura SAC ARL`), así que la
correspondencia es explícita y no adivinada.

## Si te quedas fuera

En el login hay **Olvidé mi contraseña**. Escribes tu correo y llega un enlace para
elegir una nueva.

Cuatro cosas que conviene saber:

- **El enlace dura una hora y solo sirve una vez.** Pedir otro invalida el anterior, así
  que si pides dos, solo vale el del último correo.
- **Máximo tres peticiones por hora y cuenta**, para que nadie use el formulario para
  llenarle el buzón a otro.
- **La respuesta es siempre la misma**, exista la cuenta o no. Si dijera "ese correo no
  está registrado", cualquiera podría averiguar quién tiene cuenta desde el login.
- **Al guardar la contraseña nueva se cierran las demás sesiones** de esa cuenta. Si la
  restableces porque alguien entró, su sesión muere ahí en vez de durarle treinta días.

Necesita `RESEND_API_KEY` y `CORREO_DESDE` configuradas. Si faltan, la pantalla lo dice
en lugar de prometer un correo que no va a llegar.

### El plan de emergencia

Si el correo no funciona y nadie puede entrar, desde la consola del contenedor:

```bash
node db/seed.mjs
```

Lee `PM_EMAIL` y `PM_PASSWORD` y **actualiza** la contraseña de esa cuenta. Ojo: si
`PM_EMAIL` no coincide exactamente con un usuario existente, en vez de restablecer nada
crea uno nuevo, y con rol *editor*.

Esa semilla **no se ejecuta al desplegar** — el contenedor solo corre las migraciones y
el servidor. Cambiar `PM_PASSWORD` en el panel y volver a desplegar no cambia ninguna
contraseña.

## Sacar los datos

En **Clientes**, el botón **Descargar todo** genera un ZIP con absolutamente todo lo
registrado, en texto plano:

```
PM Platform 2026-08-31/
  LEEME.txt                     qué hay dentro y cómo leerlo
  Resumen.txt                   la cartera entera en una página
  Clientes/
    Colsubsidio.txt             línea base, hitos, compromisos, contactos,
    Nestlé Ventas Outbound.txt  métricas y el timeline completo del cliente
    ...
  Datos/
    timeline.csv                los mismos datos en CSV, para Excel o Sheets
    hitos.csv
    metricas-mensuales.csv
    inventario-servidores.csv
    inventario-sip.csv
    ...
  Adjuntos/
    Temas Generales/            los archivos subidos a los registros
      Business Continuity Plan.pdf
```

La ficha de cada cliente está pensada para leerse tal cual: 76 columnas, fechas en
`AAAA-MM-DD` y el timeline del registro más reciente al más antiguo, con las
actualizaciones y los cambios de estado debajo de cada uno.

Es una copia, no una integración: sirve para archivar un trimestre, para pasarle a
alguien el estado de un cliente sin darle acceso a la plataforma, y para que los datos
sigan siendo legibles el día que esta app no exista. Lo puede descargar cualquier rol,
incluido Lector, porque exportar es leer.

## Pantallas

- **Hoy** — la de la mañana.
- **Clientes** — lista filtrable por fase, con semáforo de vencidos y próximo hito.
- **Ficha de cliente** — registro rápido, timeline, métricas, hitos, compromisos, información y ajustes.
- **Hitos** — todos los hitos abiertos y la estadística de movimientos.
- **Compromisos** — todo lo pendiente, de todos los clientes.
- **Contactos** — la agenda entera, con la etiqueta de cada proyecto.

Desde **Clientes** también se descarga el ZIP con todo (ver arriba).

## Todavía no existe

Métricas de llamadas y minutos · notificaciones de Slack · ingesta de transcripts ·
bloc de ideas · cambio de contraseña desde la interfaz.

Ver `04-alcance-v1.md` para el plan por fases.
