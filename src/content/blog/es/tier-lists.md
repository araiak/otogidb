---
title: "Listas de Niveles: Metodología y Cómo Usarlas"
description: "Comprendiendo las listas de niveles basadas en simulación y lo que pueden (y no pueden) decirte sobre la construcción de equipos"
date: "2025-12-27"
author: "Araiak"
tags: ["guía", "tier-list", "análisis"]
locale: "es"
---

## Resumen

- Los niveles miden **la fuerza individual de cada carta en aislamiento**, no la sinergia del equipo
- Usa los niveles para identificar cartas fuertes, luego construye sinergias alrededor de ellas
- El +/-X% en los retratos de cartas muestra el rendimiento vs línea base (comparable entre roles)
- Diversifica tus buffs: daño + tasa crítica + daño crítico supera acumular una sola estadística

---

Las listas de niveles son útiles para empezar y establecer expectativas, pero tienen límites. Un equipo de cartas MLB con buena sinergia puede completar todo el contenido de eventos sin importar los rankings de niveles. Para rankings competitivos en World Boss y Challenge, necesitarás profundizar más en la composición del equipo por tu cuenta.

Estas listas de niveles responden una pregunta específica: **¿qué tan fuerte es esta carta en aislamiento?** Esto ayuda a identificar cartas sólidas, pero no te dirá si una carta mejora tu equipo específico. Entender las sinergias y disponibilidad requiere un análisis más matizado que va más allá de lo que una simulación puede medir.

## Metodología

Tomamos un equipo estándar de cartas de bajo nivel con máximo límite roto y nivel 90, eliminamos sus habilidades y las configuramos para que siempre coincidan con tu tipo (Divina, Anima, Phantasma). Forzamos las habilidades condicionales a estar activas como :card[1498], la prueba asume que una de las Cinco Espadas bajo el Cielo está en el equipo o para :card[616] tenemos un elfo en el equipo. Los líderes van en el slot de líder. Intercambiamos Cuerpo a Cuerpo por Cuerpo a Cuerpo, A Distancia por A Distancia, y Sanador por Sanador. Los Asistentes van en un cuerpo a cuerpo en pruebas defensivas y en un a distancia en pruebas ofensivas. Esto es para asegurar que pintamos cada carta en su mejor luz, si no puedes cumplir estas condiciones serán más débiles. El equipo que las apoya es:

- :card[6]
- :card[6]
- :card[230]
- :card[266]
- :card[266]

Estas son cartas antiguas con estadísticas bajas.

Luego ejecutamos algunas simulaciones, primero es una simulación de 5 oleadas, segundo es una simulación de 1 oleada, y último es una simulación defensiva. En las simulaciones ofensivas medimos el daño total hecho. En la simulación defensiva el enemigo hace 10% más de daño cada 10s hasta que el equipo cae y medimos el tiempo. También medimos el daño individual hecho en la simulación de 1 oleada para nuestro nivel de atacante codicioso.

El objetivo aquí es que podamos medir en aislamiento cuál es el valor relativo de cada carta para el equipo con el mismo equipo base. Ahora esto no es de ninguna manera perfecto, tienes un monstruo de buffs y básicamente ninguna sinergia real. Los equipos que hacen más daño prosperan en sinergias y buffs multiplicativos como daño * crítico * daño crítico, etc.

Básicamente el objetivo de esta lista de niveles es que si tomas 5 monstruos S-tier probablemente tendrás un buen equipo, quizás no tengas un gran equipo, pero ninguno de esos monstruos será malo, solo pueden no sinergizar entre sí.

## Cartas Que Pueden Estar Sobre/Infravaloradas

Algunas cartas pueden estar sobre/infravaloradas porque el equipo de apoyo en la simulación usa cartas base con sinergias mínimas.

Por ejemplo :card[549] probablemente está infravalorada aquí porque agregar estadísticas base a monstruos débiles los hace menos débiles, pero el efecto no obtiene el efecto multiplicativo de otros boosts en tu equipo. :card[1307] y :card[1494] probablemente están infravaloradas porque no hay boosts sinérgicos de los que estas cartas puedan beneficiarse. :card[580] o cualquier carta con XP, tasa de drop, piedras del alma están infravaloradas porque estas no son medidas de ninguna manera por la simulación. Los DoTs probablemente están sobrevalorados porque no están completamente implementados, pero estos no son muy fuertes en la simulación o en el juego así que esto puede no ser muy relevante. Los efectos CC tampoco están completamente implementados, todos están implementados como un stun genérico, pero estos de nuevo solo son relevantes en la simulación defensiva y no son muy impactantes.

## Cómo Usar Esta Lista Como Nuevo Jugador

Si eres un nuevo jugador y estás buscando cómo usar esta lista, mi sugerencia sería, intenta obtener un atacante codicioso de alto nivel o elige uno que tengas en tu lista de amigos, y luego comienza a intentar construir alrededor de ese monstruo en el mismo atributo. Quieres monstruos "fuertes", así que los que tienen calificaciones más altas, pero quieres diversificar los tipos de buffs que dan al equipo. Intenta obtener boosts de daño, boosts de crítico, boosts de daño crítico, etc. Si obtienes 5 cartas que todas aumentan el daño tu equipo será bueno, pero no será tan bueno como un equipo que distribuye daño, tasa crítica, daño crítico, velocidad de ataque, y boosts de daño de habilidad a través del equipo en las proporciones correctas. La lista de niveles no toma en cuenta estas sinergias, disponibilidad, etc. Pero si has llegado tan lejos no necesitas una lista de niveles diciéndote cómo construir tu equipo!

La simulación no es perfecta - es aproximadamente 80% precisa. El 20% restante involucra casos extremos e interacciones complejas que requieren significativamente más trabajo para modelar. Para la mayoría de decisiones de construcción de equipos, este nivel de precisión es suficiente.

## Definiciones de Niveles

Aquí están los niveles para cada prueba, estos están basados en la media y desviación estándar lo que significa que las cartas que puntuaron alto mostraron valor significativo sobre la carta promedio:

| Nivel | Puntuación Z | Significado                            |
|-------|--------------|----------------------------------------|
| S+    | >= 3.0       | Élite (3+ SD sobre la media)           |
| S     | >= 2.0       | Excepcional (2-3 SD sobre la media)    |
| A     | >= 1.0       | Bueno (1-2 SD sobre la media)          |
| B     | >= 0.0       | Promedio (dentro de 1 SD)              |
| C     | >= -1.0      | Bajo el promedio                       |
| D     | < -1.0       | Pobre                                  |

## Entendiendo los Diferentes Tipos de Niveles

**Niveles Normalizados por Rol (5 Rondas, 1 Ronda, Defensa, General):** Estos niveles comparan cartas dentro de su propio rol. Un Cuerpo a Cuerpo B-tier solo se compara con otras cartas Cuerpo a Cuerpo, no con A Distancia o Sanadores. Esto hace que los niveles sean útiles para responder "¿es esta carta buena para su rol?" pero significa que un Sanador S-tier no es directamente comparable a un A Distancia S-tier. Sin embargo, el +/-X% mostrado en los retratos de cartas representa el rendimiento vs el equipo base, así que puedes comparar ese número entre roles para ver el impacto relativo.

**Nivel Normalizado Globalmente (DPS Individual):** Este nivel compara todos los dealers de daño (Cuerpo a Cuerpo y A Distancia) entre sí globalmente. Responde "¿quién hace más daño sin importar el rol?" Sanadores y Asistentes están excluidos ya que no están destinados a ser dealers de daño.

**Nivel de Reserva:** Esto mide cuánto contribuye una carta cuando se coloca en el slot de reserva (solo habilidades pasivas). Está normalizado por rol y te ayuda a elegir soportes de reserva fuertes.

La puntuación general toma una p-normalización de esas puntuaciones, el objetivo de esto es destacar cartas que son excepcionales en una o más de las pruebas. Algunas de las cartas super defensivas probablemente tendrán niveles más altos de lo que la gente espera! Creo que está bien, el mejor uso de las calificaciones de nivel es mirar las categorías basándote en lo que tu equipo necesita. Si tienes problemas para sobrevivir en historia o desafío mira la defensiva, si necesitas algo que contribuya mucho daño en peleas más largas mira 5 rondas.

---

*¡Visita la página de [Listas de Niveles](/es/tiers) para ver los rankings completos!*
