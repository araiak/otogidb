---
title: "Modo Desafío: Llegando al Nivel 100"
description: "Guía para construir equipos para el modo Endless/Challenge - habilidades clave y recomendaciones de cartas"
date: "2025-12-16"
author: "Araiak"
tags: ["guía"]
locale: "es"
---

Estaba pensando en hacer una carrera para el nivel 100 en el modo Endless/Challenge. Mi límite actual es el nivel 90, pero esto es sin optimizar completamente mi equipo.

## Escalado de la Torre

| Piso | Mult. HP | Mult. ATK | Mult. Skill | Escudo |
|------|----------|-----------|-------------|--------|
| 1 | 1x | 0.3x | 0.1x | 6% |
| 50 | 191x | 3.67x | 1.02x | 41.1% |
| 100 | 2,531x | 16.71x | 3.02x | 75% |

## Fundamentos de Composición de Equipo

La mayoría de los equipos usan 2 sanadores, 1-2 carries y 1 tanque.

Tres requisitos clave de habilidades para completar Endless:
- **+daño al inicio de la oleada**
- **+HP máximo al inicio de la oleada**
- **+un poco más de defensa**

## Cartas Clave por Rol

### +Daño al Inicio de la Oleada

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744] es una unidad Anima a distancia que aumenta el daño 15% por oleada incondicionalmente.

### +HP Máximo al Inicio de la Oleada

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373] aumenta el HP máximo de Phantasma 4% por oleada.
:card[583] aumenta el HP máximo de Anima 2% por oleada.

### Opciones Defensivas

#### Debuffers

:filter["?ability=Wave+Start%2CSlow"]
:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

## Equipos de Ejemplo

### Equipo Anima

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

### Equipo Phantasma

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

---

*Esta guía se centra en llegar a pisos altos. Para farmear SP de manera óptima, las carreras cortas de 33-34 puntos son más eficientes.*
