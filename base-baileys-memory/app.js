const { createBot, createProvider, createFlow, addKeyword, EVENTS} = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')

const OpenAI = require('openai')

const Servicios = [
    {
      "nombre": "Limpieza de Casas",
      "precio": "s/10 por metro cuadrado",
      "incluye": [
        "Barrido",
        "Trapeado",
        "Limpieza de superficies",
        "Baños",
        "Cocina"
      ]
    },
    {
      "nombre": "Limpieza de Oficinas",
      "precio": "s/20 por metro cuadrado",
      "incluye": [
        "Limpieza de escritorios",
        "Áreas comunes",
        "Sanitarios"
      ]
    },
    {
      "nombre": "Limpieza de Colegios",
      "precio": "s/30 por metro cuadrado",
      "incluye": [
        "Áreas comunes",
        "Aulas",
        "Baños"
      ]
    },
    {
      "nombre": "Limpieza de Departamentos",
      "precio": "s/ 40 por metro cuadrado",
      "incluye": [
        "Limpieza general de todo el espacio"
      ]
    }
]

const prompt = `
---

**Eres un asistente virtual profesional y amigable para INVERSIONES Y SOLUCIONES DELTA, especializado en ofrecer servicios de limpieza personalizados. Tu tarea principal es proporcionar cotizaciones precisas y guiar a los clientes a través de un proceso de cotización simple y eficiente. Debes asegurarte de que el usuario reciba respuestas claras, concisas y detalladas sobre los servicios que ofrecemos.**

---

**INSTRUCCIONES PARA LA INTERACCIÓN:**

1. **Sé amable y profesional en todo momento.** Mantén un tono amigable y cercano, evitando respuestas largas o innecesarias.  
2. **Limita tus respuestas a un máximo de 20 palabras.** Sé claro y directo.  
3. **Si el espacio indicado por el usuario NO coincide con los valores de DATOS-SERVICIOS**, responde exclusivamente con:  
   "Por el momento no ofrecemos el servicio de limpieza para el tipo de espacio que indicas. ¿Te gustaría cotizar otro servicio?"
4. **Si el espacio es válido**, continúa con el proceso de cotización siguiendo las preguntas predefinidas.  
5. **Enfócate únicamente en la cotización.** No des información adicional no solicitada.  

---

**DATOS-SERVICIOS:**
- **Limpieza de Casas**: s/10 por metro cuadrado  
  Incluye: Barrido, Trapeado, Limpieza de superficies, Baños, Cocina  
- **Limpieza de Oficinas**: s/20 por metro cuadrado  
  Incluye: Limpieza de escritorios, Áreas comunes, Sanitarios  
- **Limpieza de Colegios**: s/30 por metro cuadrado  
  Incluye: Áreas comunes, Aulas, Baños  
- **Limpieza de Departamentos**: s/40 por metro cuadrado  
  Incluye: Limpieza general de todo el espacio

---

**INSTRUCCIONES PARA RESPONDER AL CLIENTE:**

1. **Si no hay contexto de conversación previo:**  
   Pregunta: '¿En qué tipo de espacio deseas realizar la limpieza? 😊 (Ejemplo: casa, oficina, colegio, departamento)'

2. **Si el espacio mencionado por el usuario NO está en DATOS-SERVICIOS:**  
   Responde exclusivamente con:  
   "Por el momento no ofrecemos el servicio de limpieza para el tipo de espacio que indicas. ¿Te gustaría cotizar otro servicio?"

3. **Si el espacio está en DATOS-SERVICIOS:**  
   Pregunta: '¿Cuántos metros cuadrados tiene el lugar que deseas limpiar?'  
   Luego, pregunta: '¿Deseas cotizar otro espacio o finalizar la cotización?'

4. **Si el usuario elige 'Sí' para seguir cotizando:**  
   Repite el proceso desde la pregunta inicial.

5. **Si el usuario responde 'No más':**  
   Pregunta: '¿Te gustaría que un asesor se contacte contigo para brindarte más información?'

6. **Si el usuario elige ser contactado:**  
   Responde exclusivamente con:  
   "ESPERAR_ACESOR"

7. **Si el usuario elige 'No':**  
   Responde exclusivamente con:  
   "FINALIZAR_ATENCION"

---

**NOTAS ADICIONALES:**

- **Mantén las respuestas cortas y directas.** Evita explicaciones largas o redundantes.  
- **No inventes servicios o información.** Limítate a los datos proporcionados en DATOS-SERVICIOS.  
- **No desvíes la conversación.** Enfócate únicamente en el proceso de cotización.  

---

`;

async function getChatResponse(historial) {
  try {

      const messages = [
          { role: 'system', content: prompt },
          ...historial
      ];
      
      console.log("messages", messages);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,

      });

      console.log("response", response);

      let botResponse = response?.choices?.[0]?.message?.content || '';

      return botResponse || "Lo siento, no pude entender tu solicitud.";
  } catch (error) {
      console.error('Error in getChatResponse:', error);
      throw error;
  }
}


const flowNosotros = addKeyword("SOBRE_NOSOTROS").addAnswer([
  "En *INVERSIONES Y SOLUCIONES DELTA* ofrecemos limpieza profesional para cada espacio 🧼. Nos encargamos de dejar tu hogar 🏡, oficina 🏢 o negocio 🏬 impecable, brindando un servicio de calidad y confianza 🤝. ¡Nos encanta hacer que todo brille! ✨",
  "",
  "1. 🧼 Cotizar un servicio de limpieza",
  "2. Nada más, gracias",
], {capture: true}, async (ctx, {flowDynamic, gotoFlow, state}) => {
  const message = ctx.body;
  if (message.includes("1")){
    await state.update({ history_chat: [] })
    return gotoFlow(flowCotizacion)
  }
  else if (message.includes("2")){
    await flowDynamic("¡Gracias por visitarnos! Si necesitas algo más, no dudes en escribirnos. 😊")
  }
  else{
    await flowDynamic("Lo siento, no pude entender tu solicitud. Por favor, elige una de las opciones disponibles. 🌟")
  }
})

const flowEsperaAcesor = addKeyword("ESPERAR_ACESOR").addAnswer(
  "¡Perfecto! Un coordinador se pondrá en contacto contigo para agendar la limpieza. ¡Nos vemos pronto! 🌟"
)

const flowFinalizarAtention = addKeyword("FINALIZAR_ATENCION").addAnswer(
  "Gracias por usar nuestro servicio. Si necesitas algo más, no dudes en escribirnos. 😊"
)

const flowCotizacion = addKeyword("COTIZAR_SERVICIO")
.addAction(async (_, {state, flowDynamic}) => {

  const history = state.get('history_chat') ?? [];

  if (history.length == 0) {
    await flowDynamic("¿En qué tipo de espacio deseas realizar la limpieza? 😊 (Ejemplo: casa, oficina, colegio, departamento, etc.)");
    history.push({'role': 'system', 'content': "¿En qué tipo de espacio deseas realizar la limpieza? 😊 (Ejemplo: casa, oficina, colegio, departamento, etc.)"});
    await state.update({ history_chat: history });
  }
})
.addAction({capture: true, idle: 15000}, async (ctx, {state, flowDynamic, gotoFlow}) => {
  
  const message = ctx.body;
  const myState = state.getMyState();

  console.log("myState", myState);

  const history = state.get('history_chat') ?? [];

  console.log("history", history);

  history.push({'role': 'user', 'content': message});

  if (history.length != 0) {
    await flowDynamic("Espere un momento, estoy procesando su solicitud... 🧼");
  }

  const response = await getChatResponse(history);

  if (response.includes("ESPERAR_ASESOR")) {
    return gotoFlow(flowEsperaAcesor);
  }
  
  if (response.includes("FINALIZAR_ATENCION")) {
    return gotoFlow(flowFinalizarAtention);
  }

  await flowDynamic(response);

  history.push({'role': 'system', 'content': response});

  await state.update({ history_chat: history});

  return gotoFlow(flowCotizacion);

})


const flowPrincipal = addKeyword(EVENTS.WELCOME).addAnswer([
    "¡Hola! Soy *Lía* 🌿, tu asistente de confianza para todo lo relacionado con servicios de limpieza. Estoy aquí para ayudarte a dejar tus espacios brillando y frescos. *¿Qué te gustaría hacer hoy?*",
    "",
    "1. 🧼 Cotizar un servicio de limpieza",
    "2. 🏠 Sobre nosotros",
    "",
    "*¡Escribe el número de la opción que deseas realizar!* 🌟"
  ], {capture:true}, async (ctx, {flowDynamic, gotoFlow, state}) => {
    const message = ctx.body;
    if (message.includes("1")){
      await state.update({ history_chat: [] });
      return gotoFlow(flowCotizacion)
    } 
    else if (message.includes("2")) return gotoFlow(flowNosotros)
    else{
      await flowDynamic("Lo siento, no pude entender tu solicitud. Por favor, elige una de las opciones disponibles. 🌟")
      return gotoFlow(flowPrincipal)
    }
  })

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal, flowNosotros, flowEsperaAcesor, flowCotizacion, flowFinalizarAtention])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
